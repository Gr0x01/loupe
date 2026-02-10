import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { captureScreenshot, uploadScreenshot } from "@/lib/screenshot";
import { runAnalysisPipeline, runPostAnalysisPipeline, runQuickDiff } from "@/lib/ai/pipeline";
import type { DeployContext } from "@/lib/ai/pipeline";
import { sendEmail } from "@/lib/email/resend";
import {
  changeDetectedEmail,
  allQuietEmail,
  correlationUnlockedEmail,
  dailyDigestEmail,
} from "@/lib/email/templates";
import type { ChangesSummary, ChronicleSuggestion, DetectedChange } from "@/lib/types/analysis";
import { safeDecrypt } from "@/lib/crypto";
import { getStableBaseline, isBaselineStale } from "@/lib/analysis/baseline";
import { correlateChange } from "@/lib/analytics/correlation";
import { createProvider } from "@/lib/analytics/provider";

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
  },
  { event: "analysis/created" },
  async ({ event }) => {
    const { analysisId, url, parentAnalysisId } = event.data as {
      analysisId: string;
      url: string;
      parentAnalysisId?: string;
    };
    const supabase = createServiceClient();

    // Mark as processing
    await supabase
      .from("analyses")
      .update({ status: "processing" })
      .eq("id", analysisId);

    try {
      // 1. Screenshot + metadata extraction
      const { base64, metadata } = await captureScreenshot(url);

      // 2. Upload screenshot to storage
      const screenshotUrl = await uploadScreenshot(
        supabase,
        analysisId,
        base64
      );

      // 3. Run LLM analysis with screenshot + metadata
      const { output, structured } = await runAnalysisPipeline(
        base64,
        url,
        metadata
      );

      // 4. Save results
      await supabase
        .from("analyses")
        .update({
          status: "complete",
          screenshot_url: screenshotUrl,
          output,
          structured_output: structured,
        })
        .eq("id", analysisId);

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

        if (parentAnalysisId) {
          const { data: parent } = await supabase
            .from("analyses")
            .select("structured_output, changes_summary")
            .eq("id", parentAnalysisId)
            .single();

          if (parent?.structured_output) {
            previousFindings = parent.structured_output;
            previousRunningSummary =
              (parent.changes_summary as ChangesSummary | null)?.running_summary ?? null;
          }
        }

        // Fetch deploy context if this analysis was triggered by a deploy
        let deployContext: DeployContext | null = null;
        if (analysis.deploy_id) {
          const { data: deploy } = await supabase
            .from("deploys")
            .select("commit_sha, commit_message, commit_author, commit_timestamp, changed_files")
            .eq("id", analysis.deploy_id)
            .single();

          if (deploy) {
            deployContext = {
              commitSha: deploy.commit_sha,
              commitMessage: deploy.commit_message,
              commitAuthor: deploy.commit_author,
              commitTimestamp: deploy.commit_timestamp,
              changedFiles: deploy.changed_files || [],
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
          .select("id")
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

        if (pageForFeedback) {
          const { data: watchingChanges } = await supabase
            .from("detected_changes")
            .select("id, element, before_value, after_value, scope, first_detected_at")
            .eq("page_id", pageForFeedback.id)
            .eq("status", "watching")
            .limit(20); // Cap to prevent prompt bloat

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

        // Run post-analysis if we have previous findings OR analytics OR database OR deploy context OR user feedback OR pending changes
        if (previousFindings || analyticsCredentials || databaseCredentials || deployContext || userFeedback?.length || pendingChanges?.length) {
          try {
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
              },
              {
                supabase,
                analyticsCredentials,
                databaseCredentials,
              }
            );

            // Store results - always save changes_summary when post-analysis runs
            const updateData: { changes_summary?: ChangesSummary; analytics_correlation?: ChangesSummary } = {
              changes_summary: changesSummary,
            };

            if (analyticsCredentials || databaseCredentials) {
              // Also store in analytics_correlation for dedicated access
              updateData.analytics_correlation = changesSummary;
            }

            await supabase
              .from("analyses")
              .update(updateData)
              .eq("id", analysisId);

            // Check for correlation unlock: watching item became validated
            if (parentAnalysisId && changesSummary?.progress?.validatedItems?.length) {
              const { data: parent } = await supabase
                .from("analyses")
                .select("changes_summary")
                .eq("id", parentAnalysisId)
                .single();

              const parentProgress = (parent?.changes_summary as ChangesSummary | null)?.progress;
              if (parentProgress?.watchingItems?.length) {
                // Find items that were watching and are now validated
                const newlyValidated = changesSummary.progress.validatedItems.find((v) =>
                  parentProgress.watchingItems?.some((w) => w.id === v.id)
                );

                if (newlyValidated) {
                  // Find the corresponding change
                  const relatedChange = changesSummary.changes.find(
                    (c) => c.element.toLowerCase() === newlyValidated.element.toLowerCase()
                  );

                  // Get user email
                  const { data: profile } = await supabase
                    .from("profiles")
                    .select("email, email_notifications")
                    .eq("id", analysis.user_id)
                    .single();

                  if (profile?.email && profile.email_notifications) {
                    const topSuggestion = extractTopSuggestion(changesSummary, null);
                    const { subject, html } = correlationUnlockedEmail({
                      pageUrl: url,
                      analysisId,
                      changeId: newlyValidated.id, // For dashboard deep link
                      change: {
                        element: newlyValidated.element,
                        before: relatedChange?.before ?? "",
                        after: relatedChange?.after ?? "",
                        changedAt: relatedChange?.detectedAt
                          ? new Date(relatedChange.detectedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "recently",
                      },
                      metric: {
                        friendlyName: newlyValidated.friendlyText,
                        change: newlyValidated.change,
                      },
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
            console.error("Post-analysis pipeline failed:", JSON.stringify(errorDetails, null, 2));

            // Store a minimal changes_summary so the UI knows post-analysis was attempted but failed
            // Note: Use generic error code, not raw message (to avoid leaking internal details to client)
            await supabase
              .from("analyses")
              .update({
                changes_summary: {
                  verdict: "Analysis complete. Change detection unavailable.",
                  changes: [],
                  suggestions: [],
                  correlation: null,
                  progress: { validated: 0, watching: 0, open: 0, validatedItems: [], watchingItems: [], openItems: [] },
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

          if (validRevertedIds.length > 0) {
            console.log(`Marked ${validRevertedIds.length} changes as reverted for analysis ${analysisId}`);
          }
        }

        // 7. Send email notification (for scheduled/deploy scans only)

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

      return { success: true, analysisId };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      await supabase
        .from("analyses")
        .update({ status: "failed", error_message: message })
        .eq("id", analysisId);
      throw error;
    }
  }
);

/**
 * Scheduled scan function — runs weekly on Monday 9am UTC
 * Scans all pages with scan_frequency='weekly'
 */
export const scheduledScan = inngest.createFunction(
  {
    id: "scheduled-scan",
    retries: 1,
  },
  { cron: "0 9 * * 1" }, // Monday 9am UTC
  async ({ step }) => {
    const supabase = createServiceClient();

    // Get all pages due for weekly scan
    const { data: pages, error } = await supabase
      .from("pages")
      .select("id, user_id, url, last_scan_id")
      .eq("scan_frequency", "weekly");

    if (error) {
      console.error("Failed to fetch pages for scheduled scan:", error);
      throw error;
    }

    if (!pages || pages.length === 0) {
      return { scanned: 0 };
    }

    // Create analyses for each page and trigger scans
    const results = await step.run("create-scheduled-analyses", async () => {
      const created: { pageId: string; analysisId: string }[] = [];

      for (const page of pages) {
        // Create analysis with parent chain
        const { data: newAnalysis, error: insertError } = await supabase
          .from("analyses")
          .insert({
            url: page.url,
            user_id: page.user_id,
            parent_analysis_id: page.last_scan_id,
            trigger_type: "weekly",
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
    await step.run("trigger-scans", async () => {
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
  }
);

/**
 * Daily scheduled scan — runs daily at 9am UTC
 * Scans all pages with scan_frequency='daily'
 */
export const scheduledScanDaily = inngest.createFunction(
  {
    id: "scheduled-scan-daily",
    retries: 1,
  },
  { cron: "0 9 * * *" }, // Daily 9am UTC
  async ({ step }) => {
    const supabase = createServiceClient();

    // Get all pages due for daily scan
    const { data: pages, error } = await supabase
      .from("pages")
      .select("id, user_id, url, last_scan_id")
      .eq("scan_frequency", "daily");

    if (error) {
      console.error("Failed to fetch pages for daily scan:", error);
      throw error;
    }

    if (!pages || pages.length === 0) {
      return { scanned: 0 };
    }

    // Create analyses for each page and trigger scans
    const results = await step.run("create-daily-analyses", async () => {
      const created: { pageId: string; analysisId: string }[] = [];

      for (const page of pages) {
        const { data: newAnalysis, error: insertError } = await supabase
          .from("analyses")
          .insert({
            url: page.url,
            user_id: page.user_id,
            parent_analysis_id: page.last_scan_id,
            trigger_type: "daily",
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

    // Send Inngest events for each analysis
    await step.run("trigger-daily-scans", async () => {
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

    if (pages.length === 0) {
      await supabase
        .from("deploys")
        .update({ status: "complete" })
        .eq("id", deployId);

      return { scanned: 0, message: "No pages found for user" };
    }

    // Process each page
    const results = await step.run("detect-changes", async () => {
      const processed: { pageId: string; hadChanges: boolean; usedFullAnalysis: boolean }[] = [];

      for (const page of pages) {
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

          // 3. Screenshot current page
          const { base64: currentScreenshot } = await captureScreenshot(page.url);

          // 4. Quick Haiku diff against baseline
          const diffResult = await runQuickDiff(baseline.screenshot_url, currentScreenshot);

          if (!diffResult.hasChanges || diffResult.changes.length === 0) {
            // No changes detected
            processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: false });
            continue;
          }

          // 5. Record detected changes (with dedup via unique index)
          for (const change of diffResult.changes) {
            try {
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
              });
            } catch (insertErr) {
              // Unique constraint violation = already recorded today, skip
              if (!(insertErr instanceof Error && insertErr.message.includes("duplicate"))) {
                console.error("Failed to insert detected_change:", insertErr);
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
            });
            sendEmail({ to: profile.email, subject, html }).catch(console.error);
          }

          processed.push({ pageId: page.id, hadChanges: true, usedFullAnalysis: false });
        } catch (err) {
          console.error(`Deploy detection failed for page ${page.id}:`, err);
          processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: false });
        }
      }

      return processed;
    });

    // Mark deploy complete
    await step.run("mark-complete", async () => {
      await supabase
        .from("deploys")
        .update({ status: "complete" })
        .eq("id", deployId);
    });

    const changesDetected = results.filter((r) => r.hadChanges).length;
    const fullAnalysisRun = results.filter((r) => r.usedFullAnalysis).length;

    return {
      scanned: results.length,
      changesDetected,
      fullAnalysisRun,
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
          console.error(`Digest failed for user ${userId}:`, err);
        }
      }

      return sent;
    });

    return { sent: results };
  }
);

/**
 * Correlation unlock cron — checks watching changes every 6 hours.
 *
 * For each watching change with 7+ days of data:
 * 1. Get user's analytics provider
 * 2. Query analytics with absolute date windows
 * 3. Update status to validated/regressed/inconclusive
 * 4. Send correlation unlocked email if improved
 */
export const checkCorrelations = inngest.createFunction(
  {
    id: "check-correlations",
    retries: 1,
  },
  { cron: "0 */6 * * *" }, // Every 6 hours
  async ({ step }) => {
    const supabase = createServiceClient();

    // Find watching changes with 7+ days of data
    const readyChanges = await step.run("find-ready-changes", async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data, error } = await supabase
        .from("detected_changes")
        .select(`
          id, page_id, user_id, element, element_type, scope,
          before_value, after_value, description, first_detected_at,
          first_detected_analysis_id,
          pages!inner(url)
        `)
        .eq("status", "watching")
        .lte("first_detected_at", sevenDaysAgo.toISOString());

      if (error) {
        console.error("Failed to fetch ready changes:", error);
        return [];
      }

      return data || [];
    });

    if (readyChanges.length === 0) {
      return { processed: 0, reason: "no changes ready for correlation" };
    }

    // Group changes by user_id to avoid N+1 integration queries
    const changesByUser = new Map<string, typeof readyChanges>();
    for (const change of readyChanges) {
      const existing = changesByUser.get(change.user_id) || [];
      existing.push(change);
      changesByUser.set(change.user_id, existing);
    }

    // Process changes grouped by user
    const results = await step.run("correlate-changes", async () => {
      let validated = 0;
      let regressed = 0;
      let inconclusive = 0;

      for (const [userId, userChanges] of changesByUser) {
        // Fetch integrations ONCE per user
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

        // If no analytics connected, mark all this user's changes as inconclusive
        if (!posthogIntegration && !ga4Integration) {
          for (const change of userChanges) {
            await supabase
              .from("detected_changes")
              .update({
                status: "inconclusive",
                correlation_metrics: { reason: "analytics_disconnected" },
                updated_at: new Date().toISOString(),
              })
              .eq("id", change.id);
            inconclusive++;
          }
          continue;
        }

        // Create provider ONCE per user
        let provider;
        if (posthogIntegration) {
          provider = await createProvider("posthog", {
            apiKey: safeDecrypt(posthogIntegration.access_token),
            projectId: posthogIntegration.provider_account_id,
            host: posthogIntegration.metadata?.host,
          });
        } else if (ga4Integration?.metadata?.property_id) {
          provider = await createProvider("ga4", {
            accessToken: safeDecrypt(ga4Integration.access_token),
            refreshToken: safeDecrypt(ga4Integration.metadata.refresh_token),
            tokenExpiresAt: ga4Integration.metadata.token_expires_at,
            propertyId: ga4Integration.metadata.property_id,
            integrationId: ga4Integration.id,
          }, { supabase });
        }

        if (!provider) {
          for (const change of userChanges) {
            await supabase
              .from("detected_changes")
              .update({
                status: "inconclusive",
                correlation_metrics: { reason: "provider_creation_failed" },
                updated_at: new Date().toISOString(),
              })
              .eq("id", change.id);
            inconclusive++;
          }
          continue;
        }

        // Fetch profile ONCE per user for email notifications
        const { data: userProfile } = await supabase
          .from("profiles")
          .select("email, email_notifications")
          .eq("id", userId)
          .single();

        // Process all this user's changes with the same provider
        for (const change of userChanges) {
          try {
            // Build DetectedChange type from database record
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
              status: "watching",
              created_at: change.first_detected_at,
              updated_at: change.first_detected_at,
            };

            // Run correlation
            const pageUrl = (change.pages as unknown as { url: string }).url;
            const result = await correlateChange(detectedChange, provider, pageUrl);

            // Update status
            const newStatus = result.metrics.overall_assessment === "improved"
              ? "validated"
              : result.metrics.overall_assessment === "regressed"
              ? "regressed"
              : "inconclusive";

            await supabase
              .from("detected_changes")
              .update({
                status: newStatus,
                correlation_metrics: result.metrics,
                correlation_unlocked_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", change.id);

            if (newStatus === "validated") validated++;
            else if (newStatus === "regressed") regressed++;
            else inconclusive++;

            // Send email if significant improvement
            if (result.metrics.overall_assessment === "improved") {
              if (userProfile?.email && userProfile.email_notifications) {
                // Get the primary improved metric
                const improvedMetric = result.metrics.metrics.find(
                  (m) => m.assessment === "improved"
                );

                const { subject, html } = correlationUnlockedEmail({
                  pageUrl,
                  analysisId: change.first_detected_analysis_id || change.id,
                  changeId: change.id, // For dashboard deep link
                  change: {
                    element: change.element,
                    before: change.before_value,
                    after: change.after_value,
                    changedAt: new Date(change.first_detected_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    }),
                  },
                  metric: improvedMetric
                    ? {
                        friendlyName: improvedMetric.name,
                        change: `${improvedMetric.change_percent > 0 ? "+" : ""}${improvedMetric.change_percent}%`,
                      }
                    : {
                        friendlyName: "metrics",
                        change: "improved",
                      },
                });

                sendEmail({ to: userProfile.email, subject, html }).catch(console.error);
              }
            }
          } catch (err) {
            console.error(`Correlation check failed for change ${change.id}:`, err);
            // Don't update status — will retry next cron run
          }
        }
      }

      return { validated, regressed, inconclusive };
    });

    return {
      processed: readyChanges.length,
      ...results,
    };
  }
);
