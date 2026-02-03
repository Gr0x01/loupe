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
