import { SupabaseClient } from "@supabase/supabase-js";
import type { CorrelationMetrics, ValidatedItem, WatchingItem } from "@/lib/types/analysis";
import { DECISION_HORIZON } from "@/lib/analytics/checkpoints";

export interface ComposedProgress {
  validated: number;
  watching: number;
  validatedItems: ValidatedItem[];
  watchingItems: WatchingItem[];
}

/** Metric key → human-friendly name */
export const friendlyMetricNames: Record<string, string> = {
  bounce_rate: "Bounce rate",
  conversion_rate: "Conversion rate",
  time_on_page: "Time on page",
  ctr: "Click-through rate",
  scroll_depth: "Scroll depth",
  form_completion: "Form completion",
  pageviews: "Pageviews",
};

/**
 * Build a friendly text string from correlation metrics and detection date.
 * e.g. "Bounce rate down 12% over 9 days"
 */
export function formatMetricFriendlyText(
  correlationMetrics: CorrelationMetrics | null | undefined,
  firstDetectedAt: string
): { metric: string; change: string; friendlyText: string } {
  if (!correlationMetrics?.metrics?.length) {
    return { metric: "", change: "", friendlyText: "Correlation confirmed" };
  }

  // Pick first non-neutral metric, fallback to first
  const topMetric =
    correlationMetrics.metrics.find((m) => m.assessment !== "neutral") ||
    correlationMetrics.metrics[0];

  const metricName = friendlyMetricNames[topMetric.name] || topMetric.name;
  const direction = topMetric.change_percent > 0 ? "up" : "down";
  const changeStr = `${topMetric.change_percent > 0 ? "+" : ""}${topMetric.change_percent}%`;
  const daysSince = Math.max(
    1,
    Math.floor((Date.now() - new Date(firstDetectedAt).getTime()) / 86400000)
  );

  return {
    metric: topMetric.name,
    change: changeStr,
    friendlyText: `${metricName} ${direction} ${Math.abs(topMetric.change_percent)}% over ${daysSince} days`,
  };
}

/**
 * Compose progress counts and items entirely from detected_changes DB state.
 * This is the canonical source of truth — replaces LLM-authored progress.
 *
 * Returns null on DB error (fail-closed: caller must not use LLM progress).
 */
export async function composeProgressFromCanonicalState(
  pageId: string,
  supabase: SupabaseClient
): Promise<ComposedProgress | null> {
  const { data: changes, error } = await supabase
    .from("detected_changes")
    .select("id, element, status, first_detected_at, correlation_metrics")
    .eq("page_id", pageId)
    .in("status", ["watching", "validated", "regressed"])
    .order("first_detected_at", { ascending: false });

  if (error) {
    console.error("[progress-composer] Failed to query detected_changes:", error);
    return null;
  }

  if (!changes?.length) {
    return { validated: 0, watching: 0, validatedItems: [], watchingItems: [] };
  }

  const validatedItems: ValidatedItem[] = [];
  const watchingItems: WatchingItem[] = [];

  for (const row of changes) {
    if (row.status === "validated" || row.status === "regressed") {
      const { metric, change, friendlyText } = formatMetricFriendlyText(
        row.correlation_metrics as CorrelationMetrics | null,
        row.first_detected_at
      );
      validatedItems.push({
        id: row.id,
        element: row.element,
        title: row.element,
        metric,
        change,
        friendlyText,
        status: row.status as "validated" | "regressed",
      });
    } else if (row.status === "watching") {
      const firstDetectedMs = new Date(row.first_detected_at).getTime();
      const daysOfData = Number.isFinite(firstDetectedMs)
        ? Math.max(0, Math.floor((Date.now() - firstDetectedMs) / 86400000))
        : 0;

      watchingItems.push({
        id: row.id,
        element: row.element,
        title: row.element,
        daysOfData,
        daysNeeded: DECISION_HORIZON,
        firstDetectedAt: row.first_detected_at,
      });
    }
  }

  return {
    validated: validatedItems.length,
    watching: watchingItems.length,
    validatedItems,
    watchingItems,
  };
}

/**
 * Fetch the last saved canonical progress from the page's latest analysis.
 * Used as fallback when live composition fails (fail-closed behavior).
 *
 * Returns the progress sub-object or null if unavailable.
 */
export async function getLastCanonicalProgress(
  pageId: string,
  supabase: SupabaseClient
): Promise<ComposedProgress | null> {
  const { data: page } = await supabase
    .from("pages")
    .select("last_scan_id")
    .eq("id", pageId)
    .single();

  if (!page?.last_scan_id) return null;

  const { data: analysis } = await supabase
    .from("analyses")
    .select("changes_summary")
    .eq("id", page.last_scan_id)
    .single();

  const progress = (analysis?.changes_summary as { progress?: ComposedProgress } | null)?.progress;
  if (!progress) return null;

  return {
    validated: progress.validated ?? 0,
    watching: progress.watching ?? 0,
    validatedItems: progress.validatedItems ?? [],
    watchingItems: progress.watchingItems ?? [],
  };
}
