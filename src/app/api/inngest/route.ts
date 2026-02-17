import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import { analyzeUrl, scheduledScan, scheduledScanDaily, deployDetected, dailyScanDigest, runCheckpoints, screenshotHealthCheck, onboardingNudge } from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [analyzeUrl, scheduledScan, scheduledScanDaily, deployDetected, dailyScanDigest, runCheckpoints, screenshotHealthCheck, onboardingNudge],
});
