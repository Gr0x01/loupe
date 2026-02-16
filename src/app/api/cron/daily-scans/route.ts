import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import {
  getEffectiveTier,
  getAllowedScanFrequency,
  getPageLimit,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/permissions";

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

  const checkInId = Sentry.captureCheckIn({
    monitorSlug: "daily-scans-cron",
    status: "in_progress",
  });

  const supabase = createServiceClient();

  try {
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
      Sentry.captureCheckIn({ checkInId, monitorSlug: "daily-scans-cron", status: "ok" });
      await Sentry.flush(2000);
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

    // Get all non-manual pages (same as Inngest cron — enforce tier at runtime)
    const { data: allPages, error } = await supabase
      .from("pages")
      .select("id, user_id, url, last_scan_id, created_at")
      .neq("scan_frequency", "manual");

    if (error) {
      throw error;
    }

    if (!allPages?.length) {
      Sentry.captureCheckIn({ checkInId, monitorSlug: "daily-scans-cron", status: "ok" });
      await Sentry.flush(2000);
      return NextResponse.json({
        status: "no-pages",
        message: "No daily pages found",
        selfHealed: false,
      });
    }

    // Batch-fetch profiles to determine effective tier
    const userIds = [...new Set(allPages.map((p) => p.user_id))];
    const CHUNK_SIZE = 200;
    const tierMap = new Map<string, SubscriptionTier>();

    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + CHUNK_SIZE);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, subscription_tier, subscription_status, trial_ends_at")
        .in("id", chunk);

      if (profilesError) {
        Sentry.captureException(profilesError, {
          tags: { function: "vercel-cron-daily-scans" },
          extra: { chunkIndex: i, chunkSize: chunk.length },
        });
        throw profilesError;
      }

      for (const profile of profiles || []) {
        tierMap.set(
          profile.id,
          getEffectiveTier(
            (profile.subscription_tier as SubscriptionTier) || "free",
            profile.subscription_status as SubscriptionStatus | null,
            profile.trial_ends_at
          )
        );
      }
    }

    // Log users with pages but no profile row (shouldn't happen, but observable)
    const missingProfileUsers = userIds.filter((id) => !tierMap.has(id));
    if (missingProfileUsers.length > 0) {
      console.warn(`Daily cron: ${missingProfileUsers.length} user(s) have pages but no profile row — skipping their scans`);
    }

    // Filter to daily-frequency users only + enforce page limits
    const userPageCounts = new Map<string, number>();
    const pages = allPages
      .filter((page) => {
        const tier = tierMap.get(page.user_id);
        if (!tier) return false;
        return getAllowedScanFrequency(tier) === "daily";
      })
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .filter((page) => {
        const tier = tierMap.get(page.user_id)!;
        const limit = getPageLimit(tier);
        const current = userPageCounts.get(page.user_id) || 0;
        if (current >= limit) return false;
        userPageCounts.set(page.user_id, current + 1);
        return true;
      });

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

    Sentry.captureCheckIn({ checkInId, monitorSlug: "daily-scans-cron", status: "ok" });
    await Sentry.flush(2000);

    return NextResponse.json({
      status: "self-healed",
      message: `Inngest missed daily scans — triggered ${triggered.length} scans`,
      selfHealed: true,
      triggered,
    });
  } catch (err) {
    Sentry.captureCheckIn({ checkInId, monitorSlug: "daily-scans-cron", status: "error" });
    Sentry.captureException(err, { tags: { function: "vercel-cron-daily-scans" } });
    await Sentry.flush(2000);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
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
