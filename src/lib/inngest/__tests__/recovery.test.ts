import { describe, it, expect } from "vitest";
import { getRecoveryWindow } from "@/app/api/cron/daily-scans/route";

/**
 * Tests for the stale scan recovery window semantics.
 *
 * recoverStaleScans() looks for pending analyses:
 *   - created_at >= lookbackStart (48h ago)
 *   - created_at <= staleThreshold (2h ago)
 *   - trigger_type in ('daily', 'weekly')
 *   - status = 'pending'
 *
 * These tests validate the production getRecoveryWindow() function
 * and the resulting boundary conditions.
 */

function isInRecoveryWindow(createdAt: Date, now: Date): boolean {
  const { lookbackStart, staleThreshold } = getRecoveryWindow(now);
  return createdAt >= lookbackStart && createdAt <= staleThreshold;
}

describe("stale scan recovery window", () => {
  // Fixed "now" at Feb 17, 2026 12:00 UTC (noon watchdog run)
  const now = new Date("2026-02-17T12:00:00Z");

  it("recovers analyses from 3 hours ago (same day, clearly stale)", () => {
    const createdAt = new Date("2026-02-17T09:00:00Z"); // 3h ago
    expect(isInRecoveryWindow(createdAt, now)).toBe(true);
  });

  it("does NOT recover analyses from 1 hour ago (still processing)", () => {
    const createdAt = new Date("2026-02-17T11:00:00Z"); // 1h ago
    expect(isInRecoveryWindow(createdAt, now)).toBe(false);
  });

  it("recovers analyses from yesterday (cross-midnight)", () => {
    const createdAt = new Date("2026-02-16T09:15:00Z"); // yesterday 9:15 UTC
    expect(isInRecoveryWindow(createdAt, now)).toBe(true);
  });

  it("recovers analyses from 47 hours ago (near lookback boundary)", () => {
    const createdAt = new Date("2026-02-15T13:00:00Z"); // 47h ago
    expect(isInRecoveryWindow(createdAt, now)).toBe(true);
  });

  it("does NOT recover analyses from 49 hours ago (beyond lookback)", () => {
    const createdAt = new Date("2026-02-15T11:00:00Z"); // 49h ago
    expect(isInRecoveryWindow(createdAt, now)).toBe(false);
  });

  it("recovers analyses created exactly 2 hours ago (lte boundary)", () => {
    const createdAt = new Date("2026-02-17T10:00:00Z"); // exactly 2h ago
    // lte means <= so this IS included
    expect(isInRecoveryWindow(createdAt, now)).toBe(true);
  });

  it("does NOT recover analyses from 3 days ago", () => {
    const createdAt = new Date("2026-02-14T09:00:00Z"); // 3 days ago
    expect(isInRecoveryWindow(createdAt, now)).toBe(false);
  });

  it("handles early morning run (e.g. 9:15 UTC backup cron)", () => {
    const earlyNow = new Date("2026-02-17T09:15:00Z");
    // Yesterday's 9am scan that got stuck as pending
    const createdAt = new Date("2026-02-16T09:00:00Z"); // 24h15m ago
    expect(isInRecoveryWindow(createdAt, earlyNow)).toBe(true);
  });

  it("does NOT recover very recent analyses during early morning run", () => {
    const earlyNow = new Date("2026-02-17T09:15:00Z");
    // Today's scan just created by Inngest at 9:00
    const createdAt = new Date("2026-02-17T09:00:00Z"); // 15min ago
    expect(isInRecoveryWindow(createdAt, earlyNow)).toBe(false);
  });
});
