import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { captureScreenshot, uploadScreenshot } from "@/lib/screenshot";
import { runAnalysisPipeline, runComparisonPipeline } from "@/lib/ai/pipeline";
import type { ChangesSummary } from "@/lib/ai/pipeline";

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

      // 5. If re-scan, run comparison pipeline
      if (parentAnalysisId) {
        try {
          const { data: parent } = await supabase
            .from("analyses")
            .select("structured_output, changes_summary")
            .eq("id", parentAnalysisId)
            .single();

          if (parent?.structured_output) {
            const previousRunningSummary =
              (parent.changes_summary as ChangesSummary | null)?.running_summary ?? null;

            const changesSummary = await runComparisonPipeline(
              parent.structured_output,
              structured,
              previousRunningSummary
            );

            await supabase
              .from("analyses")
              .update({ changes_summary: changesSummary })
              .eq("id", analysisId);
          }
        } catch (compErr) {
          console.error("Comparison pipeline failed (non-fatal):", compErr);
        }
      }

      // 6. Update pages.last_scan_id if this analysis belongs to a registered page
      const { data: analysis } = await supabase
        .from("analyses")
        .select("user_id")
        .eq("id", analysisId)
        .single();

      if (analysis?.user_id) {
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
