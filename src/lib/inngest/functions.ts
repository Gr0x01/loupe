import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { captureScreenshot, uploadScreenshot } from "@/lib/screenshot";
import { runAnalysisPipeline, runPostAnalysisPipeline } from "@/lib/ai/pipeline";
import type { DeployContext } from "@/lib/ai/pipeline";
import { sendEmail } from "@/lib/email/resend";
import {
  changeDetectedEmail,
  allQuietEmail,
  correlationUnlockedEmail,
  weeklyDigestEmail,
} from "@/lib/email/templates";
import type { ChangesSummary, ChronicleSuggestion } from "@/lib/types/analysis";

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
            apiKey: posthogIntegration.access_token,
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
              accessToken: ga4Integration.access_token,
              refreshToken: ga4Integration.metadata.refresh_token,
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
            accessToken: supabaseIntegration.access_token,
            keyType: supabaseIntegration.metadata.key_type || "anon",
          };
        }

        // Run post-analysis if we have previous findings OR analytics OR database OR deploy context
        if (previousFindings || analyticsCredentials || databaseCredentials || deployContext) {
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
              },
              {
                supabase,
                analyticsCredentials,
                databaseCredentials,
              }
            );

            // Store results
            const updateData: { changes_summary?: ChangesSummary; analytics_correlation?: ChangesSummary } = {};

            if (previousFindings) {
              updateData.changes_summary = changesSummary;
            }

            if (analyticsCredentials || databaseCredentials) {
              // Also store in analytics_correlation for dedicated access
              updateData.analytics_correlation = changesSummary;
            }

            if (Object.keys(updateData).length > 0) {
              await supabase
                .from("analyses")
                .update(updateData)
                .eq("id", analysisId);
            }

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
            console.error("Post-analysis pipeline failed (non-fatal):", postAnalysisErr);
          }
        }

        // 6. Update pages.last_scan_id
        await supabase
          .from("pages")
          .update({ last_scan_id: analysisId })
          .eq("user_id", analysis.user_id)
          .eq("url", url);

        // 7. Send email notification (for scheduled/deploy scans only)
        const { data: fullAnalysis } = await supabase
          .from("analyses")
          .select("trigger_type, deploy_id, changes_summary, structured_output")
          .eq("id", analysisId)
          .single();

        const triggerType = fullAnalysis?.trigger_type;
        if (triggerType && triggerType !== "manual") {
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
                  triggerType: triggerType as "daily" | "weekly" | "deploy",
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
 * Waits for Vercel deploy, then scans all pages linked to the repo
 */
export const deployDetected = inngest.createFunction(
  {
    id: "deploy-detected",
    retries: 2,
  },
  { event: "deploy/detected" },
  async ({ event, step }) => {
    const { deployId, repoId, userId } = event.data as {
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

    // Find all pages for this user (free tier = 1 domain, all pages deploy from same repo)
    const pages = await step.run("find-pages", async () => {
      const { data } = await supabase
        .from("pages")
        .select("id, url, last_scan_id")
        .eq("user_id", userId);

      return data || [];
    });

    if (pages.length === 0) {
      // No pages linked to this repo yet
      await supabase
        .from("deploys")
        .update({ status: "complete" })
        .eq("id", deployId);

      return { scanned: 0, message: "No pages found for user" };
    }

    // Create analyses for each page
    const results = await step.run("create-deploy-analyses", async () => {
      const created: { pageId: string; analysisId: string }[] = [];

      for (const page of pages) {
        const { data: newAnalysis, error: insertError } = await supabase
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

        if (insertError || !newAnalysis) {
          console.error(`Failed to create analysis for page ${page.id}:`, insertError);
          continue;
        }

        created.push({ pageId: page.id, analysisId: newAnalysis.id });
      }

      return created;
    });

    // Trigger scans
    await step.run("trigger-deploy-scans", async () => {
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

    // Mark deploy complete
    await step.run("mark-complete", async () => {
      await supabase
        .from("deploys")
        .update({ status: "complete" })
        .eq("id", deployId);
    });

    return { scanned: results.length, deployId };
  }
);

/**
 * Weekly digest — sends summary email to users with 3+ monitored pages
 * Runs Monday 10am UTC (1 hour after scheduled scans)
 */
export const weeklyDigest = inngest.createFunction(
  {
    id: "weekly-digest",
    retries: 1,
  },
  { cron: "0 10 * * 1" }, // Monday 10am UTC
  async ({ step }) => {
    const supabase = createServiceClient();

    // Find users with 3+ pages who have email notifications enabled
    const eligibleUsers = await step.run("find-eligible-users", async () => {
      const { data: users } = await supabase
        .from("profiles")
        .select("id, email, email_notifications")
        .eq("email_notifications", true)
        .not("email", "is", null);

      if (!users) return [];

      // Filter to users with 3+ pages
      const usersWithPageCounts = await Promise.all(
        users.map(async (user) => {
          const { count } = await supabase
            .from("pages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);
          return { ...user, pageCount: count ?? 0 };
        })
      );

      return usersWithPageCounts.filter((u) => u.pageCount >= 3);
    });

    if (eligibleUsers.length === 0) {
      return { sent: 0 };
    }

    // Send digest to each eligible user
    const results = await step.run("send-digests", async () => {
      let sent = 0;

      for (const user of eligibleUsers) {
        // Get all pages for this user with their latest scan status
        const { data: pages } = await supabase
          .from("pages")
          .select(`
            id,
            url,
            last_scan_id
          `)
          .eq("user_id", user.id);

        if (!pages || pages.length === 0) continue;

        // Get latest analysis for each page
        const pageStatuses: Array<{
          url: string;
          domain: string;
          status: "changed" | "stable" | "suggestion";
          changesCount?: number;
          helped?: boolean;
          suggestionTitle?: string;
        }> = [];

        for (const page of pages) {
          if (!page.last_scan_id) {
            pageStatuses.push({
              url: page.url,
              domain: new URL(page.url).hostname,
              status: "stable",
            });
            continue;
          }

          const { data: analysis } = await supabase
            .from("analyses")
            .select("changes_summary, structured_output")
            .eq("id", page.last_scan_id)
            .single();

          const changesSummary = analysis?.changes_summary as ChangesSummary | null;
          const structuredOutput = analysis?.structured_output as { findings?: Array<{ title: string }> } | null;

          if (changesSummary?.changes?.length) {
            // Has changes
            const hasImproved = changesSummary.correlation?.metrics?.some(
              (m) => m.assessment === "improved"
            );
            pageStatuses.push({
              url: page.url,
              domain: new URL(page.url).hostname,
              status: "changed",
              changesCount: changesSummary.changes.length,
              helped: hasImproved,
            });
          } else if (changesSummary?.suggestions?.length) {
            // Has suggestions
            pageStatuses.push({
              url: page.url,
              domain: new URL(page.url).hostname,
              status: "suggestion",
              suggestionTitle: changesSummary.suggestions[0]?.title,
            });
          } else if (structuredOutput?.findings?.length) {
            // Initial audit with findings
            pageStatuses.push({
              url: page.url,
              domain: new URL(page.url).hostname,
              status: "suggestion",
              suggestionTitle: structuredOutput.findings[0]?.title,
            });
          } else {
            pageStatuses.push({
              url: page.url,
              domain: new URL(page.url).hostname,
              status: "stable",
            });
          }
        }

        // Send the digest email
        const { subject, html } = weeklyDigestEmail({ pages: pageStatuses });
        await sendEmail({ to: user.email!, subject, html }).catch(console.error);
        sent++;
      }

      return sent;
    });

    return { sent: results };
  }
);
