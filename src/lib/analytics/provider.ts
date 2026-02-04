/**
 * Analytics provider interface and factory
 */

import type {
  AnalyticsCredentials,
  GA4Credentials,
  PageStats,
  TrendPoint,
  EventCount,
  FunnelStep,
  PeriodComparison,
  SchemaInfo,
  ExperimentsResult,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

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

  /** Get active A/B tests/experiments with variant distribution */
  getExperiments(days: number): Promise<ExperimentsResult>;
}

export type ProviderType = "posthog" | "ga4";

export async function createProvider(
  type: ProviderType,
  credentials: AnalyticsCredentials | GA4Credentials,
  options?: { supabase?: SupabaseClient }
): Promise<AnalyticsProvider> {
  switch (type) {
    case "posthog": {
      const { PostHogAdapter } = await import("./posthog-adapter");
      return new PostHogAdapter(credentials as AnalyticsCredentials);
    }
    case "ga4": {
      const { GA4Adapter } = await import("./ga4-adapter");
      if (!options?.supabase) {
        throw new Error("GA4 adapter requires supabase client for token refresh");
      }
      return new GA4Adapter(credentials as GA4Credentials, options.supabase);
    }
    default:
      throw new Error(`Unknown analytics provider: ${type}`);
  }
}
