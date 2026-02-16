import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { getEligibleHorizons } from "@/lib/analytics/checkpoints";

/**
 * Vercel Cron backup for checkpoint engine — runs at 10:45 UTC, 15 min after Inngest cron.
 *
 * Checks if any horizons are still due (not just "did Inngest run at all").
 * This catches both full misses AND partial failures where Inngest wrote some
 * checkpoints but crashed before finishing.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();

  // Fetch non-reverted changes that are at least 7 days old
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const { data: candidates, error: candidatesError } = await supabase
    .from("detected_changes")
    .select("id, first_detected_at")
    .in("status", ["watching", "validated", "regressed", "inconclusive"])
    .lte("first_detected_at", sevenDaysAgo.toISOString());

  if (candidatesError) {
    Sentry.captureException(candidatesError, {
      tags: { function: "vercel-cron-checkpoints" },
      extra: { step: "fetch-candidates" },
    });
    await Sentry.flush(2000);
    return NextResponse.json(
      { error: "Failed to fetch checkpoint candidates" },
      { status: 500 }
    );
  }

  if (!candidates?.length) {
    await resyncInngest();
    return NextResponse.json({
      status: "ok",
      message: "No eligible changes for checkpoints",
      selfHealed: false,
    });
  }

  // Check which candidates actually have due horizons (missing checkpoints)
  const candidateIds = candidates.map((c) => c.id);
  const existingByChange = new Map<string, number[]>();

  // Batch checkpoint lookups (Supabase IN has practical limits)
  for (let i = 0; i < candidateIds.length; i += 300) {
    const batch = candidateIds.slice(i, i + 300);
    const { data: existingCps, error: existingError } = await supabase
      .from("change_checkpoints")
      .select("change_id, horizon_days")
      .in("change_id", batch);

    if (existingError) {
      Sentry.captureException(existingError, {
        tags: { function: "vercel-cron-checkpoints" },
        extra: { step: "fetch-existing-checkpoints", batchSize: batch.length },
      });
      await Sentry.flush(2000);
      return NextResponse.json(
        { error: "Failed to fetch existing checkpoints" },
        { status: 500 }
      );
    }

    for (const cp of existingCps || []) {
      const arr = existingByChange.get(cp.change_id) || [];
      arr.push(cp.horizon_days);
      existingByChange.set(cp.change_id, arr);
    }
  }

  let dueCount = 0;
  for (const c of candidates) {
    const existing = existingByChange.get(c.id) || [];
    const due = getEligibleHorizons(new Date(c.first_detected_at), now, existing);
    if (due.length > 0) dueCount++;
  }

  if (dueCount === 0) {
    // All eligible changes have their due horizons computed
    await resyncInngest();
    return NextResponse.json({
      status: "ok",
      message: `No horizons due (${candidates.length} changes checked, all up to date)`,
      selfHealed: false,
    });
  }

  // Due horizons remain — self-heal
  Sentry.captureMessage("Checkpoint cron: due horizons remain — Vercel backup self-healing", {
    level: "warning",
    tags: { function: "vercel-cron-checkpoints" },
    extra: { dueCount, candidatesChecked: candidates.length },
  });

  await inngest.send({ name: "checkpoints/run" });

  await resyncInngest();
  await Sentry.flush(2000);

  return NextResponse.json({
    status: "self-healed",
    message: `Triggered checkpoint run (${dueCount} changes with due horizons)`,
    selfHealed: true,
  });
}

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
    console.error("Inngest re-sync failed:", err);
  }
}
