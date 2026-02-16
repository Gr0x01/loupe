import { describe, it, expect } from "vitest";
import { formatMetricFriendlyText, friendlyMetricNames } from "../progress";
import type { CorrelationMetrics } from "@/lib/types/analysis";

/** Helper to build CorrelationMetrics with just metrics array (overall_assessment unused by this fn) */
function cm(metrics: CorrelationMetrics["metrics"]): CorrelationMetrics {
  return { metrics, overall_assessment: "improved" };
}

describe("formatMetricFriendlyText", () => {
  it("returns friendly text for improved metric", () => {
    const result = formatMetricFriendlyText(
      cm([{ name: "bounce_rate", before: 50, after: 38, change_percent: -12, assessment: "improved" }]),
      "2026-02-07T12:00:00Z"
    );
    expect(result.friendlyText).toContain("Bounce rate");
    expect(result.friendlyText).toContain("down");
    expect(result.friendlyText).toContain("12%");
    expect(result.friendlyText).toMatch(/over \d+ days$/);
    expect(result.metric).toBe("bounce_rate");
    expect(result.change).toBe("-12%");
  });

  it("returns 'Correlation confirmed' for null metrics", () => {
    const result = formatMetricFriendlyText(null, "2026-02-07T12:00:00Z");
    expect(result.friendlyText).toBe("Correlation confirmed");
    expect(result.metric).toBe("");
    expect(result.change).toBe("");
  });

  it("returns 'Correlation confirmed' for empty metrics array", () => {
    const result = formatMetricFriendlyText(cm([]), "2026-02-07T12:00:00Z");
    expect(result.friendlyText).toBe("Correlation confirmed");
  });

  it("picks first non-neutral metric", () => {
    const result = formatMetricFriendlyText(
      cm([
        { name: "pageviews", before: 100, after: 102, change_percent: 2, assessment: "neutral" },
        { name: "bounce_rate", before: 50, after: 42, change_percent: -16, assessment: "improved" },
      ]),
      "2026-02-01T12:00:00Z"
    );
    expect(result.metric).toBe("bounce_rate");
    expect(result.friendlyText).toContain("Bounce rate");
  });

  it("falls back to first metric when all neutral", () => {
    const result = formatMetricFriendlyText(
      cm([{ name: "pageviews", before: 100, after: 102, change_percent: 2, assessment: "neutral" }]),
      "2026-02-01T12:00:00Z"
    );
    expect(result.metric).toBe("pageviews");
  });

  it("uses friendly name from mapping for known keys", () => {
    for (const [key, friendly] of Object.entries(friendlyMetricNames)) {
      const result = formatMetricFriendlyText(
        cm([{ name: key, before: 100, after: 110, change_percent: 10, assessment: "improved" }]),
        "2026-02-01T12:00:00Z"
      );
      expect(result.friendlyText).toContain(friendly);
    }
  });

  it("uses raw key name for unknown metric", () => {
    const result = formatMetricFriendlyText(
      cm([{ name: "custom_signups", before: 10, after: 15, change_percent: 50, assessment: "improved" }]),
      "2026-02-01T12:00:00Z"
    );
    expect(result.friendlyText).toContain("custom_signups");
  });

  it("shows 'up' for positive change", () => {
    const result = formatMetricFriendlyText(
      cm([{ name: "pageviews", before: 100, after: 120, change_percent: 20, assessment: "improved" }]),
      "2026-02-01T12:00:00Z"
    );
    expect(result.friendlyText).toContain("up");
    expect(result.friendlyText).toContain("20%");
  });
});
