/**
 * Analytics provider interface and factory
 */

import type {
  AnalyticsCredentials,
  PageStats,
  TrendPoint,
  EventCount,
  FunnelStep,
  PeriodComparison,
  SchemaInfo,
} from "./types";

export interface AnalyticsProvider {
  /** Get available events and properties for discovery */
  getSchema(): Promise<SchemaInfo>;

  /** Get basic page stats for a URL */
  getPageStats(pageUrl: string, days: number): Promise<PageStats>;

  /** Get trend data for a metric over time */
  queryTrend(
    metric: "pageviews" | "unique_visitors" | "bounce_rate" | "session_duration",
    pageUrl: string,
    days: number,
    granularity: "day" | "week"
  ): Promise<TrendPoint[]>;

  /** Get counts for custom events */
  queryCustomEvent(
    eventName: string,
    pageUrl: string | null,
    days: number
  ): Promise<EventCount>;

  /** Get funnel conversion data */
  getFunnel(
    steps: string[],
    pageUrl: string | null,
    days: number
  ): Promise<FunnelStep[]>;

  /** Compare metrics between two periods */
  comparePeriods(
    metric: "pageviews" | "unique_visitors" | "bounce_rate" | "conversions",
    pageUrl: string,
    currentDays: number,
    previousDays: number
  ): Promise<PeriodComparison>;
}

export type ProviderType = "posthog";

export async function createProvider(
  type: ProviderType,
  credentials: AnalyticsCredentials
): Promise<AnalyticsProvider> {
  switch (type) {
    case "posthog": {
      const { PostHogAdapter } = await import("./posthog-adapter");
      return new PostHogAdapter(credentials);
    }
    default:
      throw new Error(`Unknown analytics provider: ${type}`);
  }
}
