/**
 * Correlation utility for comparing metrics before/after a detected change.
 *
 * This is used by the correlation unlock cron, NOT by the LLM.
 * The cron calls this directly with the analytics provider.
 */

import type { AnalyticsProvider } from "./provider";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DetectedChange, CorrelationMetrics } from "@/lib/types/analysis";
import type { SupabaseAdapter } from "./supabase-adapter";
import type { CheckpointWindows } from "./checkpoints";

export interface CorrelationResult {
  metrics: CorrelationMetrics;
  // overall_assessment is available via metrics.overall_assessment
}

// Metrics to check for correlation
const CORRELATION_METRICS = [
  "bounce_rate",
  "pageviews",
  "unique_visitors",
] as const;

/**
 * Correlate a detected change with analytics data.
 *
 * By default compares 7 days before/after the change. Pass `windows` to override
 * with custom date ranges (used by the checkpoint engine for longer horizons).
 *
 * @param change - The detected change to correlate
 * @param provider - Analytics provider (PostHog or GA4)
 * @param pageUrl - The page URL to query metrics for
 * @param windows - Optional custom date windows (overrides default 7-day calculation)
 * @returns CorrelationResult with assessment
 */
export async function correlateChange(
  change: DetectedChange,
  provider: AnalyticsProvider,
  pageUrl: string,
  windows?: { beforeStart: Date; beforeEnd: Date; afterStart: Date; afterEnd: Date }
): Promise<CorrelationResult> {
  const changeDate = new Date(change.first_detected_at);

  // Use provided windows or default to 7-day windows
  const DAY_MS = 86400000;
  const beforeStart = windows?.beforeStart ?? new Date(changeDate.getTime() - 7 * DAY_MS);
  const beforeEnd = windows?.beforeEnd ?? changeDate;
  const afterStart = windows?.afterStart ?? changeDate;
  const afterEnd = windows?.afterEnd ?? new Date(changeDate.getTime() + 7 * DAY_MS);

  // Query all metrics in parallel
  const comparisons = await Promise.all(
    CORRELATION_METRICS.map(async (metric) => {
      try {
        return await provider.comparePeriodsAbsolute(
          metric as "pageviews" | "unique_visitors" | "bounce_rate" | "conversions",
          pageUrl,
          beforeStart,
          beforeEnd,
          afterStart,
          afterEnd
        );
      } catch (err) {
        console.error(`Failed to correlate ${metric}:`, err);
        return null;
      }
    })
  );

  // Build correlation metrics
  const metricResults: CorrelationMetrics["metrics"] = [];

  for (let i = 0; i < CORRELATION_METRICS.length; i++) {
    const comparison = comparisons[i];
    if (!comparison) continue;

    // Determine assessment based on metric type and direction
    // For bounce_rate, down is good. For others, up is good.
    let assessment: "improved" | "regressed" | "neutral";
    const significantChange = Math.abs(comparison.change_percent) > 5;

    if (!significantChange) {
      assessment = "neutral";
    } else if (comparison.metric === "bounce_rate") {
      // Lower bounce rate is better
      assessment = comparison.direction === "down" ? "improved" : "regressed";
    } else {
      // Higher pageviews/visitors is better
      assessment = comparison.direction === "up" ? "improved" : "regressed";
    }

    metricResults.push({
      name: comparison.metric,
      before: comparison.previous_period,
      after: comparison.current_period,
      change_percent: comparison.change_percent,
      assessment,
    });
  }

  // Determine overall assessment
  // Prioritize: inconclusive (no metrics) > any regression > any improvement > neutral
  let overall_assessment: "improved" | "regressed" | "neutral" | "inconclusive" = "inconclusive";

  if (metricResults.length > 0) {
    const hasRegression = metricResults.some((m) => m.assessment === "regressed");
    const hasImprovement = metricResults.some((m) => m.assessment === "improved");

    if (hasRegression) {
      overall_assessment = "regressed";
    } else if (hasImprovement) {
      overall_assessment = "improved";
    } else {
      overall_assessment = "neutral";
    }
  }

  return {
    metrics: {
      metrics: metricResults,
      overall_assessment,
    },
  };
}

/**
 * Gather Supabase DB metrics for checkpoint assessment.
 *
 * Compares historical snapshots (from analytics_snapshots) with current table counts
 * to produce metric deltas for conversion-relevant tables.
 *
 * Snapshot writers persist three tool_names:
 *   - `discover_tables` → { tables: [{ name, row_count, columns }], cached_at }
 *   - `get_table_count` → { count: number } (single table, table_name in tool_input)
 *   - `identify_conversion_tables` → { tables: string[] }
 *
 * We use `discover_tables` snapshots (contain row counts for all tables) as the
 * "before" baseline, and query current counts via the adapter for "after".
 *
 * For "after", we prefer the closest `discover_tables` snapshot within the after-window
 * to maintain horizon-bounded semantics. Falls back to live counts only when no
 * after-window snapshot exists (e.g., the horizon just became due).
 */
export async function gatherSupabaseMetrics(
  adapter: SupabaseAdapter,
  supabase: SupabaseClient,
  userId: string,
  windows: CheckpointWindows
): Promise<Array<{ name: string; source: string; before: number; after: number; change_percent: number }>> {
  try {
    // Find conversion-relevant tables
    const conversionTables = await adapter.identifyConversionTables();
    if (conversionTables.length === 0) return [];

    // Get "before" snapshot: closest discover_tables snapshot before the change
    const { data: beforeSnapshot } = await supabase
      .from("analytics_snapshots")
      .select("tool_output")
      .eq("user_id", userId)
      .eq("tool_name", "discover_tables")
      .lte("created_at", windows.beforeEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!beforeSnapshot?.tool_output) return [];

    // Parse historical counts from discover_tables shape:
    // { tables: [{ name, row_count, columns }], cached_at }
    const beforeOutput = beforeSnapshot.tool_output as { tables?: Array<{ name: string; row_count: number }> };
    if (!beforeOutput?.tables || !Array.isArray(beforeOutput.tables)) return [];

    const beforeCounts = new Map<string, number>();
    for (const table of beforeOutput.tables) {
      if (conversionTables.includes(table.name)) {
        beforeCounts.set(table.name, table.row_count);
      }
    }

    if (beforeCounts.size === 0) return [];

    // Get "after" counts: prefer snapshot within after-window for reproducibility,
    // fall back to live counts if no snapshot exists yet
    let afterCounts = new Map<string, number>();

    const { data: afterSnapshot } = await supabase
      .from("analytics_snapshots")
      .select("tool_output")
      .eq("user_id", userId)
      .eq("tool_name", "discover_tables")
      .gte("created_at", windows.afterStart.toISOString())
      .lte("created_at", windows.afterEnd.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (afterSnapshot?.tool_output) {
      const afterOutput = afterSnapshot.tool_output as { tables?: Array<{ name: string; row_count: number }> };
      if (afterOutput?.tables && Array.isArray(afterOutput.tables)) {
        for (const table of afterOutput.tables) {
          if (beforeCounts.has(table.name)) {
            afterCounts.set(table.name, table.row_count);
          }
        }
      }
    }

    // Fallback: live counts (when after-window snapshot doesn't exist yet)
    if (afterCounts.size === 0) {
      const liveStats = await adapter.getTableStats([...beforeCounts.keys()]);
      for (const stat of liveStats) {
        afterCounts.set(stat.table_name, stat.row_count);
      }
    }

    const metrics: Array<{ name: string; source: string; before: number; after: number; change_percent: number }> = [];

    for (const [tableName, before] of beforeCounts) {
      const after = afterCounts.get(tableName);
      if (after === undefined) continue;

      const change_percent = before === 0
        ? (after > 0 ? 100 : 0)
        : Math.round(((after - before) / before) * 1000) / 10;

      metrics.push({
        name: `${tableName}_count`,
        source: "supabase",
        before,
        after,
        change_percent,
      });
    }

    return metrics;
  } catch (err) {
    console.warn("[gatherSupabaseMetrics] Failed:", err);
    return [];
  }
}
