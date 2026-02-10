/**
 * Analytics provider interface and factory
 */

import type {
  AnalyticsCredentials,
  GA4Credentials,
  SupabaseCredentials,
  PageStats,
  TrendPoint,
  EventCount,
  FunnelStep,
  PeriodComparison,
  SchemaInfo,
  ExperimentsResult,
} from "./types";
import type { SupabaseAdapter } from "./supabase-adapter";
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

  /** Compare metrics between two absolute date periods (for correlation) */
  comparePeriodsAbsolute(
    metric: "pageviews" | "unique_visitors" | "bounce_rate" | "conversions",
    pageUrl: string,
    beforeStart: Date,
    beforeEnd: Date,
    afterStart: Date,
    afterEnd: Date
  ): Promise<PeriodComparison>;

  /** Get active A/B tests/experiments with variant distribution */
  getExperiments(days: number): Promise<ExperimentsResult>;
}

export type ProviderType = "posthog" | "ga4";
export type DatabaseProviderType = "supabase";

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

/**
 * Create a database provider (Supabase) for tracking business outcomes
 * This is separate from analytics providers since it tracks different metrics
 */
export async function createDatabaseProvider(
  type: DatabaseProviderType,
  credentials: SupabaseCredentials
): Promise<SupabaseAdapter> {
  switch (type) {
    case "supabase": {
      const { SupabaseAdapter } = await import("./supabase-adapter");
      return new SupabaseAdapter(credentials);
    }
    default:
      throw new Error(`Unknown database provider: ${type}`);
  }
}
