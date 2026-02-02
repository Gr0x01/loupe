import { inngest } from "./client";
import { createServiceClient } from "@/lib/supabase/server";
import { captureScreenshot, uploadScreenshot } from "@/lib/screenshot";
import { runAnalysisPipeline } from "@/lib/ai/pipeline";

export const analyzeUrl = inngest.createFunction(
  {
    id: "analyze-url",
    retries: 2,
  },
  { event: "analysis/created" },
  async ({ event }) => {
    const { analysisId, url } = event.data as {
      analysisId: string;
      url: string;
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
