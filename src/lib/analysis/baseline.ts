/**
 * Baseline selection utility for deploy scanning.
 *
 * The stable baseline is used as the comparison point for lightweight deploy
 * detection. It should be a recent, complete daily/weekly scan that represents
 * the "known good" state of the page.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export interface StableBaseline {
  id: string;
  screenshot_url: string;
  mobile_screenshot_url: string | null;
  created_at: Date;
  trigger_type: string;
}

/**
 * Get the stable baseline for a page.
 *
 * Priority order:
 * 1. pages.stable_baseline_id (explicit baseline set after daily/weekly scan)
 * 2. Last daily/weekly scan that completed successfully
 * 3. Most recent complete analysis that's at least 24h old
 * 4. null (first scan, no baseline available)
 *
 * @param supabase - Supabase client (service role)
 * @param pageId - The page ID to get baseline for
 * @returns The stable baseline analysis, or null if none available
 */
export async function getStableBaseline(
  supabase: SupabaseClient,
  pageId: string
): Promise<StableBaseline | null> {
  // Priority 1: Check pages.stable_baseline_id
  const { data: page } = await supabase
    .from("pages")
    .select("stable_baseline_id, url, user_id")
    .eq("id", pageId)
    .single();

  if (!page) {
    return null;
  }

  if (page.stable_baseline_id) {
    const { data: baseline } = await supabase
      .from("analyses")
      .select("id, screenshot_url, mobile_screenshot_url, created_at, trigger_type")
      .eq("id", page.stable_baseline_id)
      .eq("status", "complete")
      .single();

    if (baseline?.screenshot_url) {
      return {
        id: baseline.id,
        screenshot_url: baseline.screenshot_url,
        mobile_screenshot_url: baseline.mobile_screenshot_url ?? null,
        created_at: new Date(baseline.created_at),
        trigger_type: baseline.trigger_type,
      };
    }
  }

  // Priority 2: Last daily/weekly scan
  const { data: scheduledScan } = await supabase
    .from("analyses")
    .select("id, screenshot_url, mobile_screenshot_url, created_at, trigger_type")
    .eq("url", page.url)
    .eq("user_id", page.user_id)
    .eq("status", "complete")
    .in("trigger_type", ["daily", "weekly"])
    .not("screenshot_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (scheduledScan?.screenshot_url) {
    return {
      id: scheduledScan.id,
      screenshot_url: scheduledScan.screenshot_url,
      mobile_screenshot_url: scheduledScan.mobile_screenshot_url ?? null,
      created_at: new Date(scheduledScan.created_at),
      trigger_type: scheduledScan.trigger_type,
    };
  }

  // Priority 3: Most recent complete analysis that's at least 24h old
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const { data: oldAnalysis } = await supabase
    .from("analyses")
    .select("id, screenshot_url, mobile_screenshot_url, created_at, trigger_type")
    .eq("url", page.url)
    .eq("user_id", page.user_id)
    .eq("status", "complete")
    .not("screenshot_url", "is", null)
    .lte("created_at", twentyFourHoursAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (oldAnalysis?.screenshot_url) {
    return {
      id: oldAnalysis.id,
      screenshot_url: oldAnalysis.screenshot_url,
      mobile_screenshot_url: oldAnalysis.mobile_screenshot_url ?? null,
      created_at: new Date(oldAnalysis.created_at),
      trigger_type: oldAnalysis.trigger_type || "manual",
    };
  }

  // Priority 4: No baseline available
  return null;
}

/**
 * Check if a baseline is stale (too old to be useful for quick diff).
 * Stale baselines should trigger a full analysis instead of quick diff.
 *
 * @param baseline - The baseline to check
 * @param maxAgeDays - Maximum age in days (default: 14)
 * @returns true if baseline is stale or null
 */
export function isBaselineStale(
  baseline: StableBaseline | null,
  maxAgeDays: number = 14
): boolean {
  if (!baseline) {
    return true;
  }

  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const age = Date.now() - baseline.created_at.getTime();

  return age > maxAgeMs;
}

