import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { resyncInngest } from "@/lib/inngest/resync";
import {
  getEffectiveTier,
  getAllowedScanFrequency,
  getPageLimit,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/permissions";

/**
 * Vercel Cron for daily scans — runs at 9:15 UTC (backup) and 12:00 UTC (watchdog).
 *
 * 1. Re-syncs Inngest FIRST to fix stale registrations from deploys
 * 2. Creates missing daily scans with per-page idempotency
 * 3. Recovers orphaned pending analyses from earlier failed runs
 * 4. Reports to Sentry when self-healing kicks in
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

  // Re-sync Inngest FIRST — fix stale registrations before we try to send events
  await resyncInngest();

  const supabase = createServiceClient();

  try {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    // Get all non-manual pages (same as Inngest cron — enforce tier at runtime)
    const { data: allPages, error } = await supabase
      .from("pages")
      .select("id, user_id, url, last_scan_id, created_at, scan_frequency")
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

    // Filter to daily-frequency pages: tier must allow daily AND page not set to weekly
    const userPageCounts = new Map<string, number>();
    const pages = allPages
      .filter((page) => {
        const tier = tierMap.get(page.user_id);
        if (!tier) return false;
        return getAllowedScanFrequency(tier) === "daily" && page.scan_frequency !== "weekly";
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

    // Create analyses and trigger Inngest events (per-page idempotency)
    const triggered: { id: string; url: string }[] = [];
    const sendFailed: { id: string; url: string }[] = [];
    let alreadyExisted = 0;

    for (const page of pages) {
      // Idempotency: skip if already exists for this URL + user + today
      const { count } = await supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("url", page.url)
        .eq("user_id", page.user_id)
        .eq("trigger_type", "daily")
        .gte("created_at", todayStart.toISOString());

      if (count && count > 0) {
        alreadyExisted++;
        continue;
      }

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
        try {
          await inngest.send({
            name: "analysis/created",
            data: {
              analysisId: newAnalysis.id,
              url: page.url,
              parentAnalysisId: page.last_scan_id || undefined,
            },
          });
          triggered.push({ id: newAnalysis.id, url: page.url });
        } catch (sendErr) {
          sendFailed.push({ id: newAnalysis.id, url: page.url });
          Sentry.captureException(sendErr, {
            tags: { function: "vercel-cron-daily-scans", step: "inngest-send" },
            extra: { analysisId: newAnalysis.id, url: page.url },
          });
        }
      }
    }

    // Recover orphaned pending analyses from earlier failed runs (>2h old)
    const recovered = await recoverStaleScans(supabase);

    // Report self-healing to Sentry
    const selfHealed = triggered.length > 0 || recovered > 0;
    if (selfHealed || sendFailed.length > 0) {
      Sentry.captureMessage("Daily scan cron: Vercel backup self-healed", {
        level: "warning",
        tags: { function: "vercel-cron-daily-scans" },
        extra: { backfilled: triggered.length, alreadyExisted, sendFailed: sendFailed.length, recovered },
      });
    }

    Sentry.captureCheckIn({ checkInId, monitorSlug: "daily-scans-cron", status: "ok" });
    await Sentry.flush(2000);

    return NextResponse.json({
      status: selfHealed ? "self-healed" : "ok",
      message: selfHealed
        ? `Backfilled ${triggered.length} scans (${alreadyExisted} existed, ${recovered} recovered, ${sendFailed.length} send failures)`
        : `All ${alreadyExisted} daily scans already existed`,
      selfHealed,
      triggered,
      sendFailed,
      recovered,
    });
  } catch (err) {
    Sentry.captureCheckIn({ checkInId, monitorSlug: "daily-scans-cron", status: "error" });
    Sentry.captureException(err, { tags: { function: "vercel-cron-daily-scans" } });
    await Sentry.flush(2000);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Compute the recovery window for stale pending analyses.
 * Lookback: 48h (catches cross-midnight failures). Staleness: >2h old (not still processing).
 */
export function getRecoveryWindow(now: Date = new Date()): { lookbackStart: Date; staleThreshold: Date } {
  return {
    lookbackStart: new Date(now.getTime() - 48 * 60 * 60 * 1000),
    staleThreshold: new Date(now.getTime() - 2 * 60 * 60 * 1000),
  };
}

/**
 * Recover orphaned pending analyses — created by a previous cron run but never
 * picked up by Inngest (e.g. inngest.send() failed or Inngest was stale).
 * Re-sends their Inngest events so they get processed.
 */
async function recoverStaleScans(supabase: ReturnType<typeof createServiceClient>): Promise<number> {
  try {
    const { lookbackStart, staleThreshold: twoHoursAgo } = getRecoveryWindow();

    const { data: stale } = await supabase
      .from("analyses")
      .select("id, url, parent_analysis_id")
      .eq("status", "pending")
      .in("trigger_type", ["daily", "weekly"])
      .gte("created_at", lookbackStart.toISOString())
      .lte("created_at", twoHoursAgo.toISOString());

    if (!stale?.length) return 0;

    let recovered = 0;
    for (const analysis of stale) {
      try {
        await inngest.send({
          name: "analysis/created",
          data: {
            analysisId: analysis.id,
            url: analysis.url,
            parentAnalysisId: analysis.parent_analysis_id || undefined,
          },
        });
        recovered++;
      } catch (err) {
        Sentry.captureException(err, {
          tags: { function: "recoverStaleScans", step: "inngest-send" },
          extra: { analysisId: analysis.id, url: analysis.url },
        });
      }
    }

    return recovered;
  } catch (err) {
    Sentry.captureException(err, {
      tags: { function: "recoverStaleScans", step: "query" },
    });
    return 0;
  }
}

