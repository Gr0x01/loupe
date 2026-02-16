import { friendlyMetricNames } from "@/lib/analysis/progress";

export interface OutcomeTextInput {
  /** "validated" or "regressed" */
  status: "validated" | "regressed";
  /** 0.0–1.0 confidence from LLM assessment */
  confidence: number | null | undefined;
  /** e.g. "bounce_rate" */
  metricKey?: string | null;
  /** e.g. "down" or "up" */
  direction?: "up" | "down" | null;
  /** e.g. 12 (absolute value) */
  changePercent?: number | null;
}

/**
 * Confidence-banded attribution text. Never claims causation.
 *
 * High (≥0.8):   "Your change helped — {metric} {direction} {X}%"
 * Medium (0.5–0.79): "Since your change, {metric} is {direction} {X}%. Likely connected."
 * Low (<0.5):    "We're seeing {metric} movement, but can't tie it clearly to your change yet."
 * No data:       Returns null — callers should fall through to observation_text or other copy.
 */
export function formatOutcomeText(input: OutcomeTextInput): string | null {
  const { status, confidence, metricKey, direction, changePercent } = input;

  // No metric data — return null so callers can fall through to observation_text
  if (!metricKey || changePercent == null || direction == null) {
    return null;
  }

  const metricName = friendlyMetricNames[metricKey] || metricKey;
  const pct = `${Math.abs(changePercent)}%`;
  const conf = confidence ?? 0;

  // High confidence (≥0.8)
  if (conf >= 0.8) {
    const verb = status === "regressed" ? "hurt" : "helped";
    return `Your change ${verb} \u2014 ${metricName} ${direction} ${pct}`;
  }

  // Medium confidence (0.5–0.79)
  if (conf >= 0.5) {
    return `Since your change, ${metricName} is ${direction} ${pct}. Likely connected.`;
  }

  // Low confidence (<0.5)
  return `We\u2019re seeing ${metricName} movement, but can\u2019t tie it clearly to your change yet.`;
}
