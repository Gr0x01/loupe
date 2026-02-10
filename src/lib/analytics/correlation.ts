/**
 * Correlation utility for comparing metrics before/after a detected change.
 *
 * This is used by the correlation unlock cron, NOT by the LLM.
 * The cron calls this directly with the analytics provider.
 */

import type { AnalyticsProvider } from "./provider";
import type { DetectedChange, CorrelationMetrics } from "@/lib/types/analysis";
import type { PeriodComparison } from "./types";

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
 * Compares 7 days before the change vs 7 days after to determine impact.
 *
 * @param change - The detected change to correlate
 * @param provider - Analytics provider (PostHog or GA4)
 * @param pageUrl - The page URL to query metrics for
 * @returns CorrelationResult with assessment
 */
export async function correlateChange(
  change: DetectedChange,
  provider: AnalyticsProvider,
  pageUrl: string
): Promise<CorrelationResult> {
  const changeDate = new Date(change.first_detected_at);

  // Define 7-day windows around the change
  const beforeStart = new Date(changeDate);
  beforeStart.setDate(beforeStart.getDate() - 7);

  const afterEnd = new Date(changeDate);
  afterEnd.setDate(afterEnd.getDate() + 7);

  // Query all metrics in parallel
  const comparisons = await Promise.all(
    CORRELATION_METRICS.map(async (metric) => {
      try {
        return await provider.comparePeriodsAbsolute(
          metric as "pageviews" | "unique_visitors" | "bounce_rate" | "conversions",
          pageUrl,
          beforeStart,
          changeDate,
          changeDate,
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
  // Prioritize: any regression > any improvement > neutral
  let overall_assessment: "improved" | "regressed" | "neutral" = "neutral";

  const hasRegression = metricResults.some((m) => m.assessment === "regressed");
  const hasImprovement = metricResults.some((m) => m.assessment === "improved");

  if (hasRegression) {
    overall_assessment = "regressed";
  } else if (hasImprovement) {
    overall_assessment = "improved";
  }

  return {
    metrics: {
      metrics: metricResults,
      overall_assessment,
    },
  };
}

/**
 * Check if a detected change has enough data for correlation.
 * Requires 7+ days since the change was first detected.
 *
 * @param change - The detected change
 * @returns true if 7+ days have passed
 */
export function hasEnoughDataForCorrelation(change: DetectedChange): boolean {
  const changeDate = new Date(change.first_detected_at);
  const daysSinceChange = Math.floor(
    (Date.now() - changeDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysSinceChange >= 7;
}

/**
 * Calculate the number of days of data collected since a change.
 *
 * @param change - The detected change
 * @returns Number of days since first detected
 */
export function getDaysOfData(change: DetectedChange): number {
  const changeDate = new Date(change.first_detected_at);
  return Math.floor(
    (Date.now() - changeDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}
