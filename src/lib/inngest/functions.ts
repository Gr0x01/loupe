import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { captureScreenshot, uploadScreenshot } from "@/lib/screenshot";
import { runAnalysisPipeline, runPostAnalysisPipeline } from "@/lib/ai/pipeline";
import type { ChangesSummary, DeployContext } from "@/lib/ai/pipeline";

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

        // Check for PostHog integration
        let analyticsCredentials = null;
        const { data: posthogIntegration } = await supabase
          .from("integrations")
          .select("access_token, provider_account_id, metadata")
          .eq("user_id", analysis.user_id)
          .eq("provider", "posthog")
          .maybeSingle();

        if (posthogIntegration) {
          analyticsCredentials = {
            apiKey: posthogIntegration.access_token,
            projectId: posthogIntegration.provider_account_id,
            host: posthogIntegration.metadata?.host,
          };
        }

        // Run post-analysis if we have previous findings OR analytics OR deploy context
        if (previousFindings || analyticsCredentials || deployContext) {
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
              }
            );

            // Store results
            const updateData: { changes_summary?: ChangesSummary; analytics_correlation?: ChangesSummary } = {};

            if (previousFindings) {
              updateData.changes_summary = changesSummary;
            }

            if (analyticsCredentials) {
              // Also store in analytics_correlation for dedicated access
              updateData.analytics_correlation = changesSummary;
            }

            if (Object.keys(updateData).length > 0) {
              await supabase
                .from("analyses")
                .update(updateData)
                .eq("id", analysisId);
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
