import { describe, it, expect } from "vitest";
import { formatOutcomeText } from "../attribution";

describe("formatOutcomeText", () => {
  describe("high confidence (≥0.8)", () => {
    it("says 'helped' for validated", () => {
      const result = formatOutcomeText({
        status: "validated",
        confidence: 0.85,
        metricKey: "bounce_rate",
        direction: "down",
        changePercent: 12,
      });
      expect(result).toContain("helped");
      expect(result).toContain("Bounce rate");
      expect(result).toContain("down");
      expect(result).toContain("12%");
    });

    it("says 'hurt' for regressed", () => {
      const result = formatOutcomeText({
        status: "regressed",
        confidence: 0.9,
        metricKey: "conversion_rate",
        direction: "down",
        changePercent: 8,
      });
      expect(result).toContain("hurt");
      expect(result).toContain("Conversion rate");
    });
  });

  describe("medium confidence (0.5–0.79)", () => {
    it("says 'Likely connected'", () => {
      const result = formatOutcomeText({
        status: "validated",
        confidence: 0.65,
        metricKey: "time_on_page",
        direction: "up",
        changePercent: 15,
      });
      expect(result).toContain("Since your change");
      expect(result).toContain("Likely connected");
      expect(result).toContain("Time on page");
      expect(result).toContain("up");
      expect(result).toContain("15%");
    });
  });

  describe("low confidence (<0.5)", () => {
    it("hedges appropriately", () => {
      const result = formatOutcomeText({
        status: "validated",
        confidence: 0.3,
        metricKey: "pageviews",
        direction: "up",
        changePercent: 5,
      });
      expect(result).toContain("movement");
      expect(result).toContain("can\u2019t tie it clearly");
    });
  });

  describe("no data", () => {
    it("returns null when metric missing", () => {
      const result = formatOutcomeText({
        status: "validated",
        confidence: null,
        metricKey: null,
        direction: null,
        changePercent: null,
      });
      expect(result).toBeNull();
    });

    it("returns null when changePercent is null", () => {
      const result = formatOutcomeText({
        status: "validated",
        confidence: 0.8,
        metricKey: "bounce_rate",
        direction: "down",
        changePercent: null,
      });
      expect(result).toBeNull();
    });
  });

  it("never uses 'caused' language", () => {
    const inputs = [
      { status: "validated" as const, confidence: 0.95, metricKey: "bounce_rate", direction: "down" as const, changePercent: 20 },
      { status: "regressed" as const, confidence: 0.5, metricKey: "conversion_rate", direction: "down" as const, changePercent: 10 },
      { status: "validated" as const, confidence: 0.2, metricKey: "time_on_page", direction: "up" as const, changePercent: 5 },
    ];
    for (const input of inputs) {
      const result = formatOutcomeText(input);
      expect(result).not.toBeNull();
      expect(result!.toLowerCase()).not.toContain("caused");
      expect(result!.toLowerCase()).not.toContain("because of");
    }
  });

  it("uses raw key name for unknown metric", () => {
    const result = formatOutcomeText({
      status: "validated",
      confidence: 0.85,
      metricKey: "custom_signups",
      direction: "up",
      changePercent: 50,
    });
    expect(result).toContain("custom_signups");
  });

  it("treats null confidence as 0", () => {
    const result = formatOutcomeText({
      status: "validated",
      confidence: null,
      metricKey: "bounce_rate",
      direction: "down",
      changePercent: 10,
    });
    // Should fall to low confidence band
    expect(result).toContain("can\u2019t tie it clearly");
  });

  describe("boundary confidence values", () => {
    const base = { status: "validated" as const, metricKey: "bounce_rate", direction: "down" as const, changePercent: 10 };

    it("treats confidence of exactly 0.8 as high band", () => {
      const result = formatOutcomeText({ ...base, confidence: 0.8 });
      expect(result).toContain("helped");
    });

    it("treats confidence of exactly 0.5 as medium band", () => {
      const result = formatOutcomeText({ ...base, confidence: 0.5 });
      expect(result).toContain("Likely connected");
    });

    it("treats confidence of 0.0 as low band", () => {
      const result = formatOutcomeText({ ...base, confidence: 0.0 });
      expect(result).toContain("can\u2019t tie it clearly");
    });

    it("treats confidence of 1.0 as high band", () => {
      const result = formatOutcomeText({ ...base, confidence: 1.0 });
      expect(result).toContain("helped");
    });

    it("treats confidence of 0.79 as medium band (not high)", () => {
      const result = formatOutcomeText({ ...base, confidence: 0.79 });
      expect(result).toContain("Likely connected");
    });

    it("treats confidence of 0.49 as low band (not medium)", () => {
      const result = formatOutcomeText({ ...base, confidence: 0.49 });
      expect(result).toContain("can\u2019t tie it clearly");
    });
  });
});
