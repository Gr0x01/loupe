/**
 * Correlation utility for comparing metrics before/after a detected change.
 *
 * This is used by the correlation unlock cron, NOT by the LLM.
 * The cron calls this directly with the analytics provider.
 */

import type { AnalyticsProvider } from "./provider";
import type { DetectedChange, CorrelationMetrics } from "@/lib/types/analysis";

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
