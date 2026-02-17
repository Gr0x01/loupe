import * as Sentry from "@sentry/nextjs";
import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { captureScreenshot, uploadScreenshot } from "@/lib/screenshot";
import { runAnalysisPipeline, runPostAnalysisPipeline, formatCheckpointTimeline, validateMatchProposal } from "@/lib/ai/pipeline";
import type { DeployContext } from "@/lib/ai/pipeline";
import { sendEmail } from "@/lib/email/resend";
import {
  changeDetectedEmail,
  correlationUnlockedEmail,
} from "@/lib/email/templates";
import type { ChangesSummary, ChronicleSuggestion, CorrelationMetrics, DetectedChange, CommitData, ValidatedItem, WatchingItem, OpenItem } from "@/lib/types/analysis";
import { filterRelevantCommits } from "@/lib/utils/commit-filter";
import { safeDecrypt } from "@/lib/crypto";
import { composeProgressFromCanonicalState, getLastCanonicalProgress, friendlyMetricNames } from "@/lib/analysis/progress";
import { canAccessMobile, getEffectiveTier, type SubscriptionTier, type SubscriptionStatus } from "@/lib/permissions";
import { captureEvent, flushEvents } from "@/lib/posthog-server";

/**
 * Extract top suggestion from changes_summary (Chronicle) or structured_output (initial audit)
 */
function extractTopSuggestion(
  changesSummary: ChangesSummary | null,
  structuredOutput: { findings?: Array<{ title?: string; element: string; prediction: { friendlyText: string; range: string } }> } | null
): { title?: string; element: string; friendlyText: string; range: string } | null {
  // First try Chronicle suggestions
  if (changesSummary?.suggestions?.length) {
    const topSuggestion = changesSummary.suggestions.reduce(
      (best, current) => {
        const impactOrder = { high: 0, medium: 1, low: 2 };
        return impactOrder[current.impact] < impactOrder[best.impact] ? current : best;
      },
      changesSummary.suggestions[0]
    );
    return {
      title: topSuggestion.title,
      element: topSuggestion.element,
      friendlyText: topSuggestion.prediction.friendlyText,
      range: topSuggestion.prediction.range,
    };
  }

  // Fallback to initial audit findings
  if (structuredOutput?.findings?.length) {
    const finding = structuredOutput.findings[0];
    return {
      title: finding.title,
      element: finding.element,
      friendlyText: finding.prediction.friendlyText,
      range: finding.prediction.range,
    };
  }

  return null;
}

export const analyzeUrl = inngest.createFunction(
  {
    id: "analyze-url",
    retries: 2,
    concurrency: [{ limit: 4 }],
  },
  { event: "analysis/created" },
  async ({ event, step }) => {
    const { analysisId, url, parentAnalysisId } = event.data as {
      analysisId: string;
      url: string;
      parentAnalysisId?: string;
    };
    const supabase = createServiceClient();

    try {
      // Step 1: Mark as processing
      await step.run("mark-processing", async () => {
      await supabase
        .from("analyses")
        .update({ status: "processing" })
        .eq("id", analysisId);
    });

    // Step 1b: Check if user has mobile access
    const canMobile = await step.run("check-mobile-tier", async () => {
      const { data: analysis } = await supabase
        .from("analyses")
        .select("user_id")
        .eq("id", analysisId)
        .single();
      if (!analysis?.user_id) return false;
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, trial_ends_at")
        .eq("id", analysis.user_id)
        .single();
      if (!profile) return false;
      const tier = getEffectiveTier(
        (profile.subscription_tier as SubscriptionTier) || "free",
        profile.subscription_status,
        profile.trial_ends_at
      );
      return canAccessMobile(tier);
    });

    // Step 2: Screenshot + upload (expensive, isolated to prevent re-capture on LLM failure)
    const { screenshotUrl, mobileScreenshotUrl, base64, mobileBase64, metadata } = await step.run(
      "capture-screenshot",
      async () => {
        // Capture desktop + mobile in parallel (mobile only for Pro tier)
        const [desktop, mobileResult] = await Promise.all([
          captureScreenshot(url),
          canMobile
            ? captureScreenshot(url, { width: 390 }).catch((err) => {
                console.warn(`Mobile screenshot failed for ${url}:`, err);
                return null;
              })
            : Promise.resolve(null),
        ]);

        // Upload both in parallel (mobile only if captured)
        const uploadPromises: [Promise<string>, Promise<string> | null] = [
          uploadScreenshot(supabase, analysisId, desktop.base64),
          mobileResult ? uploadScreenshot(supabase, analysisId, mobileResult.base64, "mobile") : null,
        ];
        const [uploadedUrl, mobileUploadedUrl] = await Promise.all(
          uploadPromises.map((p) => p ?? Promise.resolve(null))
        );

        return {
          screenshotUrl: uploadedUrl!,
          mobileScreenshotUrl: mobileUploadedUrl,
          base64: desktop.base64,
          mobileBase64: mobileResult?.base64 ?? null,
          metadata: desktop.metadata,
        };
      }
    );

    // Step 3: LLM analysis
    const { output, structured } = await step.run("llm-analysis", async () => {
      return runAnalysisPipeline(base64, url, metadata, mobileBase64 ?? undefined);
    });

    // Step 4: Save results
    await step.run("save-results", async () => {
      const updateData: Record<string, unknown> = {
        status: "complete",
        screenshot_url: screenshotUrl,
        output,
        structured_output: structured,
      };
      if (mobileScreenshotUrl) {
        updateData.mobile_screenshot_url = mobileScreenshotUrl;
      }
      await supabase
        .from("analyses")
        .update(updateData)
        .eq("id", analysisId);
    });

    // Step 4b: Track completion server-side
    await step.run("track-completion", async () => {
      const { data: analysis } = await supabase
        .from("analyses")
        .select("user_id, trigger_type")
        .eq("id", analysisId)
        .single();

      if (analysis?.user_id) {
        const parsedUrl = new URL(url);
        captureEvent(analysis.user_id, "audit_completed_server", {
          domain: parsedUrl.hostname,
          url,
          findings_count: structured?.findingsCount ?? 0,
          trigger_type: analysis.trigger_type ?? "manual",
        });
        await flushEvents();
      }
    });

    // Step 5: Fetch integrations and run post-analysis
    await step.run("post-analysis", async () => {
      // 5. Run unified post-analysis pipeline (comparison + analytics correlation)
      const { data: analysis } = await supabase
        .from("analyses")
        .select("user_id, deploy_id")
        .eq("id", analysisId)
        .single();

      if (analysis?.user_id) {
        // Get parent analysis for comparison (if re-scan)
        let previousFindings = null;
        let previousRunningSummary = null;

        let previousScanDate: string | null = null;

        if (parentAnalysisId) {
          const { data: parent } = await supabase
            .from("analyses")
            .select("structured_output, changes_summary, created_at")
            .eq("id", parentAnalysisId)
            .single();

          if (parent?.structured_output) {
            previousFindings = parent.structured_output;
            previousRunningSummary =
              (parent.changes_summary as ChangesSummary | null)?.running_summary ?? null;
          }
          if (parent?.created_at) {
            previousScanDate = parent.created_at;
          }
        }

        // Fetch deploy context if this analysis was triggered by a deploy
        let deployContext: DeployContext | null = null;
        if (analysis.deploy_id) {
          const { data: deploy } = await supabase
            .from("deploys")
            .select("commit_sha, commit_message, commit_author, commit_timestamp, changed_files, commits")
            .eq("id", analysis.deploy_id)
            .single();

          if (deploy) {
            const commits = (deploy.commits as CommitData[] | null) ?? undefined;
            const relevantCommits = commits
              ? filterRelevantCommits(commits, url)
              : undefined;

            deployContext = {
              commitSha: deploy.commit_sha,
              commitMessage: deploy.commit_message,
              commitAuthor: deploy.commit_author,
              commitTimestamp: deploy.commit_timestamp,
              changedFiles: deploy.changed_files || [],
              commits,
              relevantCommits,
            };
          }
        }

        // Check for PostHog integration first, then GA4
        let analyticsCredentials: {
          type: "posthog";
          apiKey: string;
          projectId: string;
          host?: string;
        } | {
          type: "ga4";
          accessToken: string;
          refreshToken: string;
          tokenExpiresAt: number;
          propertyId: string;
          integrationId: string;
        } | null = null;

        const { data: posthogIntegration } = await supabase
          .from("integrations")
          .select("access_token, provider_account_id, metadata")
          .eq("user_id", analysis.user_id)
          .eq("provider", "posthog")
          .maybeSingle();

        if (posthogIntegration) {
          analyticsCredentials = {
            type: "posthog",
            apiKey: safeDecrypt(posthogIntegration.access_token),
            projectId: posthogIntegration.provider_account_id,
            host: posthogIntegration.metadata?.host,
          };
        }

        // If no PostHog, check for GA4
        if (!analyticsCredentials) {
          const { data: ga4Integration } = await supabase
            .from("integrations")
            .select("id, access_token, metadata")
            .eq("user_id", analysis.user_id)
            .eq("provider", "ga4")
            .maybeSingle();

          if (ga4Integration?.metadata?.property_id) {
            analyticsCredentials = {
              type: "ga4",
              accessToken: safeDecrypt(ga4Integration.access_token),
              refreshToken: safeDecrypt(ga4Integration.metadata.refresh_token),
              tokenExpiresAt: ga4Integration.metadata.token_expires_at,
              propertyId: ga4Integration.metadata.property_id,
              integrationId: ga4Integration.id,
            };
          }
        }

        // Check for Supabase database integration (separate from analytics)
        let databaseCredentials: {
          type: "supabase";
          projectUrl: string;
          accessToken: string;
          keyType: "anon" | "service_role";
        } | null = null;

        const { data: supabaseIntegration } = await supabase
          .from("integrations")
          .select("access_token, metadata")
          .eq("user_id", analysis.user_id)
          .eq("provider", "supabase")
          .maybeSingle();

        if (supabaseIntegration?.metadata?.project_url) {
          databaseCredentials = {
            type: "supabase",
            projectUrl: supabaseIntegration.metadata.project_url,
            accessToken: safeDecrypt(supabaseIntegration.access_token),
            keyType: supabaseIntegration.metadata.key_type || "anon",
          };
        }

        // Fetch user feedback for LLM calibration (if page exists)
        let userFeedback: {
          feedbackType: 'accurate' | 'inaccurate';
          feedbackText: string | null;
          findingSnapshot: {
            title: string;
            elementType: string;
            currentValue: string;
            suggestion: string;
            impact: string;
          };
          createdAt: string;
        }[] | null = null;

        // Look up page_id via url + user_id
        const { data: pageForFeedback } = await supabase
          .from("pages")
          .select("id, metric_focus")
          .eq("url", url)
          .eq("user_id", analysis.user_id)
          .maybeSingle();

        if (pageForFeedback) {
          // Fetch feedback from last 90 days, limit 10 most recent
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          const { data: feedbackData } = await supabase
            .from("finding_feedback")
            .select("feedback_type, feedback_text, finding_snapshot, created_at")
            .eq("page_id", pageForFeedback.id)
            .gte("created_at", ninetyDaysAgo.toISOString())
            .order("created_at", { ascending: false })
            .limit(10);

          if (feedbackData && feedbackData.length > 0) {
            // Filter to only include feedback where elementType exists in current findings
            const currentElementTypes = new Set(
              structured.findings?.map((f: { elementType: string }) => f.elementType) || []
            );

            userFeedback = feedbackData
              .filter((f) => currentElementTypes.has(f.finding_snapshot?.elementType))
              .map((f) => ({
                feedbackType: f.feedback_type as 'accurate' | 'inaccurate',
                feedbackText: f.feedback_text,
                findingSnapshot: f.finding_snapshot as {
                  title: string;
                  elementType: string;
                  currentValue: string;
                  suggestion: string;
                  impact: string;
                },
                createdAt: f.created_at,
              }));
          }
        }

        // Fetch pending changes (watching status) for LLM revert detection
        let pendingChanges: {
          id: string;
          element: string;
          before_value: string;
          after_value: string;
          scope: "element" | "section" | "page";
          first_detected_at: string;
        }[] | null = null;

        let watchingChanges: Array<{
          id: string;
          element: string;
          before_value: string;
          after_value: string;
          scope: string;
          first_detected_at: string;
          hypothesis: string | null;
        }> | null = null;

        if (pageForFeedback) {
          const { data } = await supabase
            .from("detected_changes")
            .select("id, element, before_value, after_value, scope, first_detected_at, hypothesis")
            .eq("page_id", pageForFeedback.id)
            .eq("status", "watching")
            .limit(20); // Cap to prevent prompt bloat

          watchingChanges = data;

          if (watchingChanges && watchingChanges.length > 0) {
            pendingChanges = watchingChanges.map((c) => ({
              id: c.id,
              element: c.element,
              before_value: c.before_value,
              after_value: c.after_value,
              scope: c.scope as "element" | "section" | "page",
              first_detected_at: c.first_detected_at,
            }));
          }
        }

        // Gather checkpoint evidence for multi-horizon context
        let checkpointTimelines: string | null = null;
        if (pageForFeedback?.id) {
          try {
            // Fetch resolved changes too (they have checkpoint evidence)
            const { data: resolvedChanges } = await supabase
              .from("detected_changes")
              .select("id, element, status, first_detected_at")
              .eq("page_id", pageForFeedback.id)
              .in("status", ["validated", "regressed", "inconclusive"])
              .limit(10);

            const allChangeIds = [
              ...(watchingChanges?.map((c) => c.id) || []),
              ...(resolvedChanges?.map((c) => c.id) || []),
            ];

            if (allChangeIds.length > 0) {
              const { data: checkpoints } = await supabase
                .from("change_checkpoints")
                .select("change_id, horizon_days, assessment, metrics_json")
                .in("change_id", allChangeIds)
                .order("horizon_days", { ascending: true });

              if (checkpoints?.length) {
                // Normalize both sources to have a status field
                const watchingWithStatus = (watchingChanges || []).map((c) => ({ id: c.id, element: c.element, status: "watching", first_detected_at: c.first_detected_at }));
                const resolvedWithStatus = (resolvedChanges || []).map((c) => ({ id: c.id, element: c.element, status: c.status, first_detected_at: c.first_detected_at }));
                const allChanges = [...watchingWithStatus, ...resolvedWithStatus];
                const merged = allChanges.flatMap((c) => {
                  return (checkpoints || [])
                    .filter((cp) => cp.change_id === c.id)
                    .map((cp) => ({
                      change_id: c.id,
                      element: c.element,
                      horizon_days: cp.horizon_days as number,
                      assessment: cp.assessment as string,
                      metrics_json: cp.metrics_json as { metrics: Array<{ name: string; change_percent: number; assessment: string }> },
                      status: c.status,
                      first_detected_at: c.first_detected_at,
                    }));
                });
                checkpointTimelines = formatCheckpointTimeline(merged);
              }
            }
          } catch (err) {
            console.warn("[checkpoint-timeline] Failed to gather checkpoint data:", err);
          }
        }

        // Run post-analysis if we have previous findings OR analytics OR database OR deploy context OR user feedback OR pending changes
        if (previousFindings || analyticsCredentials || databaseCredentials || deployContext || userFeedback?.length || pendingChanges?.length) {
          try {
            // Build change hypotheses from watching changes that have hypotheses
            const changeHypotheses = watchingChanges
              ?.filter((wc) => wc.hypothesis)
              .map((wc) => ({
                element: wc.element,
                hypothesis: wc.hypothesis as string,
              })) || null;

            const changesSummary = await runPostAnalysisPipeline(
              {
                analysisId,
                userId: analysis.user_id,
                pageUrl: url,
                currentFindings: structured,
                previousFindings,
                previousRunningSummary,
                deployContext,
                userFeedback,
                pendingChanges,
                previousScanDate,
                pageFocus: pageForFeedback?.metric_focus || null,
                changeHypotheses: changeHypotheses?.length ? changeHypotheses : null,
                checkpointTimelines,
              },
              {
                supabase,
                analyticsCredentials,
                databaseCredentials,
              }
            );

            // Canonical progress composer: fail-closed — never persist LLM progress
            let canonicalSucceeded = false;
            if (pageForFeedback?.id) {
              const canonical = await composeProgressFromCanonicalState(pageForFeedback.id, supabase);

              if (canonical) {
                canonicalSucceeded = true;

                // Parity monitor: log + Sentry when LLM counts diverge from canonical
                if (changesSummary.progress) {
                  const llmV = changesSummary.progress.validated;
                  const llmW = changesSummary.progress.watching;
                  if (llmV !== canonical.validated || llmW !== canonical.watching) {
                    const msg = `[progress-divergence] page=${pageForFeedback.id} llm=(v:${llmV},w:${llmW}) canonical=(v:${canonical.validated},w:${canonical.watching})`;
                    console.warn(msg);
                    Sentry.captureMessage(msg, {
                      level: "warning",
                      tags: { monitor: "progress-parity", pageId: pageForFeedback.id },
                      extra: { llmValidated: llmV, llmWatching: llmW, canonicalValidated: canonical.validated, canonicalWatching: canonical.watching },
                    });
                  }
                }

                // Overwrite with canonical (all fields now DB-tracked)
                changesSummary.progress = {
                  ...changesSummary.progress,
                  validated: canonical.validated,
                  watching: canonical.watching,
                  open: canonical.open,
                  validatedItems: canonical.validatedItems,
                  watchingItems: canonical.watchingItems,
                  openItems: canonical.openItems,
                };
              } else {
                // Composer failed — use last known canonical snapshot, never LLM progress
                console.warn(`[integrity] composer-failed page=${pageForFeedback.id} — using last canonical snapshot`);
                Sentry.captureMessage("Canonical progress composer failed — using fallback", {
                  level: "warning",
                  tags: { monitor: "progress-parity", pageId: pageForFeedback.id },
                });
                const lastKnown = await getLastCanonicalProgress(pageForFeedback.id, supabase);
                if (lastKnown) {
                  console.warn(`[integrity] fallback-used page=${pageForFeedback.id}`);
                  changesSummary.progress = {
                    ...changesSummary.progress,
                    validated: lastKnown.validated,
                    watching: lastKnown.watching,
                    open: lastKnown.open,
                    validatedItems: lastKnown.validatedItems,
                    watchingItems: lastKnown.watchingItems,
                    openItems: lastKnown.openItems,
                  };
                } else {
                  // Double failure: no canonical, no fallback — preserve LLM watching items
                  // to avoid disappearing items. Validated/regressed are zeroed (can't trust without DB).
                  console.warn(`[integrity] double-failure page=${pageForFeedback.id} — no canonical or fallback, preserving LLM watching`);
                  Sentry.captureMessage("Canonical progress double failure — no fallback available", {
                    level: "error",
                    tags: { monitor: "progress-parity", pageId: pageForFeedback.id },
                  });
                  changesSummary.progress = {
                    ...changesSummary.progress,
                    validated: 0,
                    validatedItems: [],
                    // Keep LLM watching items as-is — better than disappearing them
                  };
                }
              }
            }

            // Store results - always save changes_summary when post-analysis runs
            const updateData: { changes_summary?: ChangesSummary; analytics_correlation?: ChangesSummary } = {
              changes_summary: changesSummary,
            };

            if (analyticsCredentials || databaseCredentials) {
              // Also store in analytics_correlation for dedicated access
              updateData.analytics_correlation = changesSummary;
            }

            const { error: progressWriteError } = await supabase
              .from("analyses")
              .update(updateData)
              .eq("id", analysisId);

            if (progressWriteError) {
              console.error(`[integrity] progress-write-failed analysis=${analysisId}:`, progressWriteError);
              Sentry.captureMessage("Failed to write canonical progress to analysis", {
                level: "error",
                tags: { monitor: "progress-parity", analysisId },
              });
            }

            // Store LLM-generated observations on detected_changes
            if (changesSummary.observations?.length && pendingChanges?.length) {
              const sentIds = new Set(pendingChanges.map((c) => c.id));
              for (const obs of changesSummary.observations) {
                if (
                  obs.changeId &&
                  sentIds.has(obs.changeId) &&
                  obs.text &&
                  typeof obs.text === "string"
                ) {
                  await supabase
                    .from("detected_changes")
                    .update({
                      observation_text: obs.text.slice(0, 2000),
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", obs.changeId)
                    .eq("user_id", analysis.user_id);
                }
              }
            }

            // Upsert LLM suggestions into tracked_suggestions (persistent state)
            if (changesSummary.suggestions?.length && pageForFeedback?.id) {
              try {
                // Fetch all existing suggestions for this page (single query)
                const { data: existing } = await supabase
                  .from("tracked_suggestions")
                  .select("id, title, element, status, times_suggested")
                  .eq("page_id", pageForFeedback.id);

                const existingMap = new Map(
                  (existing || []).map((s) => [
                    `${s.element.trim().toLowerCase()}::${s.title.trim().toLowerCase()}`,
                    s,
                  ])
                );

                const now = new Date().toISOString();
                const seen = new Set<string>();

                const upsertPromises = changesSummary.suggestions.map((suggestion) => {
                  const key = `${suggestion.element.trim().toLowerCase()}::${suggestion.title.trim().toLowerCase()}`;
                  if (seen.has(key)) return null; // deduplicate within scan
                  seen.add(key);
                  const match = existingMap.get(key);

                  if (match) {
                    // Update existing — reopen if addressed/dismissed (LLM re-suggesting = credibility)
                    return supabase
                      .from("tracked_suggestions")
                      .update({
                        status: "open",
                        times_suggested: match.times_suggested + 1,
                        suggested_fix: suggestion.suggestedFix.trim().slice(0, 2000),
                        impact: suggestion.impact,
                        updated_at: now,
                      })
                      .eq("id", match.id);
                  } else {
                    // Insert new
                    return supabase.from("tracked_suggestions").insert({
                      page_id: pageForFeedback.id,
                      user_id: analysis.user_id,
                      title: suggestion.title.trim().slice(0, 500),
                      element: suggestion.element.trim().slice(0, 200),
                      suggested_fix: suggestion.suggestedFix.trim().slice(0, 2000),
                      impact: suggestion.impact,
                      status: "open",
                      times_suggested: 1,
                      first_suggested_at: now,
                    });
                  }
                });

                const results = await Promise.allSettled(upsertPromises.filter(Boolean));
                // Check for Supabase-level errors (resolve with { error } rather than throwing)
                let upsertFailures = 0;
                for (const result of results) {
                  if (result.status === "rejected") {
                    upsertFailures++;
                  } else if (result.value && typeof result.value === "object" && "error" in result.value && result.value.error) {
                    upsertFailures++;
                  }
                }
                if (upsertFailures > 0) {
                  console.warn(`[suggestion-upsert] ${upsertFailures}/${results.length} operations failed for page=${pageForFeedback.id}`);
                  Sentry.captureMessage("Partial suggestion upsert failure", {
                    level: "warning",
                    tags: { phase: "suggestion-upsert", pageId: pageForFeedback.id },
                    extra: { failed: upsertFailures, total: results.length },
                  });
                }

                // Recompose open counts now that upserts are done (fixes stale-on-first-run)
                const { data: freshOpen, error: freshOpenErr } = await supabase
                  .from("tracked_suggestions")
                  .select("id, title, element, impact")
                  .eq("page_id", pageForFeedback.id)
                  .eq("status", "open")
                  .order("impact", { ascending: true })
                  .order("times_suggested", { ascending: false });

                if (freshOpenErr) {
                  console.warn(`[suggestion-recompose] Failed to query open suggestions for page=${pageForFeedback.id}:`, freshOpenErr);
                  Sentry.captureMessage("Failed to recompose open suggestions after upsert", {
                    level: "warning",
                    tags: { phase: "suggestion-recompose", pageId: pageForFeedback.id },
                  });
                } else if (freshOpen) {
                  const openItems = freshOpen.map((s) => ({
                    id: s.id, element: s.element, title: s.title, impact: s.impact,
                  }));
                  changesSummary.progress = {
                    ...changesSummary.progress,
                    open: openItems.length,
                    openItems,
                  };
                  // Patch the already-written analysis with fresh open counts
                  const { error: patchErr } = await supabase
                    .from("analyses")
                    .update({ changes_summary: changesSummary })
                    .eq("id", analysisId);

                  if (patchErr) {
                    console.error(`[suggestion-recompose] Failed to patch analysis=${analysisId}:`, patchErr);
                    Sentry.captureMessage("Failed to write recomposed open counts to analysis", {
                      level: "error",
                      tags: { phase: "suggestion-recompose", analysisId },
                    });
                  }
                }
              } catch (suggestionErr) {
                console.error("Failed to upsert tracked_suggestions:", suggestionErr);
                Sentry.captureException(suggestionErr, {
                  tags: { phase: "suggestion-upsert", pageId: pageForFeedback.id },
                });
              }
            }

            // Create detected_changes rows from scheduled scan changes (N+1 scans only)
            if (parentAnalysisId && changesSummary.changes?.length > 0 && pageForFeedback?.id) {
              const candidateIds = new Set((pendingChanges ?? []).map((c) => c.id));
              const candidateScopes = new Map((pendingChanges ?? []).map((c) => [c.id, c.scope]));

              for (const change of changesSummary.changes) {
                try {
                  const proposal = validateMatchProposal(change, candidateIds, candidateScopes);

                  if (proposal.accepted && proposal.matched_change_id) {
                    // Update existing watching row
                    await supabase
                      .from("detected_changes")
                      .update({
                        after_value: change.after,
                        description: change.description || null,
                        match_confidence: proposal.match_confidence,
                        match_rationale: proposal.match_rationale,
                        updated_at: new Date().toISOString(),
                      })
                      .eq("id", proposal.matched_change_id)
                      .eq("user_id", analysis.user_id)
                      .eq("status", "watching");
                  } else {
                    // Insert new row
                    await supabase.from("detected_changes").insert({
                      page_id: pageForFeedback.id,
                      user_id: analysis.user_id,
                      element: change.element,
                      scope: change.scope || "element",
                      before_value: change.before,
                      after_value: change.after,
                      description: change.description || null,
                      first_detected_analysis_id: analysisId,
                      status: "watching",
                      first_detected_at: new Date().toISOString(),
                      match_confidence: proposal.match_confidence ?? null,
                      match_rationale: proposal.match_rationale || null,
                    });
                  }
                } catch (insertErr) {
                  // Unique constraint violation = already recorded today, skip
                  if (!(insertErr instanceof Error && insertErr.message.includes("duplicate"))) {
                    console.error("Failed to upsert detected_change from scheduled scan:", insertErr);
                  }
                }
              }
            }

            // Check for correlation unlock: use canonical DB status (not item bucket membership)
            // Only send unlock email if canonical compose succeeded (prevents false positives)
            if (parentAnalysisId && canonicalSucceeded && pageForFeedback?.id) {
              // Query DB directly for changes that transitioned watching→validated
              const { data: validatedChanges } = await supabase
                .from("detected_changes")
                .select("id, element, before_value, after_value, first_detected_at, status, correlation_metrics")
                .eq("page_id", pageForFeedback.id)
                .eq("status", "validated")
                .order("correlation_unlocked_at", { ascending: false })
                .limit(1);

              const validatedChange = validatedChanges?.[0];
              if (validatedChange) {
                // Confirm this was recently watching (check lifecycle events or parent progress)
                const { data: parent } = await supabase
                  .from("analyses")
                  .select("changes_summary")
                  .eq("id", parentAnalysisId)
                  .single();

                const parentWatching = (parent?.changes_summary as ChangesSummary | null)?.progress?.watchingItems;
                const wasWatching = parentWatching?.some((w) => w.id === validatedChange.id);

                if (wasWatching) {
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("email, email_notifications")
                    .eq("id", analysis.user_id)
                    .single();

                  if (profile?.email && profile.email_notifications) {
                    const metrics = validatedChange.correlation_metrics as CorrelationMetrics | null;
                    const topMetric = metrics?.metrics?.find(
                      (m) => m.assessment === "improved"
                    );
                    const topSuggestion = extractTopSuggestion(changesSummary, null);
                    const { subject, html } = correlationUnlockedEmail({
                      pageUrl: url,
                      analysisId,
                      changeId: validatedChange.id,
                      change: {
                        element: validatedChange.element,
                        before: validatedChange.before_value ?? "",
                        after: validatedChange.after_value ?? "",
                        changedAt: new Date(validatedChange.first_detected_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        }),
                      },
                      metric: topMetric
                        ? {
                            friendlyName: friendlyMetricNames[topMetric.name] || topMetric.name,
                            change: `${topMetric.change_percent > 0 ? "+" : ""}${topMetric.change_percent}%`,
                          }
                        : { friendlyName: "metrics", change: "improved" },
                      topSuggestion: topSuggestion
                        ? {
                            element: topSuggestion.element,
                            friendlyText: topSuggestion.friendlyText,
                            range: topSuggestion.range,
                          }
                        : undefined,
                    });
                    sendEmail({ to: profile.email, subject, html }).catch(console.error);
                  }
                }
              }
            }
          } catch (postAnalysisErr) {
            // Structured logging for post-analysis failures
            const errorDetails = {
              analysisId,
              url,
              userId: analysis.user_id,
              hasPreviousFindings: !!previousFindings,
              hasDeployContext: !!deployContext,
              hasAnalytics: !!analyticsCredentials,
              hasDatabase: !!databaseCredentials,
              error: postAnalysisErr instanceof Error ? {
                message: postAnalysisErr.message,
                name: postAnalysisErr.name,
                stack: postAnalysisErr.stack?.split('\n').slice(0, 3).join('\n'),
              } : String(postAnalysisErr),
            };
            Sentry.withScope((scope) => {
              scope.setUser({ id: analysis.user_id });
              scope.setTag("function", "analyzeUrl");
              scope.setTag("step", "post-analysis");
              scope.setTag("analysisId", analysisId);
              Sentry.captureException(postAnalysisErr, { extra: errorDetails });
            });
            await Sentry.flush(2000);
            console.error("Post-analysis pipeline failed:", JSON.stringify(errorDetails, null, 2));

            // Store error details — compose progress from canonical DB state (not hardcoded zeros)
            let failureProgress: { validated: number; watching: number; open: number; validatedItems: ValidatedItem[]; watchingItems: WatchingItem[]; openItems: OpenItem[] } = {
              validated: 0, watching: 0, open: 0, validatedItems: [], watchingItems: [], openItems: [],
            };
            if (pageForFeedback?.id) {
              const canonical = await composeProgressFromCanonicalState(pageForFeedback.id, supabase);
              if (canonical) {
                failureProgress = { ...failureProgress, ...canonical };
              } else {
                const lastKnown = await getLastCanonicalProgress(pageForFeedback.id, supabase);
                if (lastKnown) {
                  failureProgress = { ...failureProgress, ...lastKnown };
                }
              }
            }
            await supabase
              .from("analyses")
              .update({
                changes_summary: {
                  verdict: "Analysis complete. Change detection unavailable.",
                  changes: [],
                  suggestions: [],
                  correlation: null,
                  progress: failureProgress,
                  running_summary: "Post-analysis failed. Primary audit is available.",
                  _error: "post_analysis_failed",
                },
              })
              .eq("id", analysisId);
          }
        }

        // 6. Fetch full analysis data for subsequent steps
        const { data: fullAnalysis } = await supabase
          .from("analyses")
          .select("trigger_type, deploy_id, changes_summary, structured_output")
          .eq("id", analysisId)
          .single();

        // 6a. Update pages.last_scan_id (and stable_baseline_id when appropriate)
        const pageUpdate: { last_scan_id: string; stable_baseline_id?: string } = {
          last_scan_id: analysisId,
        };

        // Set stable_baseline_id for daily/weekly scans, OR for deploy scans when no baseline exists
        // This fixes the "stale baseline loop" where deploy fallback to full analysis never establishes a baseline
        const isScheduledScan = fullAnalysis?.trigger_type === "daily" || fullAnalysis?.trigger_type === "weekly";
        const isDeployFallback = fullAnalysis?.trigger_type === "deploy";

        if (isScheduledScan) {
          // Scheduled scans always update the baseline
          pageUpdate.stable_baseline_id = analysisId;
        } else if (isDeployFallback) {
          // Deploy fallback: check if page has no baseline, set one to prevent infinite fallback loop
          const { data: currentPage } = await supabase
            .from("pages")
            .select("stable_baseline_id")
            .eq("user_id", analysis.user_id)
            .eq("url", url)
            .single();

          if (!currentPage?.stable_baseline_id) {
            pageUpdate.stable_baseline_id = analysisId;
          }
        }

        const { data: updatedPage, error: pageUpdateError } = await supabase
          .from("pages")
          .update(pageUpdate)
          .eq("user_id", analysis.user_id)
          .eq("url", url)
          .select("id")
          .single();

        if (pageUpdateError) {
          console.error(`Failed to update page for analysis ${analysisId}:`, pageUpdateError);
        }

        // 6b. Reconcile detected_changes: mark reverted based on LLM analysis
        const analysisChangesSummary = fullAnalysis?.changes_summary as ChangesSummary | null;
        if (analysisChangesSummary?.revertedChangeIds?.length && pendingChanges?.length) {
          // Validate: only allow IDs that we actually sent to the LLM
          const sentIds = new Set(pendingChanges.map((c) => c.id));
          const validRevertedIds = analysisChangesSummary.revertedChangeIds
            .filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 100)
            .filter((id) => sentIds.has(id))
            .slice(0, 50); // Cap at reasonable limit

          // LLM identified changes that were reverted (page shows BEFORE value, not AFTER)
          for (const revertedId of validRevertedIds) {
            const { error: revertError } = await supabase
              .from("detected_changes")
              .update({
                status: "reverted",
                updated_at: new Date().toISOString(),
              })
              .eq("id", revertedId)
              .eq("user_id", analysis.user_id) // Ownership check
              .eq("status", "watching"); // Only revert things currently watching

            if (revertError) {
              console.error(`Failed to mark change ${revertedId} as reverted:`, revertError);
            }
          }

          // Recompose canonical progress after revert mutations changed DB state
          if (validRevertedIds.length > 0 && pageForFeedback?.id) {
            console.log(`Marked ${validRevertedIds.length} changes as reverted for analysis ${analysisId}`);
            const recomposed = await composeProgressFromCanonicalState(pageForFeedback.id, supabase);
            if (recomposed) {
              const currentSummary = analysisChangesSummary || {} as ChangesSummary;
              const { error: recomposeError } = await supabase
                .from("analyses")
                .update({
                  changes_summary: {
                    ...currentSummary,
                    progress: {
                      ...currentSummary.progress,
                      validated: recomposed.validated,
                      watching: recomposed.watching,
                      open: recomposed.open,
                      validatedItems: recomposed.validatedItems,
                      watchingItems: recomposed.watchingItems,
                      openItems: recomposed.openItems,
                    },
                  },
                })
                .eq("id", analysisId);

              if (recomposeError) {
                console.error(`[integrity] recompose-after-revert-failed analysis=${analysisId}:`, recomposeError);
                Sentry.captureMessage("Failed to recompose progress after revert", {
                  level: "error",
                  tags: { monitor: "progress-parity", analysisId },
                });
              }
            }
          }
        }

        // 7. Send email notification (for scheduled/deploy scans only)
        // Re-read analysis if reverts may have updated changes_summary
        if (analysisChangesSummary?.revertedChangeIds?.length) {
          const { data: refreshed } = await supabase
            .from("analyses")
            .select("trigger_type, deploy_id, changes_summary, structured_output")
            .eq("id", analysisId)
            .single();
          if (refreshed) Object.assign(fullAnalysis!, refreshed);
        }

        if (fullAnalysis?.trigger_type === "deploy") {
          // Get user email + preferences
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, email_notifications")
            .eq("id", analysis.user_id)
            .single();

          if (profile?.email && profile.email_notifications) {
            const changesSummary = fullAnalysis?.changes_summary as ChangesSummary | null;
            const structuredOutput = fullAnalysis?.structured_output as { findings?: Array<{ element: string; prediction: { friendlyText: string; range: string } }> } | null;
            const hasChanges = changesSummary && changesSummary.changes.length > 0;

            // Get deploy info if applicable
            let deployInfo: { commitSha: string; commitMessage: string | null } | null = null;
            if (fullAnalysis.deploy_id) {
              const { data: deploy } = await supabase
                .from("deploys")
                .select("commit_sha, commit_message")
                .eq("id", fullAnalysis.deploy_id)
                .single();
              if (deploy) {
                deployInfo = {
                  commitSha: deploy.commit_sha,
                  commitMessage: deploy.commit_message,
                };
              }
            }

            // Extract top suggestion from changes_summary or structured_output
            const topSuggestion = extractTopSuggestion(changesSummary, structuredOutput);

            // Deploy emails: only notify when changes are actually detected
            if (changesSummary && hasChanges) {
                // Get first watching change ID for hypothesis link
                let hypothesisChangeId: string | undefined;
                if (updatedPage?.id) {
                  const { data: recentWatching } = await supabase
                    .from("detected_changes")
                    .select("id")
                    .eq("page_id", updatedPage.id)
                    .eq("status", "watching")
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();
                  hypothesisChangeId = recentWatching?.id;
                }

                // Send changeDetectedEmail
                const primaryChange = changesSummary.changes[0];
                const { subject, html } = changeDetectedEmail({
                  pageUrl: url,
                  analysisId,
                  triggerType: "deploy",
                  primaryChange: {
                    element: primaryChange.element,
                    before: primaryChange.before,
                    after: primaryChange.after,
                  },
                  additionalChangesCount: changesSummary.changes.length - 1,
                  correlation: changesSummary.correlation
                    ? {
                        hasEnoughData: changesSummary.correlation.hasEnoughData,
                        primaryMetric: changesSummary.correlation.metrics?.[0]
                          ? {
                              friendlyName: changesSummary.correlation.metrics[0].friendlyName,
                              change: changesSummary.correlation.metrics[0].change,
                              assessment: changesSummary.correlation.metrics[0].assessment,
                            }
                          : undefined,
                      }
                    : undefined,
                  topSuggestion: topSuggestion
                    ? {
                        element: topSuggestion.element,
                        friendlyText: topSuggestion.friendlyText,
                        range: topSuggestion.range,
                      }
                    : undefined,
                  commitSha: deployInfo?.commitSha,
                  commitMessage: deployInfo?.commitMessage ?? undefined,
                  hypothesisChangeId,
                });
                sendEmail({ to: profile.email, subject, html }).catch(console.error);
            }
          }
        }
      }
    });

      return { success: true, analysisId };
    } catch (error) {
      // Mark analysis as failed so it doesn't stay in "processing" forever
      const message = error instanceof Error ? error.message : "Unknown error";
      // Best-effort user context — must not block error handling
      let userId: string | undefined;
      try {
        const { data: failedAnalysis } = await supabase
          .from("analyses")
          .select("user_id")
          .eq("id", analysisId)
          .single();
        userId = failedAnalysis?.user_id;
      } catch {
        // Supabase may be down too — proceed without user context
      }
      Sentry.withScope((scope) => {
        if (userId) scope.setUser({ id: userId });
        scope.setTag("function", "analyzeUrl");
        scope.setTag("analysisId", analysisId);
        Sentry.captureException(error, { extra: { url, parentAnalysisId } });
      });
      await Sentry.flush(2000);
      await supabase
        .from("analyses")
        .update({ status: "failed", error_message: message })
        .eq("id", analysisId);
      throw error;
    }
  }
);
