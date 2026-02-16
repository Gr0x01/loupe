import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

/**
 * Vercel Cron backup for daily scans — runs at 9:15 UTC, 15 min after Inngest cron.
 *
 * 1. Checks if Inngest already created today's daily scans
 * 2. If not, creates them and triggers Inngest events (self-healing)
 * 3. Reports to Sentry when self-healing kicks in (so we know Inngest failed)
 * 4. Re-syncs Inngest app registration to prevent future drift
 */
export async function GET(req: NextRequest) {
  // Vercel Cron sends this header
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  // Check if Inngest already ran today's daily scans
  const { count: existingCount } = await supabase
    .from("analyses")
    .select("id", { count: "exact", head: true })
    .eq("trigger_type", "daily")
    .gte("created_at", todayStart.toISOString());

  if (existingCount && existingCount > 0) {
    // Inngest did its job — just re-sync to prevent future drift
    await resyncInngest();
    return NextResponse.json({
      status: "ok",
      message: `Inngest ran normally — ${existingCount} daily scans already exist`,
      selfHealed: false,
    });
  }

  // Inngest missed today's scans — self-heal
  Sentry.captureMessage("Daily scan cron missed by Inngest — Vercel backup self-healing", {
    level: "warning",
    tags: { function: "vercel-cron-daily-scans" },
  });

  // Get all daily pages
  const { data: pages, error } = await supabase
    .from("pages")
    .select("id, user_id, url, last_scan_id")
    .eq("scan_frequency", "daily");

  if (error || !pages?.length) {
    await Sentry.flush(2000);
    return NextResponse.json({
      status: "no-pages",
      message: "No daily pages found",
      selfHealed: false,
    });
  }

  // Create analyses and trigger Inngest events
  const triggered: { id: string; url: string }[] = [];

  for (const page of pages) {
    // Idempotency: skip if already exists for this URL + user + today
    const { count } = await supabase
      .from("analyses")
      .select("id", { count: "exact", head: true })
      .eq("url", page.url)
      .eq("user_id", page.user_id)
      .eq("trigger_type", "daily")
      .gte("created_at", todayStart.toISOString());

    if (count && count > 0) continue;

    const { data: newAnalysis } = await supabase
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

    if (newAnalysis) {
      await inngest.send({
        name: "analysis/created",
        data: {
          analysisId: newAnalysis.id,
          url: page.url,
          parentAnalysisId: page.last_scan_id || undefined,
        },
      });
      triggered.push({ id: newAnalysis.id, url: page.url });
    }
  }

  // Re-sync Inngest to prevent future drift
  await resyncInngest();

  await Sentry.flush(2000);

  return NextResponse.json({
    status: "self-healed",
    message: `Inngest missed daily scans — triggered ${triggered.length} scans`,
    selfHealed: true,
    triggered,
  });
}

/**
 * PUT to the Inngest serve endpoint to re-register functions.
 * Prevents cron registrations from going stale after deploys.
 */
async function resyncInngest() {
  try {
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NEXT_PUBLIC_SITE_URL || "https://getloupe.io";

    await fetch(`${baseUrl}/api/inngest`, {
      method: "PUT",
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    // Non-fatal — log but don't fail the cron
    console.error("Inngest re-sync failed:", err);
  }
}
