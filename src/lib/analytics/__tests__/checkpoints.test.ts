import { describe, it, expect } from "vitest";
import {
  getEligibleHorizons,
  computeWindows,
  assessCheckpoint,
  resolveStatusTransition,
  formatCheckpointObservation,
} from "../checkpoints";

describe("getEligibleHorizons", () => {
  it("returns [] when change is less than 7 days old", () => {
    const changeDate = new Date("2026-02-10T12:00:00Z");
    const now = new Date("2026-02-16T12:00:00Z"); // 6 days
    expect(getEligibleHorizons(changeDate, now, [])).toEqual([]);
  });

  it("returns [7] when change is exactly 7 days old", () => {
    const changeDate = new Date("2026-02-09T12:00:00Z");
    const now = new Date("2026-02-16T12:00:00Z"); // 7 days
    expect(getEligibleHorizons(changeDate, now, [])).toEqual([7]);
  });

  it("returns [14, 30] when 30 days old with existing [7]", () => {
    const changeDate = new Date("2026-01-17T12:00:00Z");
    const now = new Date("2026-02-16T12:00:00Z"); // 30 days
    expect(getEligibleHorizons(changeDate, now, [7])).toEqual([14, 30]);
  });

  it("returns [14, 90] when 100 days old with existing [7, 30, 60]", () => {
    const changeDate = new Date("2025-11-08T12:00:00Z");
    const now = new Date("2026-02-16T12:00:00Z"); // 100 days
    expect(getEligibleHorizons(changeDate, now, [7, 30, 60])).toEqual([14, 90]);
  });

  it("returns all horizons when old enough with none existing", () => {
    const changeDate = new Date("2025-10-01T12:00:00Z");
    const now = new Date("2026-02-16T12:00:00Z"); // 138 days
    expect(getEligibleHorizons(changeDate, now, [])).toEqual([7, 14, 30, 60, 90]);
  });

  it("returns [] when all horizons already computed", () => {
    const changeDate = new Date("2025-10-01T12:00:00Z");
    const now = new Date("2026-02-16T12:00:00Z");
    expect(getEligibleHorizons(changeDate, now, [7, 14, 30, 60, 90])).toEqual([]);
  });
});

describe("computeWindows", () => {
  const changeDate = new Date("2026-02-10T14:30:00Z");

  it("truncates before window to UTC midnight", () => {
    const windows = computeWindows(changeDate, 7);
    expect(windows.beforeEnd.toISOString()).toBe("2026-02-10T00:00:00.000Z");
    expect(windows.beforeStart.toISOString()).toBe("2026-02-03T00:00:00.000Z");
  });

  it("uses actual detection time for after window start", () => {
    const windows = computeWindows(changeDate, 7);
    expect(windows.afterStart.toISOString()).toBe("2026-02-10T14:30:00.000Z");
  });

  it("computes correct after end for D+30", () => {
    const windows = computeWindows(changeDate, 30);
    expect(windows.afterEnd.toISOString()).toBe("2026-03-12T00:00:00.000Z");
  });

  it("computes correct windows for all horizons", () => {
    for (const h of [7, 14, 30, 60, 90] as const) {
      const windows = computeWindows(changeDate, h);
      // Before window duration should equal horizon days
      const beforeDurationMs = windows.beforeEnd.getTime() - windows.beforeStart.getTime();
      expect(beforeDurationMs).toBe(h * 86400000);
    }
  });
});

describe("assessCheckpoint", () => {
  it("returns inconclusive for empty metrics", () => {
    expect(assessCheckpoint([])).toEqual({ assessment: "inconclusive" });
  });

  it("returns inconclusive for undefined metrics", () => {
    expect(assessCheckpoint(undefined as never)).toEqual({ assessment: "inconclusive" });
  });

  it("prioritizes regression over improvement", () => {
    const metrics = [
      { name: "bounce_rate", before: 40, after: 50, change_percent: 25, assessment: "regressed" as const },
      { name: "pageviews", before: 100, after: 120, change_percent: 20, assessment: "improved" as const },
    ];
    expect(assessCheckpoint(metrics)).toEqual({ assessment: "regressed" });
  });

  it("returns improved when only improvements", () => {
    const metrics = [
      { name: "pageviews", before: 100, after: 120, change_percent: 20, assessment: "improved" as const },
    ];
    expect(assessCheckpoint(metrics)).toEqual({ assessment: "improved" });
  });

  it("returns neutral when all neutral", () => {
    const metrics = [
      { name: "pageviews", before: 100, after: 102, change_percent: 2, assessment: "neutral" as const },
    ];
    expect(assessCheckpoint(metrics)).toEqual({ assessment: "neutral" });
  });
});

describe("resolveStatusTransition", () => {
  it("returns null for reverted status (terminal)", () => {
    const result = resolveStatusTransition("reverted", 30, "improved", []);
    expect(result).toBeNull();
  });

  it("returns null for superseded status (terminal)", () => {
    const result = resolveStatusTransition("superseded", 30, "improved", []);
    expect(result).toBeNull();
  });

  it("returns null for D+7 (early horizon)", () => {
    const result = resolveStatusTransition("watching", 7, "improved", []);
    expect(result).toBeNull();
  });

  it("returns null for D+14 (early horizon)", () => {
    const result = resolveStatusTransition("watching", 14, "regressed", []);
    expect(result).toBeNull();
  });

  describe("D+30 (decision horizon)", () => {
    it("resolves watching to validated on improved", () => {
      const result = resolveStatusTransition("watching", 30, "improved", []);
      expect(result).toEqual({ newStatus: "validated", reason: "D+30: metrics improved" });
    });

    it("resolves watching to regressed on regressed", () => {
      const result = resolveStatusTransition("watching", 30, "regressed", []);
      expect(result).toEqual({ newStatus: "regressed", reason: "D+30: metrics regressed" });
    });

    it("resolves watching to inconclusive on neutral/inconclusive", () => {
      expect(resolveStatusTransition("watching", 30, "inconclusive", [])).toEqual({
        newStatus: "inconclusive",
        reason: "D+30: no significant change",
      });
      expect(resolveStatusTransition("watching", 30, "neutral", [])).toEqual({
        newStatus: "inconclusive",
        reason: "D+30: no significant change",
      });
    });

    it("returns null at D+30 if not currently watching", () => {
      expect(resolveStatusTransition("validated", 30, "improved", [])).toBeNull();
      expect(resolveStatusTransition("regressed", 30, "regressed", [])).toBeNull();
    });
  });

  describe("D+60 reversal", () => {
    it("reverses validated to regressed", () => {
      const result = resolveStatusTransition("validated", 60, "regressed", [
        { horizon_days: 30, assessment: "improved" },
      ]);
      expect(result).toEqual({ newStatus: "regressed", reason: "D+60: trend reversed to regression" });
    });

    it("reverses regressed to validated", () => {
      const result = resolveStatusTransition("regressed", 60, "improved", [
        { horizon_days: 30, assessment: "regressed" },
      ]);
      expect(result).toEqual({ newStatus: "validated", reason: "D+60: trend reversed to improvement" });
    });

    it("returns null when same direction (no reversal needed)", () => {
      const result = resolveStatusTransition("validated", 60, "improved", [
        { horizon_days: 30, assessment: "improved" },
      ]);
      expect(result).toBeNull();
    });

    it("returns null for inconclusive at D+60", () => {
      const result = resolveStatusTransition("validated", 60, "inconclusive", [
        { horizon_days: 30, assessment: "improved" },
      ]);
      expect(result).toBeNull();
    });
  });

  describe("D+90 reversal", () => {
    it("reverses validated to regressed at D+90", () => {
      const result = resolveStatusTransition("validated", 90, "regressed", [
        { horizon_days: 30, assessment: "improved" },
        { horizon_days: 60, assessment: "improved" },
      ]);
      expect(result).toEqual({ newStatus: "regressed", reason: "D+90: trend reversed to regression" });
    });
  });

  describe("inconclusive → clear signal", () => {
    it("transitions inconclusive to validated on improved", () => {
      const result = resolveStatusTransition("inconclusive", 60, "improved", [
        { horizon_days: 30, assessment: "inconclusive" },
      ]);
      expect(result).toEqual({ newStatus: "validated", reason: "D+60: clear signal emerged" });
    });

    it("transitions inconclusive to regressed on regressed", () => {
      const result = resolveStatusTransition("inconclusive", 90, "regressed", [
        { horizon_days: 30, assessment: "inconclusive" },
      ]);
      expect(result).toEqual({ newStatus: "regressed", reason: "D+90: clear signal emerged" });
    });

    it("returns null when inconclusive stays inconclusive", () => {
      const result = resolveStatusTransition("inconclusive", 90, "inconclusive", [
        { horizon_days: 30, assessment: "inconclusive" },
      ]);
      expect(result).toBeNull();
    });
  });
});

describe("formatCheckpointObservation", () => {
  const changeDate = new Date("2026-02-10T14:30:00Z");

  it("formats with metric data", () => {
    const result = formatCheckpointObservation(
      "Your Headline",
      changeDate,
      30,
      { name: "bounce_rate", change_percent: -12 },
      "improved"
    );
    expect(result).toContain("Your Headline");
    expect(result).toContain("Feb 10");
    expect(result).toContain("30 days");
    expect(result).toContain("bounce rate");
    expect(result).toContain("down");
    expect(result).toContain("12%");
  });

  it("formats without metric (inconclusive)", () => {
    const result = formatCheckpointObservation(
      "Your CTA",
      changeDate,
      7,
      null,
      "inconclusive"
    );
    expect(result).toContain("Your CTA");
    expect(result).toContain("7 days");
    expect(result).toContain("no significant metric movement");
  });

  it("formats with inconclusive assessment even when metric exists", () => {
    const result = formatCheckpointObservation(
      "Your CTA",
      changeDate,
      14,
      { name: "pageviews", change_percent: 2 },
      "inconclusive"
    );
    expect(result).toContain("no significant metric movement");
  });
});
