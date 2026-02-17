/**
 * Checkpoint Engine — Pure deterministic logic for 5-horizon correlation.
 *
 * No side effects, no DB, no Inngest. Unit-testable.
 *
 * Horizons: D+7, D+14, D+30, D+60, D+90
 * - D+7, D+14: Early signals only (no status change)
 * - D+30: Decision horizon (first canonical resolution)
 * - D+60, D+90: Confirmation or reversal
 */

import type {
  DetectedChangeStatus,
  StatusTransition,
  CorrelationMetrics,
  HorizonDays,
  CheckpointAssessment,
} from "@/lib/types/analysis";

export const HORIZONS: readonly HorizonDays[] = [7, 14, 30, 60, 90] as const;
export const SIGNIFICANCE_THRESHOLD = 5; // abs(change_percent) > 5%
export const DECISION_HORIZON: HorizonDays = 30;

export interface CheckpointWindows {
  beforeStart: Date;
  beforeEnd: Date;
  afterStart: Date;
  afterEnd: Date;
}

/**
 * Determine which horizons are due for a change, excluding already-computed ones.
 */
export function getEligibleHorizons(
  changeDate: Date,
  now: Date,
  existingHorizonDays: number[]
): HorizonDays[] {
  const daysSinceChange = Math.floor(
    (now.getTime() - changeDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  const existing = new Set(existingHorizonDays);

  return HORIZONS.filter(
    (h) => daysSinceChange >= h && !existing.has(h)
  );
}

/**
 * Compute before/after windows for a given horizon.
 *
 * Before window: [changeDate_midnight - horizonDays, changeDate_midnight)
 *   Uses UTC midnight truncation — clean daily boundaries for analytics queries.
 *
 * After window: [changeDate_actual, changeDate_midnight + horizonDays)
 *   Starts at the actual detection timestamp (not midnight) to avoid counting
 *   same-day pre-change traffic as post-change data.
 */
export function computeWindows(
  changeDate: Date,
  horizonDays: HorizonDays
): CheckpointWindows {
  // Truncate to UTC midnight for clean daily boundaries
  const midnight = new Date(changeDate);
  midnight.setUTCHours(0, 0, 0, 0);

  const beforeStart = new Date(midnight);
  beforeStart.setUTCDate(beforeStart.getUTCDate() - horizonDays);

  const afterEnd = new Date(midnight);
  afterEnd.setUTCDate(afterEnd.getUTCDate() + horizonDays);

  return {
    beforeStart,
    beforeEnd: new Date(midnight), // exclusive: up to midnight of change day
    afterStart: new Date(changeDate), // inclusive: actual detection time, not midnight
    afterEnd, // exclusive
  };
}

/**
 * Assess a checkpoint from metric results (deterministic fallback).
 *
 * Primary assessment is now handled by `runCheckpointAssessment()` (LLM-based, Phase 4).
 * This function serves as the fallback when the LLM call fails.
 * Same priority as correlateChange: any regression > any improvement > neutral.
 */
export function assessCheckpoint(
  metricResults: CorrelationMetrics["metrics"]
): { assessment: CheckpointAssessment } {
  if (!metricResults || metricResults.length === 0) {
    return { assessment: "inconclusive" };
  }

  const hasRegression = metricResults.some((m) => m.assessment === "regressed");
  const hasImprovement = metricResults.some((m) => m.assessment === "improved");

  if (hasRegression) return { assessment: "regressed" };
  if (hasImprovement) return { assessment: "improved" };
  return { assessment: "neutral" };
}

/**
 * Determine if a status transition should occur based on the checkpoint.
 *
 * Rules:
 * - `reverted` is terminal → no transition.
 * - D+7, D+14 → early signal only, no status change.
 * - D+30 (decision horizon): First canonical resolution from `watching`.
 * - D+60, D+90: Can confirm or reverse prior resolution.
 */
export function resolveStatusTransition(
  currentStatus: DetectedChangeStatus,
  horizonDays: HorizonDays,
  assessment: CheckpointAssessment,
  // Reserved for future: trend-over-time logic (e.g., require 2+ consecutive disagreements to reverse)
  _existingCheckpoints: Array<{ horizon_days: number; assessment: CheckpointAssessment }>
): StatusTransition | null {
  // Terminal statuses — no more transitions
  if (currentStatus === "reverted" || currentStatus === "superseded") return null;

  // Early horizons — signal only, no status change.
  // NOTE: RFC revision (Feb 2026) allows D+7/D+14 resolution with strong evidence,
  // but this is intentionally deferred. Enabling it requires confidence-gated logic
  // (e.g., only resolve if LLM confidence > 0.8). Tracked as future work.
  if (horizonDays < DECISION_HORIZON) return null;

  // D+30: Decision horizon — first canonical resolution
  if (horizonDays === DECISION_HORIZON) {
    if (currentStatus !== "watching") return null; // Only resolve from watching

    if (assessment === "improved") {
      return { newStatus: "validated", reason: `D+${horizonDays}: metrics improved` };
    }
    if (assessment === "regressed") {
      return { newStatus: "regressed", reason: `D+${horizonDays}: metrics regressed` };
    }
    return { newStatus: "inconclusive", reason: `D+${horizonDays}: no significant change` };
  }

  // D+60, D+90: Confirmation or reversal
  if (assessment === "inconclusive" || assessment === "neutral") return null;

  // Only reverse if trend meaningfully changed
  if (currentStatus === "validated" && assessment === "regressed") {
    return { newStatus: "regressed", reason: `D+${horizonDays}: trend reversed to regression` };
  }
  if (currentStatus === "regressed" && assessment === "improved") {
    return { newStatus: "validated", reason: `D+${horizonDays}: trend reversed to improvement` };
  }
  if (currentStatus === "inconclusive" && (assessment === "improved" || assessment === "regressed")) {
    const newStatus = assessment === "improved" ? "validated" : "regressed";
    return { newStatus, reason: `D+${horizonDays}: clear signal emerged` };
  }

  return null; // Same direction as before — no change needed
}

/**
 * Generate a human-readable observation for a checkpoint.
 */
export function formatCheckpointObservation(
  element: string,
  changeDate: Date,
  horizonDays: HorizonDays,
  topMetric: { name: string; change_percent: number } | null,
  assessment: CheckpointAssessment
): string {
  const dateStr = changeDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  if (!topMetric || assessment === "inconclusive") {
    return `${element} changed on ${dateStr}. At ${horizonDays} days: no significant metric movement.`;
  }

  const direction = topMetric.change_percent > 0 ? "up" : "down";
  const metricName = topMetric.name.replace(/_/g, " ");

  return `${element} changed on ${dateStr}. At ${horizonDays} days: ${metricName} ${direction} ${Math.abs(topMetric.change_percent)}%.`;
}
