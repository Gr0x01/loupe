import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

/**
 * TEMPORARY: Manual trigger for missed daily scans.
 * DELETE THIS FILE after use.
 */
export async function POST(req: NextRequest) {
  const { secret } = await req.json();
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(-12)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find pending daily analyses from today
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const { data: pending } = await supabase
    .from("analyses")
    .select("id, url, parent_analysis_id")
    .eq("status", "pending")
    .eq("trigger_type", "daily")
    .gte("created_at", todayStart.toISOString());

  if (!pending?.length) {
    return NextResponse.json({ triggered: 0, message: "No pending daily analyses" });
  }

  for (const analysis of pending) {
    await inngest.send({
      name: "analysis/created",
      data: {
        analysisId: analysis.id,
        url: analysis.url,
        parentAnalysisId: analysis.parent_analysis_id || undefined,
      },
    });
  }

  return NextResponse.json({
    triggered: pending.length,
    analyses: pending.map((a) => ({ id: a.id, url: a.url })),
  });
}
