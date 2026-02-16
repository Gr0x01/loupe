import * as Sentry from "@sentry/nextjs";
import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { captureScreenshot, uploadScreenshot, pingScreenshotService } from "@/lib/screenshot";
import { runAnalysisPipeline, runPostAnalysisPipeline, runQuickDiff, formatCheckpointTimeline, runStrategyNarrative, runCheckpointAssessment, validateMatchProposal } from "@/lib/ai/pipeline";
import type { DeployContext } from "@/lib/ai/pipeline";
import { sendEmail } from "@/lib/email/resend";
import {
  changeDetectedEmail,
  allQuietEmail,
  correlationUnlockedEmail,
  dailyDigestEmail,
} from "@/lib/email/templates";
import type { ChangesSummary, ChronicleSuggestion, CorrelationMetrics, DetectedChange, CommitData, ValidatedItem, WatchingItem, OpenItem } from "@/lib/types/analysis";
import { filterRelevantCommits } from "@/lib/utils/commit-filter";
import { couldAffectPage } from "@/lib/utils/deploy-filter";
import { safeDecrypt } from "@/lib/crypto";
import { getStableBaseline, isBaselineStale } from "@/lib/analysis/baseline";
import { composeProgressFromCanonicalState, getLastCanonicalProgress, friendlyMetricNames } from "@/lib/analysis/progress";
import { correlateChange, gatherSupabaseMetrics } from "@/lib/analytics/correlation";
import { createSupabaseAdapter, SupabaseAdapter } from "@/lib/analytics/supabase-adapter";
import { createProvider } from "@/lib/analytics/provider";
import {
  getEligibleHorizons,
  computeWindows,
  assessCheckpoint,
  resolveStatusTransition,
  formatCheckpointObservation,
} from "@/lib/analytics/checkpoints";
import type { CheckpointAssessment, HorizonDays } from "@/lib/types/analysis";
import { canUseDeployScans, canAccessMobile, getEffectiveTier, type SubscriptionTier } from "@/lib/permissions";
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

                // Overwrite with canonical, preserving LLM's open/openItems (not DB-tracked yet)
                changesSummary.progress = {
                  ...changesSummary.progress,
                  validated: canonical.validated,
                  watching: canonical.watching,
                  validatedItems: canonical.validatedItems,
                  watchingItems: canonical.watchingItems,
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
                    validatedItems: lastKnown.validatedItems,
                    watchingItems: lastKnown.watchingItems,
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
                      validatedItems: recomposed.validatedItems,
                      watchingItems: recomposed.watchingItems,
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

            // Get last change date for "all quiet" emails
            let lastChangeDate: string | null = null;
            if (!hasChanges && parentAnalysisId) {
              const { data: parentAnalysis } = await supabase
                .from("analyses")
                .select("changes_summary, created_at")
                .eq("id", parentAnalysisId)
                .single();
              const parentChanges = parentAnalysis?.changes_summary as ChangesSummary | null;
              if (parentChanges?.changes?.length && parentAnalysis) {
                // Use parent's change date
                lastChangeDate = new Date(parentAnalysis.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }
            }

            // Extract top suggestion from changes_summary or structured_output
            const topSuggestion = extractTopSuggestion(changesSummary, structuredOutput);

            // Only send email if we have changes_summary (always true for scheduled/deploy scans)
            if (changesSummary) {
              if (hasChanges) {
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
              } else {
                // No changes — send allQuietEmail
                const { subject, html } = allQuietEmail({
                  pageUrl: url,
                  analysisId,
                  lastChangeDate,
                  topSuggestion: topSuggestion
                    ? {
                        title: topSuggestion.title || topSuggestion.element,
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

/**
 * Shared logic for scheduled scans (daily/weekly).
 * Creates analyses and triggers Inngest events for each page.
 */
async function runScheduledScans(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any,
  frequency: "daily" | "weekly"
): Promise<{ scanned: number }> {
  try {
    const supabase = createServiceClient();

    // Get all pages due for scan
    const { data: pages, error } = await supabase
      .from("pages")
      .select("id, user_id, url, last_scan_id")
      .eq("scan_frequency", frequency);

    if (error) {
      console.error(`Failed to fetch pages for ${frequency} scan:`, error);
      throw error;
    }

    if (!pages || pages.length === 0) {
      return { scanned: 0 };
    }

    // Create analyses for each page (with date-based idempotency)
    const results = await step.run(`create-${frequency}-analyses`, async () => {
      const created: { pageId: string; analysisId: string }[] = [];
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      for (const page of pages) {
        // Idempotency: skip if a scan already exists for this URL + frequency + today
        const { count } = await supabase
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("url", page.url)
          .eq("user_id", page.user_id)
          .eq("trigger_type", frequency)
          .gte("created_at", todayStart.toISOString());

        if (count && count > 0) {
          console.log(`Skipping duplicate ${frequency} scan for ${page.url} (already exists today)`);
          continue;
        }

        const { data: newAnalysis, error: insertError } = await supabase
          .from("analyses")
          .insert({
            url: page.url,
            user_id: page.user_id,
            parent_analysis_id: page.last_scan_id,
            trigger_type: frequency,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertError || !newAnalysis) {
          console.error(`Failed to create analysis for page ${page.id}:`, insertError);
          continue;
        }

        created.push({ pageId: page.id, analysisId: newAnalysis.id });
      }

      return created;
    });

    // Send Inngest events for each analysis (in separate step for durability)
    await step.run(`trigger-${frequency}-scans`, async () => {
      for (const { analysisId } of results) {
        const { data: analysis } = await supabase
          .from("analyses")
          .select("url, parent_analysis_id")
          .eq("id", analysisId)
          .single();

        if (analysis) {
          await inngest.send({
            name: "analysis/created",
            data: {
              analysisId,
              url: analysis.url,
              parentAnalysisId: analysis.parent_analysis_id || undefined,
            },
          });
        }
      }
    });

    return { scanned: results.length };
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("function", "runScheduledScans");
      scope.setTag("frequency", frequency);
      Sentry.captureException(err);
    });
    await Sentry.flush(2000);
    throw err;
  }
}

/**
 * Scheduled scan function — runs weekly on Monday 9am UTC
 * Scans all pages with scan_frequency='weekly'
 */
export const scheduledScan = inngest.createFunction(
  {
    id: "scheduled-scan",
    retries: 0,
  },
  { cron: "0 9 * * 1" }, // Monday 9am UTC
  async ({ step }) => {
    return runScheduledScans(step, "weekly");
  }
);

/**
 * Daily scheduled scan — runs daily at 9am UTC
 * Scans all pages with scan_frequency='daily'
 */
export const scheduledScanDaily = inngest.createFunction(
  {
    id: "scheduled-scan-daily",
    retries: 0,
  },
  { cron: "0 9 * * *" }, // Daily 9am UTC
  async ({ step }) => {
    return runScheduledScans(step, "daily");
  }
);

/**
 * Deploy detected — triggered by GitHub webhook on push to main
 *
 * NEW BEHAVIOR (lightweight detection):
 * 1. Wait 45s for Vercel deploy
 * 2. For each page: get baseline, check staleness
 * 3. If stale/missing baseline → run full analysis (establishes baseline)
 * 4. Otherwise → quick Haiku diff against baseline
 * 5. If changes detected → create detected_changes record, send "watching" notification
 * 6. No full analysis on every deploy (saves ~$0.05/page/deploy)
 */
export const deployDetected = inngest.createFunction(
  {
    id: "deploy-detected",
    retries: 2,
  },
  { event: "deploy/detected" },
  async ({ event, step }) => {
    const { deployId, userId } = event.data as {
      deployId: string;
      repoId: string;
      userId: string;
      commitSha: string;
      fullName: string;
    };

    const supabase = createServiceClient();

    // Check user's tier - skip deploy scans for free tier
    const userTier = await step.run("check-tier", async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier")
        .eq("id", userId)
        .single();

      return (profile?.subscription_tier as SubscriptionTier) || "free";
    });

    if (!canUseDeployScans(userTier)) {
      // Mark deploy as complete but skip scanning
      await supabase
        .from("deploys")
        .update({ status: "complete" })
        .eq("id", deployId);

      return {
        scanned: 0,
        message: "Deploy scans not available on free tier",
      };
    }

    // Wait for Vercel to deploy (simple fixed delay for MVP)
    await step.sleep("wait-for-vercel", "45s");

    // Update deploy status
    await step.run("mark-scanning", async () => {
      await supabase
        .from("deploys")
        .update({ status: "scanning" })
        .eq("id", deployId);
    });

    // Find all pages for this user
    const pages = await step.run("find-pages", async () => {
      const { data } = await supabase
        .from("pages")
        .select("id, url, last_scan_id, stable_baseline_id")
        .eq("user_id", userId);

      return data || [];
    });

    // Fetch deploy's changed_files to filter pages
    const deploy = await step.run("fetch-deploy", async () => {
      const { data } = await supabase
        .from("deploys")
        .select("changed_files")
        .eq("id", deployId)
        .single();
      return data;
    });

    // Filter pages to only those affected by the deploy's changed files
    const changedFiles: string[] = deploy?.changed_files || [];
    const filteredPages = changedFiles.length > 0
      ? pages.filter((p) => couldAffectPage(changedFiles, p.url))
      : pages;

    if (filteredPages.length === 0) {
      await step.run("mark-complete-no-affected", async () => {
        await supabase
          .from("deploys")
          .update({ status: "complete" })
          .eq("id", deployId);
      });

      console.log(`Deploy ${deployId}: 0 of ${pages.length} pages affected by changed files`);
      return { scanned: 0, message: `No pages affected by deploy (${pages.length} pages, ${changedFiles.length} changed files)` };
    }

    console.log(`Deploy ${deployId}: Scanning ${filteredPages.length} of ${pages.length} pages`);

    // Process each page
    const results = await step.run("detect-changes", async () => {
      const processed: { pageId: string; hadChanges: boolean; usedFullAnalysis: boolean; error?: string }[] = [];

      for (const page of filteredPages) {
        try {
          // 1. Get stable baseline
          const baseline = await getStableBaseline(supabase, page.id);

          // 2. Staleness check: if no baseline or >14 days old, run full analysis
          if (isBaselineStale(baseline)) {
            // Fall back to full analysis to establish baseline
            const { data: newAnalysis } = await supabase
              .from("analyses")
              .insert({
                url: page.url,
                user_id: userId,
                parent_analysis_id: page.last_scan_id,
                deploy_id: deployId,
                trigger_type: "deploy",
                status: "pending",
              })
              .select("id")
              .single();

            if (newAnalysis) {
              // Trigger full analysis
              await inngest.send({
                name: "analysis/created",
                data: {
                  analysisId: newAnalysis.id,
                  url: page.url,
                  parentAnalysisId: page.last_scan_id || undefined,
                },
              });
            }

            processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: true });
            continue;
          }

          // At this point, baseline is guaranteed non-null (stale check passed)
          if (!baseline) {
            // TypeScript guard - should never reach here
            processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: false });
            continue;
          }

          // 3. Screenshot current page (desktop + mobile if Pro and baseline has mobile)
          const deployCanMobile = canAccessMobile(userTier) && !!baseline.mobile_screenshot_url;
          const [desktopResult, mobileResult] = await Promise.all([
            captureScreenshot(page.url),
            deployCanMobile
              ? captureScreenshot(page.url, { width: 390 }).catch((err) => {
                  console.warn(`Mobile screenshot failed for ${page.url}:`, err);
                  return null;
                })
              : Promise.resolve(null),
          ]);
          const currentScreenshot = desktopResult.base64;
          const currentMobileScreenshot = mobileResult?.base64 ?? null;

          // 4. Fetch watching candidates for fingerprint matching
          const { data: watchingForPage } = await supabase
            .from("detected_changes")
            .select("id, element, before_value, after_value, scope, first_detected_at")
            .eq("page_id", page.id)
            .eq("status", "watching")
            .limit(20);

          // 5. Quick Haiku diff against baseline (with mobile if both exist)
          const diffResult = await runQuickDiff(
            baseline.screenshot_url,
            currentScreenshot,
            baseline.mobile_screenshot_url,
            currentMobileScreenshot,
            watchingForPage as import("@/lib/ai/pipeline").PendingChange[] | null
          );

          if (!diffResult.hasChanges || diffResult.changes.length === 0) {
            // No changes detected
            processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: false });
            continue;
          }

          // 6. Record detected changes with fingerprint-aware upsert
          const candidateIds = new Set((watchingForPage ?? []).map((c) => c.id));
          const candidateScopes = new Map((watchingForPage ?? []).map((c) => [c.id, c.scope as "element" | "section" | "page"]));

          for (const change of diffResult.changes) {
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
                  .eq("user_id", userId)
                  .eq("status", "watching");
              } else {
                // Insert new row with proposal metadata
                await supabase.from("detected_changes").insert({
                  page_id: page.id,
                  user_id: userId,
                  element: change.element,
                  scope: change.scope,
                  before_value: change.before,
                  after_value: change.after,
                  description: change.description || null,
                  deploy_id: deployId,
                  status: "watching",
                  first_detected_at: new Date().toISOString(),
                  match_confidence: proposal.match_confidence ?? null,
                  match_rationale: proposal.match_rationale || null,
                });
              }
            } catch (insertErr) {
              // Unique constraint violation = already recorded today, skip
              if (!(insertErr instanceof Error && insertErr.message.includes("duplicate"))) {
                console.error("Failed to upsert detected_change:", insertErr);
              }
            }
          }

          // 6. Send "watching" notification
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, email_notifications")
            .eq("id", userId)
            .single();

          if (profile?.email && profile.email_notifications) {
            // Capture first inserted change ID for hypothesis link
            let firstChangeId: string | undefined;
            {
              const { data: recentChange } = await supabase
                .from("detected_changes")
                .select("id")
                .eq("page_id", page.id)
                .eq("deploy_id", deployId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              firstChangeId = recentChange?.id;
            }

            // Send a lightweight "watching" email
            const primaryChange = diffResult.changes[0];
            const { subject, html } = changeDetectedEmail({
              pageUrl: page.url,
              analysisId: baseline.id, // Link to baseline for context
              triggerType: "deploy",
              primaryChange: {
                element: primaryChange.element,
                before: primaryChange.before,
                after: primaryChange.after,
              },
              additionalChangesCount: diffResult.changes.length - 1,
              correlation: {
                hasEnoughData: false, // Always watching for deploy
              },
              hypothesisChangeId: firstChangeId,
            });
            sendEmail({ to: profile.email, subject, html }).catch(console.error);
          }

          processed.push({ pageId: page.id, hadChanges: true, usedFullAnalysis: false });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          Sentry.withScope((scope) => {
            scope.setUser({ id: userId });
            scope.setTag("function", "deployDetected");
            scope.setTag("pageId", page.id);
            Sentry.captureException(err, { extra: { url: page.url, deployId } });
          });
          console.error(`Deploy detection failed for page ${page.id} (${page.url}):`, errMsg);
          processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: false, error: errMsg });
        }
      }

      return processed;
    });

    // Mark deploy complete (with scan results for debugging)
    await step.run("mark-complete", async () => {
      const errors = results.filter((r) => r.error);
      const updateData: Record<string, unknown> = { status: "complete" };
      if (errors.length > 0 || results.length > 0) {
        updateData.scan_results = results;
      }
      await supabase
        .from("deploys")
        .update(updateData)
        .eq("id", deployId);
    });

    const changesDetected = results.filter((r) => r.hadChanges).length;
    const fullAnalysisRun = results.filter((r) => r.usedFullAnalysis).length;
    const errors = results.filter((r) => r.error).map((r) => ({ pageId: r.pageId, error: r.error }));

    return {
      scanned: results.length,
      changesDetected,
      fullAnalysisRun,
      errors: errors.length > 0 ? errors : undefined,
      deployId,
    };
  }
);

/**
 * Daily scan digest — sends one consolidated email per user after daily/weekly scans.
 * Runs daily at 10am UTC (1 hour after scans start at 9am, giving them time to complete).
 * Only sends if at least one page changed. All-quiet = no email.
 */
export const dailyScanDigest = inngest.createFunction(
  {
    id: "daily-scan-digest",
    retries: 1,
  },
  { cron: "0 11 * * *" }, // Daily 11am UTC (2h after scans start at 9am)
  async ({ step }) => {
    const supabase = createServiceClient();

    // Find all analyses from the last 3 hours with daily/weekly trigger
    const recentAnalyses = await step.run("find-recent-analyses", async () => {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      const { data, error } = await supabase
        .from("analyses")
        .select("id, url, user_id, changes_summary, status")
        .in("trigger_type", ["daily", "weekly"])
        .gte("created_at", threeHoursAgo.toISOString())
        .eq("status", "complete");

      if (error) {
        console.error("Failed to fetch recent analyses for digest:", error);
        throw error;
      }

      return data || [];
    });

    if (recentAnalyses.length === 0) {
      return { sent: 0, reason: "no recent analyses" };
    }

    // Group by user_id
    const byUser = new Map<string, typeof recentAnalyses>();
    for (const analysis of recentAnalyses) {
      const existing = byUser.get(analysis.user_id) || [];
      existing.push(analysis);
      byUser.set(analysis.user_id, existing);
    }

    // Send digest to each user
    const results = await step.run("send-digests", async () => {
      let sent = 0;

      for (const [userId, analyses] of byUser) {
        try {
          // Check user email preferences
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, email_notifications")
            .eq("id", userId)
            .single();

          if (!profile?.email || !profile.email_notifications) continue;

          // Build page results
          const pageResults: Array<{
            url: string;
            domain: string;
            analysisId: string;
            hasChanges: boolean;
            primaryChange?: { element: string; before: string; after: string };
            additionalChangesCount?: number;
          }> = [];

          for (const analysis of analyses) {
            const changesSummary = analysis.changes_summary as ChangesSummary | null;
            const hasChanges = !!(changesSummary?.changes?.length);

            let domain: string;
            try {
              domain = new URL(analysis.url).hostname;
            } catch {
              domain = analysis.url;
            }

            const result: (typeof pageResults)[number] = {
              url: analysis.url,
              domain,
              analysisId: analysis.id,
              hasChanges,
            };

            if (hasChanges && changesSummary) {
              const primary = changesSummary.changes[0];
              result.primaryChange = {
                element: primary.element,
                before: primary.before,
                after: primary.after,
              };
              result.additionalChangesCount = changesSummary.changes.length - 1;
            }

            pageResults.push(result);
          }

          // Skip email if ALL pages are stable
          const anyChanged = pageResults.some((p) => p.hasChanges);
          if (!anyChanged) continue;

          // Send consolidated email
          const { subject, html } = dailyDigestEmail({ pages: pageResults });
          await sendEmail({ to: profile.email, subject, html }).catch(console.error);
          sent++;
        } catch (err) {
          Sentry.withScope((scope) => {
            scope.setUser({ id: userId });
            scope.setTag("function", "dailyScanDigest");
            Sentry.captureException(err);
          });
          console.error(`Digest failed for user ${userId}:`, err);
        }
      }

      return sent;
    });

    return { sent: results };
  }
);

/**
 * Checkpoint engine — daily 5-horizon correlation (D+7, D+14, D+30, D+60, D+90).
 *
 * Replaces the old checkCorrelations (single 7-day, one-shot).
 * Each horizon produces an immutable change_checkpoints row.
 * Status transitions follow the decision-horizon model:
 * - D+7/D+14: early signals only
 * - D+30: first canonical resolution
 * - D+60/D+90: confirmation or reversal
 */
export const runCheckpoints = inngest.createFunction(
  {
    id: "run-checkpoints",
    retries: 0, // Cron pattern: no retries to prevent duplicate full runs
  },
  [
    { cron: "30 10 * * *" }, // Daily 10:30 UTC — after daily scans, before digest
    { event: "checkpoints/run" }, // Backup trigger from Vercel Cron self-heal
  ],
  async ({ step }) => {
    const supabase = createServiceClient();
    const now = new Date();

    // Step 1: Find all eligible changes with their existing checkpoints.
    // No date cutoff — getEligibleHorizons returns [] for fully-computed changes,
    // so older changes with missing horizons still get catch-up processing.
    // Paginated in batches to bound memory as table grows.
    const eligible = await step.run("find-eligible", async () => {
      type ChangeRow = {
        id: string; page_id: string; user_id: string; element: string;
        element_type: string; scope: string; before_value: string; after_value: string;
        description: string; first_detected_at: string; first_detected_analysis_id: string;
        status: string; correlation_metrics: unknown; observation_text: string;
        hypothesis: string | null;
        pages: { url: string; metric_focus: string | null };
      };
      const allChanges: ChangeRow[] = [];
      const PAGE_SIZE = 500;
      let offset = 0;

      while (true) {
        const { data: batch, error } = await supabase
          .from("detected_changes")
          .select(`
            id, page_id, user_id, element, element_type, scope,
            before_value, after_value, description, first_detected_at,
            first_detected_analysis_id, status, correlation_metrics,
            observation_text, hypothesis,
            pages!inner(url, metric_focus)
          `)
          .in("status", ["watching", "validated", "regressed", "inconclusive"])
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error("Failed to fetch changes for checkpoints:", error);
          throw new Error(`Failed to fetch changes for checkpoints: ${error.message}`);
        }
        if (batch?.length) allChanges.push(...(batch as unknown as ChangeRow[]));
        if ((batch?.length ?? 0) < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      if (!allChanges.length) return [];

      // Get existing checkpoints in batches (Supabase IN has practical limits)
      const changeIds = allChanges.map((c) => c.id);
      const existingByChange = new Map<string, number[]>();

      for (let i = 0; i < changeIds.length; i += 300) {
        const idBatch = changeIds.slice(i, i + 300);
        const { data: existingCheckpoints, error: existingError } = await supabase
          .from("change_checkpoints")
          .select("change_id, horizon_days")
          .in("change_id", idBatch);

        if (existingError) {
          console.error("Failed to fetch existing checkpoints:", existingError);
          throw new Error(`Failed to fetch existing checkpoints: ${existingError.message}`);
        }

        for (const cp of existingCheckpoints || []) {
          const arr = existingByChange.get(cp.change_id) || [];
          arr.push(cp.horizon_days);
          existingByChange.set(cp.change_id, arr);
        }
      }

      // Determine which horizons are due for each change
      const result: Array<{
        change: ChangeRow;
        pageUrl: string;
        pageFocus: string | null;
        dueHorizons: HorizonDays[];
      }> = [];

      for (const change of allChanges) {
        const changeDate = new Date(change.first_detected_at);
        const existing = existingByChange.get(change.id) || [];
        const dueHorizons = getEligibleHorizons(changeDate, now, existing);

        if (dueHorizons.length > 0) {
          const page = change.pages as unknown as { url: string; metric_focus: string | null };
          result.push({ change, pageUrl: page.url, pageFocus: page.metric_focus, dueHorizons });
        }
      }

      return result;
    });

    if (eligible.length === 0) {
      return { processed: 0, reason: "no checkpoints due" };
    }

    // Group by user_id
    const byUser = new Map<string, typeof eligible>();
    for (const item of eligible) {
      const arr = byUser.get(item.change.user_id) || [];
      arr.push(item);
      byUser.set(item.change.user_id, arr);
    }

    // Step 2: Process each user's changes
    const allResults: Array<{ userId: string; checkpoints: number; transitions: number; errors: number }> = [];
    const newlyValidated: Array<{
      userId: string;
      changeId: string;
      element: string;
      beforeValue: string;
      afterValue: string;
      firstDetectedAt: string;
      analysisId: string;
      pageUrl: string;
      topMetric: { name: string; change_percent: number } | null;
    }> = [];

    for (const [userId, userItems] of byUser) {
      const userResult = await step.run(`process-user-${userId}`, async () => {
        let checkpointsWritten = 0;
        let transitionsApplied = 0;
        let errors = 0;

        // Fetch analytics credentials ONCE per user
        const { data: posthogIntegration } = await supabase
          .from("integrations")
          .select("access_token, provider_account_id, metadata")
          .eq("user_id", userId)
          .eq("provider", "posthog")
          .maybeSingle();

        const { data: ga4Integration } = await supabase
          .from("integrations")
          .select("id, access_token, metadata")
          .eq("user_id", userId)
          .eq("provider", "ga4")
          .maybeSingle();

        let provider: Awaited<ReturnType<typeof createProvider>> | null = null;
        let providerName = "none";

        // Wrap provider init in try/catch — a bad decrypt or stale token shouldn't
        // abort all checkpoint work for this user (changes still get inconclusive checkpoints)
        try {
          if (posthogIntegration) {
            providerName = "posthog";
            provider = await createProvider("posthog", {
              apiKey: safeDecrypt(posthogIntegration.access_token),
              projectId: posthogIntegration.provider_account_id,
              host: posthogIntegration.metadata?.host,
            });
          } else if (ga4Integration?.metadata?.property_id) {
            providerName = "ga4";
            provider = await createProvider("ga4", {
              accessToken: safeDecrypt(ga4Integration.access_token),
              refreshToken: safeDecrypt(ga4Integration.metadata.refresh_token),
              tokenExpiresAt: ga4Integration.metadata.token_expires_at,
              propertyId: ga4Integration.metadata.property_id,
              integrationId: ga4Integration.id,
            }, { supabase });
          }
        } catch (providerErr) {
          console.error(`Failed to init analytics provider for user ${userId}:`, providerErr);
          Sentry.withScope((scope) => {
            scope.setUser({ id: userId });
            scope.setTag("function", "runCheckpoints");
            scope.setTag("provider", providerName || "unknown");
            Sentry.captureException(providerErr);
          });
          // Reset — don't tag checkpoints with a provider that failed to initialize
          provider = null;
          providerName = "none";
        }

        // Fetch Supabase integration for DB-based metrics
        let supabaseAdapter: SupabaseAdapter | null = null;
        try {
          const { data: supabaseIntegration } = await supabase
            .from("integrations")
            .select("access_token, metadata")
            .eq("user_id", userId)
            .eq("provider", "supabase")
            .maybeSingle();

          if (supabaseIntegration) {
            supabaseAdapter = createSupabaseAdapter(
              supabaseIntegration.metadata.project_url,
              safeDecrypt(supabaseIntegration.access_token),
              supabaseIntegration.metadata.key_type || "anon"
            );
          }
        } catch (adapterErr) {
          console.warn(`Failed to init Supabase adapter for user ${userId}:`, adapterErr);
        }

        // Map by changeId to only notify on final status (avoids sending "validated"
        // email for a change that later regresses in a higher horizon within the same run)
        const validatedByChange = new Map<string, typeof newlyValidated[0]>();

        for (const { change, pageUrl, pageFocus, dueHorizons } of userItems) {
          try {
            // Get existing checkpoints + user feedback for transition logic + LLM context
            const [{ data: existingCps, error: existingCpsError }, { data: feedbackRows }] = await Promise.all([
              supabase
                .from("change_checkpoints")
                .select("id, horizon_days, assessment, reasoning")
                .eq("change_id", change.id),
              supabase
                .from("outcome_feedback")
                .select("feedback_type, feedback_text, checkpoint_id")
                .eq("change_id", change.id)
                .eq("user_id", change.user_id),
            ]);

            if (existingCpsError) {
              console.error(`Failed to fetch existing checkpoints for change ${change.id}:`, existingCpsError);
              errors++;
              continue;
            }

            const existingCheckpoints = (existingCps || []).map((cp) => ({
              id: cp.id,
              horizon_days: cp.horizon_days,
              assessment: cp.assessment as CheckpointAssessment,
              reasoning: cp.reasoning as string | undefined,
            }));

            // Build prior feedback context for LLM
            const priorFeedback = (feedbackRows || []).map(f => {
              const cp = existingCheckpoints.find(c => c.id === f.checkpoint_id);
              return cp ? {
                horizon_days: cp.horizon_days,
                feedback_type: f.feedback_type as "accurate" | "inaccurate",
                feedback_text: f.feedback_text,
                assessment: cp.assessment,
              } : null;
            }).filter((f): f is NonNullable<typeof f> => f !== null);

            for (const horizonDays of dueHorizons) {
              const changeDate = new Date(change.first_detected_at);
              const windows = computeWindows(changeDate, horizonDays);

              let assessment: CheckpointAssessment = "inconclusive";
              let reasoning: string | null = null;
              let confidence: number | null = null;
              let metricsJson: { metrics: Array<{ name: string; source?: string; before: number; after: number; change_percent: number; assessment: "improved" | "regressed" | "neutral" }>; overall_assessment: string; reason?: string } = {
                metrics: [],
                overall_assessment: "inconclusive",
              };

              // 1. Gather PostHog/GA4 metrics
              let analyticsMetrics: Array<{ name: string; source: string; before: number; after: number; change_percent: number }> = [];
              if (provider) {
                const detectedChange: DetectedChange = {
                  id: change.id,
                  page_id: change.page_id,
                  user_id: change.user_id,
                  element: change.element,
                  element_type: change.element_type,
                  scope: change.scope as "element" | "section" | "page",
                  before_value: change.before_value,
                  after_value: change.after_value,
                  description: change.description,
                  first_detected_at: change.first_detected_at,
                  status: change.status as DetectedChange["status"],
                  created_at: change.first_detected_at,
                  updated_at: change.first_detected_at,
                };

                const result = await correlateChange(detectedChange, provider, pageUrl, {
                  beforeStart: windows.beforeStart,
                  beforeEnd: windows.beforeEnd,
                  afterStart: windows.afterStart,
                  afterEnd: windows.afterEnd,
                });

                metricsJson = result.metrics;
                analyticsMetrics = result.metrics.metrics.map(m => ({ ...m, source: providerName }));
              }

              // 2. Gather Supabase DB metrics
              let supabaseMetrics: Array<{ name: string; source: string; before: number; after: number; change_percent: number }> = [];
              if (supabaseAdapter) {
                supabaseMetrics = await gatherSupabaseMetrics(supabaseAdapter, supabase, userId, windows);
              }

              // 3. Enrich metricsJson with Supabase data (before assessment so fallback sees all data)
              const SIGNIFICANCE_THRESHOLD = 5;
              if (supabaseMetrics.length > 0) {
                metricsJson.metrics = [
                  ...(metricsJson.metrics || []),
                  ...supabaseMetrics.map(m => ({
                    name: m.name,
                    source: "supabase",
                    before: m.before,
                    after: m.after,
                    change_percent: m.change_percent,
                    assessment: (Math.abs(m.change_percent) <= SIGNIFICANCE_THRESHOLD
                      ? "neutral"
                      : m.change_percent > 0 ? "improved" : "regressed") as "improved" | "regressed" | "neutral",
                  })),
                ];
              }

              // If no provider and no supabase data, mark reason
              if (!provider && supabaseMetrics.length === 0) {
                metricsJson = {
                  metrics: [],
                  overall_assessment: "inconclusive",
                  reason: "analytics_disconnected",
                };
              }

              // 4. Combine all metrics for LLM context
              const allMetrics = [...analyticsMetrics, ...supabaseMetrics];
              const dataSources = [
                ...(provider ? [providerName] : []),
                ...(supabaseMetrics.length > 0 ? ["supabase"] : []),
              ];

              // 5. LLM assessment (3 attempts, then deterministic fallback)
              const llmResult = await runCheckpointAssessment({
                change: {
                  element: change.element,
                  before_value: change.before_value,
                  after_value: change.after_value,
                  description: change.description,
                },
                horizonDays,
                metrics: allMetrics,
                priorCheckpoints: existingCheckpoints.map(cp => ({
                  horizon_days: cp.horizon_days,
                  assessment: cp.assessment,
                })),
                hypothesis: change.hypothesis,
                pageFocus: pageFocus,
                pageUrl,
                priorFeedback: priorFeedback.length > 0 ? priorFeedback : undefined,
              });

              if (llmResult) {
                assessment = llmResult.assessment;
                confidence = llmResult.confidence;
                reasoning = llmResult.reasoning;
              } else {
                // Deterministic fallback — uses all metrics (PostHog/GA4 + Supabase)
                const assessed = assessCheckpoint(metricsJson.metrics || []);
                assessment = assessed.assessment;
                // Synthesize reasoning so every checkpoint has an explanation
                const metricCount = metricsJson.metrics?.length ?? 0;
                const improved = metricsJson.metrics?.filter(m => m.assessment === "improved").length ?? 0;
                const regressed = metricsJson.metrics?.filter(m => m.assessment === "regressed").length ?? 0;
                reasoning = metricCount === 0
                  ? `Deterministic fallback: no metric data available. Assessment: ${assessment}.`
                  : `Deterministic fallback (LLM unavailable): ${metricCount} metrics assessed — ${improved} improved, ${regressed} regressed. Assessment: ${assessment}.`;
                confidence = metricCount === 0 ? 0 : 0.3; // Low confidence for deterministic
              }

              // Sync overall_assessment with final assessment (P3 fix: avoid internal inconsistency)
              metricsJson.overall_assessment = assessment;

              // Determine effective provider — reflect Supabase when it's the only data source
              const effectiveProvider = provider ? providerName
                : supabaseMetrics.length > 0 ? "supabase"
                : "none";

              // INSERT checkpoint (upsert with ON CONFLICT DO NOTHING for idempotency)
              const { data: upsertedRows, error: insertError } = await supabase
                .from("change_checkpoints")
                .upsert(
                  {
                    change_id: change.id,
                    horizon_days: horizonDays,
                    window_before_start: windows.beforeStart.toISOString(),
                    window_before_end: windows.beforeEnd.toISOString(),
                    window_after_start: windows.afterStart.toISOString(),
                    window_after_end: windows.afterEnd.toISOString(),
                    metrics_json: metricsJson,
                    assessment,
                    confidence,
                    reasoning,
                    data_sources: dataSources,
                    provider: effectiveProvider,
                    computed_at: now.toISOString(),
                  },
                  { onConflict: "change_id,horizon_days", ignoreDuplicates: true }
                )
                .select("id");

              if (insertError) {
                console.error(`Failed to insert checkpoint for change ${change.id} D+${horizonDays}:`, insertError);
                errors++;
                continue;
              }

              // ignoreDuplicates returns empty array when row already existed — skip transition logic
              if (!upsertedRows?.length) {
                existingCheckpoints.push({ id: "", horizon_days: horizonDays, assessment, reasoning: reasoning ?? undefined });
                continue;
              }

              checkpointsWritten++;

              // Check for status transition
              const { data: currentChange, error: currentChangeError } = await supabase
                .from("detected_changes")
                .select("status, correlation_metrics, correlation_unlocked_at")
                .eq("id", change.id)
                .maybeSingle();

              if (currentChangeError || !currentChange) {
                console.error(`Failed to fetch current status for change ${change.id}:`, currentChangeError);
                errors++;
                continue;
              }

              const currentStatus = currentChange.status as DetectedChange["status"];
              const transition = resolveStatusTransition(
                currentStatus,
                horizonDays,
                assessment,
                existingCheckpoints
              );

              if (transition) {
                const topMetric = metricsJson.metrics.find(
                  (m) => m.assessment === "improved" || m.assessment === "regressed"
                ) || null;
                const transitionAt = new Date().toISOString();

                const { data: updatedRows, error: statusError } = await supabase
                  .from("detected_changes")
                  .update({
                    status: transition.newStatus,
                    correlation_metrics: metricsJson,
                    correlation_unlocked_at: transitionAt,
                    updated_at: transitionAt,
                  })
                  .eq("id", change.id)
                  .eq("status", currentStatus)
                  .select("id");

                if (statusError) {
                  console.error(`Failed to update status for change ${change.id}:`, statusError);
                  errors++;
                  continue; // Don't record lifecycle event or send notification for failed mutation
                }
                if (!updatedRows?.length) {
                  console.warn(
                    `[checkpoint-concurrency] Skipped status transition for change ${change.id}: status changed concurrently`
                  );
                  continue;
                }

                // Insert lifecycle event — required audit evidence for the status change.
                // If this fails, revert the status update to maintain the invariant
                // that every status mutation has a lifecycle record.
                const { error: lifecycleError } = await supabase.from("change_lifecycle_events").insert({
                  change_id: change.id,
                  from_status: currentStatus,
                  to_status: transition.newStatus,
                  reason: transition.reason,
                  actor_type: "system",
                  checkpoint_id: upsertedRows[0].id,
                });

                if (lifecycleError) {
                  console.error(`Failed to insert lifecycle event for change ${change.id}, reverting status:`, lifecycleError);
                  // Revert the full status update — restore status, correlation_metrics,
                  // and correlation_unlocked_at to pre-transition values
                  const { data: revertedRows, error: rollbackError } = await supabase
                    .from("detected_changes")
                    .update({
                      status: currentStatus,
                      correlation_metrics: currentChange.correlation_metrics ?? null,
                      correlation_unlocked_at: currentChange.correlation_unlocked_at ?? null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", change.id)
                    .eq("status", transition.newStatus)
                    .select("id");
                  if (rollbackError || !revertedRows?.length) {
                    console.error(`Failed to rollback status for change ${change.id}:`, rollbackError);
                    Sentry.captureMessage("Checkpoint lifecycle rollback failed", {
                      level: "error",
                      tags: { function: "runCheckpoints", changeId: change.id },
                    });
                  }
                  errors++;
                  continue; // Skip notification — transition didn't complete cleanly
                }

                // Generate observation if none exists
                if (!change.observation_text) {
                  const observation = formatCheckpointObservation(
                    change.element,
                    new Date(change.first_detected_at),
                    horizonDays,
                    topMetric ? { name: topMetric.name, change_percent: topMetric.change_percent } : null,
                    assessment
                  );
                  const { error: obsError } = await supabase
                    .from("detected_changes")
                    .update({ observation_text: observation })
                    .eq("id", change.id);

                  if (obsError) {
                    console.error(`Failed to update observation for change ${change.id}:`, obsError);
                  }
                }

                transitionsApplied++;

                // Collect for notification
                // Only keep final status per change (avoids sending "validated"
                // email for a change that later regresses in a higher horizon)
                if (transition.newStatus === "validated") {
                  validatedByChange.set(change.id, {
                    userId,
                    changeId: change.id,
                    element: change.element,
                    beforeValue: change.before_value,
                    afterValue: change.after_value,
                    firstDetectedAt: change.first_detected_at,
                    analysisId: change.first_detected_analysis_id || change.id,
                    pageUrl,
                    topMetric: topMetric ? { name: topMetric.name, change_percent: topMetric.change_percent } : null,
                  });
                } else {
                  // Status changed away from validated — cancel pending notification
                  validatedByChange.delete(change.id);
                }

                // Update local status for subsequent horizon processing
                (change as { status: string }).status = transition.newStatus;
              }

              // Track for subsequent horizon logic within same run
              existingCheckpoints.push({ id: upsertedRows[0].id, horizon_days: horizonDays, assessment, reasoning: reasoning ?? undefined });
            }
          } catch (err) {
            Sentry.withScope((scope) => {
              scope.setUser({ id: userId });
              scope.setTag("function", "runCheckpoints");
              scope.setTag("changeId", change.id);
              Sentry.captureException(err, { extra: { pageId: change.page_id } });
            });
            await Sentry.flush(2000);
            console.error(`Checkpoint failed for change ${change.id}:`, err);
            errors++;
          }
        }

        return { checkpointsWritten, transitionsApplied, errors, validated: [...validatedByChange.values()] };
      });

      allResults.push({
        userId,
        checkpoints: userResult.checkpointsWritten,
        transitions: userResult.transitionsApplied,
        errors: userResult.errors,
      });
      newlyValidated.push(...userResult.validated);
    }

    // Step 3: Send notifications for newly validated changes
    if (newlyValidated.length > 0) {
      await step.run("send-notifications", async () => {
        for (const item of newlyValidated) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, email_notifications")
              .eq("id", item.userId)
              .single();

            if (!profile?.email || !profile.email_notifications) continue;

            const { subject, html } = correlationUnlockedEmail({
              pageUrl: item.pageUrl,
              analysisId: item.analysisId,
              changeId: item.changeId,
              change: {
                element: item.element,
                before: item.beforeValue,
                after: item.afterValue,
                changedAt: new Date(item.firstDetectedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              },
              metric: item.topMetric
                ? {
                    friendlyName: friendlyMetricNames[item.topMetric.name] || item.topMetric.name,
                    change: `${item.topMetric.change_percent > 0 ? "+" : ""}${item.topMetric.change_percent}%`,
                  }
                : { friendlyName: "metrics", change: "improved" },
            });

            sendEmail({ to: profile.email, subject, html }).catch(console.error);
          } catch (err) {
            console.error(`Failed to send notification for change ${item.changeId}:`, err);
          }
        }
      });
    }

    // Step 4: Recompose progress + generate strategy narrative on affected pages
    const affectedPageIds = [...new Set(eligible.map((e) => e.change.page_id))];
    if (affectedPageIds.length > 0 && allResults.some((r) => r.checkpoints > 0 || r.transitions > 0)) {
      await step.run("recompose-and-narrate", async () => {
        const { data: pageAnalyses } = await supabase
          .from("pages")
          .select("id, url, last_scan_id, metric_focus")
          .in("id", affectedPageIds)
          .not("last_scan_id", "is", null);

        if (!pageAnalyses?.length) return;

        for (const page of pageAnalyses) {
          try {
            const { data: analysis } = await supabase
              .from("analyses")
              .select("changes_summary")
              .eq("id", page.last_scan_id)
              .single();

            if (!analysis?.changes_summary) continue;

            // 1. Recompose canonical progress (existing logic)
            const canonical = await composeProgressFromCanonicalState(page.id, supabase);
            if (!canonical) continue;

            // 2. Build checkpoint timeline for strategy narrative
            const { data: pageChanges } = await supabase
              .from("detected_changes")
              .select("id, element, status, first_detected_at, hypothesis")
              .eq("page_id", page.id)
              .in("status", ["watching", "validated", "regressed", "inconclusive"])
              .limit(20);

            let strategyResult: Awaited<ReturnType<typeof runStrategyNarrative>> = null;

            if (pageChanges?.length) {
              const changeIds = pageChanges.map((c) => c.id);
              const { data: checkpoints } = await supabase
                .from("change_checkpoints")
                .select("change_id, horizon_days, assessment, metrics_json")
                .in("change_id", changeIds)
                .order("horizon_days", { ascending: true });

              if (checkpoints?.length) {
                const merged = pageChanges.flatMap((c) => {
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

                const timeline = formatCheckpointTimeline(merged);

                // 3. Run strategy LLM (non-fatal)
                if (timeline) {
                  try {
                    const hypotheses = pageChanges
                      .filter((c) => c.hypothesis)
                      .map((c) => ({ changeId: c.id, element: c.element, hypothesis: c.hypothesis! }));

                    const currentSummary = analysis.changes_summary as ChangesSummary;
                    strategyResult = await runStrategyNarrative({
                      pageUrl: page.url,
                      pageFocus: page.metric_focus,
                      checkpointTimeline: timeline,
                      currentRunningSummary: currentSummary.running_summary,
                      changeHypotheses: hypotheses.length ? hypotheses : null,
                    });
                  } catch (narrativeErr) {
                    console.warn(`[strategy] LLM narrative failed for page ${page.id}:`, narrativeErr);
                    Sentry.captureMessage("Strategy narrative failed in checkpoint job", {
                      level: "warning",
                      tags: { function: "runCheckpoints", pageId: page.id },
                    });
                  }
                }
              }
            }

            // 4. Build updated summary
            const currentSummary = analysis.changes_summary as ChangesSummary;
            const updatedSummary: ChangesSummary = {
              ...currentSummary,
              progress: {
                ...currentSummary.progress,
                validated: canonical.validated,
                watching: canonical.watching,
                validatedItems: canonical.validatedItems,
                watchingItems: canonical.watchingItems,
              },
            };

            // Merge strategy narrative if available (only overwrite with non-empty values)
            if (strategyResult) {
              if (strategyResult.strategy_narrative) {
                updatedSummary.strategy_narrative = strategyResult.strategy_narrative;
              }
              if (strategyResult.running_summary) {
                updatedSummary.running_summary = strategyResult.running_summary;
              }

              // Update observation_text on individual changes (validate changeIds)
              if (strategyResult.observations?.length && pageChanges?.length) {
                const validIds = new Set(pageChanges.map((c) => c.id));
                for (const obs of strategyResult.observations) {
                  if (obs.changeId && validIds.has(obs.changeId) && obs.text) {
                    await supabase
                      .from("detected_changes")
                      .update({ observation_text: obs.text.slice(0, 2000), updated_at: new Date().toISOString() })
                      .eq("id", obs.changeId);
                  }
                }
              }
            }

            await supabase
              .from("analyses")
              .update({ changes_summary: updatedSummary })
              .eq("id", page.last_scan_id);
          } catch (err) {
            console.error(`[recompose-narrate] Failed for page ${page.id}:`, err);
          }
        }
      });
    }

    const totalCheckpoints = allResults.reduce((s, r) => s + r.checkpoints, 0);
    const totalTransitions = allResults.reduce((s, r) => s + r.transitions, 0);
    const totalErrors = allResults.reduce((s, r) => s + r.errors, 0);

    return {
      processed: eligible.length,
      checkpoints: totalCheckpoints,
      transitions: totalTransitions,
      notifications: newlyValidated.length,
      errors: totalErrors,
    };
  }
);

/**
 * Screenshot service health check — pings every 30 minutes.
 * Sentry alert fires if the service is unreachable.
 */
export const screenshotHealthCheck = inngest.createFunction(
  {
    id: "screenshot-health-check",
    retries: 0,
  },
  { cron: "*/30 * * * *" },
  async () => {
    const healthy = await pingScreenshotService();
    return { healthy };
  }
);
