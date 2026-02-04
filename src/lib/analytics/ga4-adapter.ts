/**
 * Google Analytics 4 implementation of AnalyticsProvider
 * Uses the GA4 Data API v1beta
 */

import type { AnalyticsProvider } from "./provider";
import type {
  GA4Credentials,
  PageStats,
  TrendPoint,
  EventCount,
  FunnelStep,
  PeriodComparison,
  SchemaInfo,
  ExperimentsResult,
  ExperimentInfo,
} from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshGoogleToken, isTokenExpired } from "@/lib/google-oauth";

const GA4_DATA_API_URL = "https://analyticsdata.googleapis.com/v1beta";
const REQUEST_TIMEOUT_MS = 15000;

interface GA4ReportResponse {
  rows?: Array<{
    dimensionValues?: Array<{ value: string }>;
    metricValues?: Array<{ value: string }>;
  }>;
  rowCount?: number;
  metadata?: {
    dataLossFromOtherRow?: boolean;
  };
}

export class GA4Adapter implements AnalyticsProvider {
  private credentials: GA4Credentials;
  private supabase: SupabaseClient;
  private accessToken: string;
  private refreshPromise: Promise<string> | null = null;

  constructor(credentials: GA4Credentials, supabase: SupabaseClient) {
    this.credentials = credentials;
    this.supabase = supabase;
    this.accessToken = credentials.accessToken;
  }

  /**
   * Ensure we have a valid access token, refreshing if needed
   * Uses a lock to prevent concurrent refresh attempts
   */
  private async ensureValidToken(): Promise<string> {
    if (!isTokenExpired(this.credentials.tokenExpiresAt)) {
      return this.accessToken;
    }

    // Dedupe concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doTokenRefresh().finally(() => {
      this.refreshPromise = null;
    });

    return this.refreshPromise;
  }

  /**
   * Actually perform the token refresh
   */
  private async doTokenRefresh(): Promise<string> {
    try {
      const newTokens = await refreshGoogleToken(this.credentials.refreshToken);
      this.accessToken = newTokens.access_token;

      const newExpiresAt = Date.now() + newTokens.expires_in * 1000;

      // Fetch current metadata to preserve all fields
      const { data: current } = await this.supabase
        .from("integrations")
        .select("metadata")
        .eq("id", this.credentials.integrationId)
        .single();

      // Update stored tokens in database, preserving existing metadata
      await this.supabase
        .from("integrations")
        .update({
          access_token: newTokens.access_token,
          metadata: {
            ...current?.metadata,
            refresh_token: newTokens.refresh_token || this.credentials.refreshToken,
            token_expires_at: newExpiresAt,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.credentials.integrationId);

      // Update local state
      this.credentials.tokenExpiresAt = newExpiresAt;
      if (newTokens.refresh_token) {
        this.credentials.refreshToken = newTokens.refresh_token;
      }

      return this.accessToken;
    } catch (err) {
      console.error("Failed to refresh GA4 token:", err);
      throw new Error("Failed to refresh authentication. Please reconnect Google Analytics.");
    }
  }

  /**
   * Make a request to the GA4 Data API
   */
  private async runReport(body: object): Promise<GA4ReportResponse> {
    const accessToken = await this.ensureValidToken();
    const url = `${GA4_DATA_API_URL}/properties/${this.credentials.propertyId}:runReport`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`GA4 API error: ${res.status} - ${text}`);
        throw new Error(`GA4 API error: ${res.status}`);
      }

      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Format a date as YYYY-MM-DD for GA4 API
   */
  private formatDate(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * Get date range strings for GA4 API
   */
  private getDateRange(days: number): { startDate: string; endDate: string } {
    const safeDays = Math.max(1, Math.min(90, Math.floor(days)));
    return {
      startDate: `${safeDays}daysAgo`,
      endDate: "today",
    };
  }

  /**
   * Extract domain from URL for filtering
   */
  private extractDomain(url: string): string {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch {
      return url;
    }
  }

  async getSchema(): Promise<SchemaInfo> {
    // GA4 doesn't have a direct schema discovery API like PostHog
    // Return common GA4 events and dimensions
    return {
      events: [
        "page_view",
        "session_start",
        "first_visit",
        "scroll",
        "click",
        "file_download",
        "form_submit",
        "purchase",
        "add_to_cart",
        "begin_checkout",
        "sign_up",
        "login",
      ],
      properties: [
        "pageTitle",
        "pagePath",
        "pageLocation",
        "deviceCategory",
        "browser",
        "country",
        "city",
        "sessionSource",
        "sessionMedium",
        "sessionCampaignName",
      ],
      cached_at: new Date().toISOString(),
    };
  }

  async getPageStats(pageUrl: string, days: number): Promise<PageStats> {
    const domain = this.extractDomain(pageUrl);
    const dateRange = this.getDateRange(days);

    // Run report for pageviews, users, and session metrics
    const response = await this.runReport({
      dateRanges: [dateRange],
      dimensions: [],
      metrics: [
        { name: "screenPageViews" },
        { name: "totalUsers" },
        { name: "bounceRate" },
        { name: "averageSessionDuration" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "hostName",
          stringFilter: {
            matchType: "CONTAINS",
            value: domain,
          },
        },
      },
    });

    const row = response.rows?.[0];
    const metrics = row?.metricValues || [];

    return {
      pageviews: Math.round(Number(metrics[0]?.value) || 0),
      unique_visitors: Math.round(Number(metrics[1]?.value) || 0),
      bounce_rate: Math.round((Number(metrics[2]?.value) || 0) * 1000) / 10, // Convert to percentage
      avg_session_duration_seconds: Math.round(Number(metrics[3]?.value) || 0),
      period_days: Math.max(1, Math.min(90, Math.floor(days))),
    };
  }

  async queryTrend(
    metric: "pageviews" | "unique_visitors" | "bounce_rate" | "session_duration",
    pageUrl: string,
    days: number,
    granularity: "day" | "week"
  ): Promise<TrendPoint[]> {
    const domain = this.extractDomain(pageUrl);
    const dateRange = this.getDateRange(days);

    // Map our metric names to GA4 metric names
    const metricMap: Record<string, string> = {
      pageviews: "screenPageViews",
      unique_visitors: "totalUsers",
      bounce_rate: "bounceRate",
      session_duration: "averageSessionDuration",
    };

    // Use dateHour for day granularity to get actual dates, or yearWeek for weeks
    const dimension = granularity === "week" ? "yearWeek" : "date";

    const response = await this.runReport({
      dateRanges: [dateRange],
      dimensions: [{ name: dimension }],
      metrics: [{ name: metricMap[metric] }],
      dimensionFilter: {
        filter: {
          fieldName: "hostName",
          stringFilter: {
            matchType: "CONTAINS",
            value: domain,
          },
        },
      },
      orderBys: [{ dimension: { dimensionName: dimension } }],
    });

    return (response.rows || []).map((row) => {
      let value = Number(row.metricValues?.[0]?.value) || 0;

      // Convert bounce rate to percentage
      if (metric === "bounce_rate") {
        value = Math.round(value * 1000) / 10;
      } else {
        value = Math.round(value);
      }

      // Format date string
      const dateValue = row.dimensionValues?.[0]?.value || "";
      let formattedDate = dateValue;

      if (dimension === "date" && dateValue.length === 8) {
        // Convert YYYYMMDD to YYYY-MM-DD
        formattedDate = `${dateValue.slice(0, 4)}-${dateValue.slice(4, 6)}-${dateValue.slice(6, 8)}`;
      }

      return {
        date: formattedDate,
        value,
      };
    });
  }

  async queryCustomEvent(
    eventName: string,
    pageUrl: string | null,
    days: number
  ): Promise<EventCount> {
    const dateRange = this.getDateRange(days);

    const filters: object[] = [
      {
        filter: {
          fieldName: "eventName",
          stringFilter: {
            matchType: "EXACT",
            value: eventName,
          },
        },
      },
    ];

    if (pageUrl) {
      const domain = this.extractDomain(pageUrl);
      filters.push({
        filter: {
          fieldName: "hostName",
          stringFilter: {
            matchType: "CONTAINS",
            value: domain,
          },
        },
      });
    }

    const response = await this.runReport({
      dateRanges: [dateRange],
      dimensions: [],
      metrics: [
        { name: "eventCount" },
        { name: "totalUsers" },
      ],
      dimensionFilter: filters.length === 1 ? filters[0] : { andGroup: { expressions: filters } },
    });

    const row = response.rows?.[0];
    const metrics = row?.metricValues || [];

    return {
      event_name: eventName,
      count: Math.round(Number(metrics[0]?.value) || 0),
      unique_users: Math.round(Number(metrics[1]?.value) || 0),
    };
  }

  async getFunnel(
    steps: string[],
    pageUrl: string | null,
    days: number
  ): Promise<FunnelStep[]> {
    if (steps.length < 2) {
      throw new Error("Funnel requires at least 2 steps");
    }

    // GA4 Data API doesn't have built-in funnel analysis like PostHog
    // We'll approximate by querying each event separately
    const results: FunnelStep[] = [];
    let previousCount = 0;

    for (let i = 0; i < steps.length; i++) {
      const eventData = await this.queryCustomEvent(steps[i], pageUrl, days);
      const count = eventData.count;

      const totalStart = i === 0 ? count : (results[0]?.count || 1);
      const conversionRate = totalStart > 0 ? (count / totalStart) * 100 : 0;
      const dropOffRate = i === 0 ? 0 : (previousCount > 0 ? ((previousCount - count) / previousCount) * 100 : 0);

      results.push({
        step_name: steps[i],
        count,
        conversion_rate: Math.round(conversionRate * 10) / 10,
        drop_off_rate: Math.round(dropOffRate * 10) / 10,
      });

      previousCount = count;
    }

    return results;
  }

  async comparePeriods(
    metric: "pageviews" | "unique_visitors" | "bounce_rate" | "conversions",
    pageUrl: string,
    currentDays: number,
    previousDays: number
  ): Promise<PeriodComparison> {
    const domain = this.extractDomain(pageUrl);
    const safeCurrentDays = Math.max(1, Math.min(30, Math.floor(currentDays)));
    const safePreviousDays = Math.max(1, Math.min(30, Math.floor(previousDays)));

    // Map metric names
    const metricMap: Record<string, string> = {
      pageviews: "screenPageViews",
      unique_visitors: "totalUsers",
      bounce_rate: "bounceRate",
      conversions: "conversions", // GA4 has a conversions metric if configured
    };

    const ga4Metric = metricMap[metric];

    // Query for current period
    const currentResponse = await this.runReport({
      dateRanges: [{ startDate: `${safeCurrentDays}daysAgo`, endDate: "today" }],
      dimensions: [],
      metrics: [{ name: ga4Metric }],
      dimensionFilter: {
        filter: {
          fieldName: "hostName",
          stringFilter: {
            matchType: "CONTAINS",
            value: domain,
          },
        },
      },
    });

    // Query for previous period
    const previousResponse = await this.runReport({
      dateRanges: [{
        startDate: `${safeCurrentDays + safePreviousDays}daysAgo`,
        endDate: `${safeCurrentDays + 1}daysAgo`,
      }],
      dimensions: [],
      metrics: [{ name: ga4Metric }],
      dimensionFilter: {
        filter: {
          fieldName: "hostName",
          stringFilter: {
            matchType: "CONTAINS",
            value: domain,
          },
        },
      },
    });

    let current = Number(currentResponse.rows?.[0]?.metricValues?.[0]?.value) || 0;
    let previous = Number(previousResponse.rows?.[0]?.metricValues?.[0]?.value) || 0;

    // Handle bounce rate formatting
    if (metric === "bounce_rate") {
      current = Math.round(current * 1000) / 10;
      previous = Math.round(previous * 1000) / 10;
    } else {
      current = Math.round(current);
      previous = Math.round(previous);
    }

    const changePercent = previous === 0
      ? (current > 0 ? 100 : 0)
      : ((current - previous) / previous) * 100;

    return {
      metric,
      current_period: current,
      previous_period: previous,
      change_percent: Math.round(changePercent * 10) / 10,
      direction: changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat",
    };
  }

  async getExperiments(days: number): Promise<ExperimentsResult> {
    const safeDays = Math.max(1, Math.min(90, Math.floor(days)));

    // Query for experiment data if available
    // GA4 experiments are typically managed through Firebase or Optimize
    // We'll try to get data from the experimentId dimension if it exists
    try {
      const response = await this.runReport({
        dateRanges: [this.getDateRange(safeDays)],
        dimensions: [
          { name: "experimentId" },
          { name: "experimentVariant" },
        ],
        metrics: [{ name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "totalUsers" }, desc: true }],
        limit: 100,
      });

      // Group by experiment ID
      const experimentMap = new Map<string, {
        variants: Array<{ variant: string; participants: number }>;
      }>();

      for (const row of response.rows || []) {
        const experimentId = row.dimensionValues?.[0]?.value || "";
        const variant = row.dimensionValues?.[1]?.value || "";
        const participants = Math.round(Number(row.metricValues?.[0]?.value) || 0);

        if (!experimentId || experimentId === "(not set)") continue;

        if (!experimentMap.has(experimentId)) {
          experimentMap.set(experimentId, { variants: [] });
        }

        experimentMap.get(experimentId)!.variants.push({ variant, participants });
      }

      // Convert to ExperimentInfo array
      const experiments: ExperimentInfo[] = [];

      for (const [flagName, data] of experimentMap) {
        const totalParticipants = data.variants.reduce((sum, v) => sum + v.participants, 0);

        experiments.push({
          flag_name: flagName,
          variants: data.variants.map((v) => ({
            variant: v.variant,
            participants: v.participants,
            percentage: totalParticipants > 0
              ? Math.round((v.participants / totalParticipants) * 1000) / 10
              : 0,
          })),
          total_participants: totalParticipants,
          first_seen: "", // GA4 doesn't provide this easily
          last_seen: "",
        });
      }

      return {
        experiments,
        period_days: safeDays,
      };
    } catch {
      // Experiment dimensions may not be available
      return {
        experiments: [],
        period_days: safeDays,
      };
    }
  }
}
