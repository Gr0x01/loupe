/**
 * PostHog implementation of AnalyticsProvider
 */

import type { AnalyticsProvider } from "./provider";
import type {
  AnalyticsCredentials,
  PageStats,
  TrendPoint,
  EventCount,
  FunnelStep,
  PeriodComparison,
  SchemaInfo,
} from "./types";

interface HogQLResponse {
  results: unknown[][];
  columns: string[];
}

const DEFAULT_HOST = "https://us.i.posthog.com";

const ALLOWED_HOSTS = [
  "https://us.i.posthog.com",
  "https://eu.i.posthog.com",
  "https://app.posthog.com",
];

const REQUEST_TIMEOUT_MS = 15000;

export class PostHogAdapter implements AnalyticsProvider {
  private credentials: AnalyticsCredentials;
  private host: string;

  constructor(credentials: AnalyticsCredentials) {
    // Validate host
    const host = credentials.host || DEFAULT_HOST;
    if (!ALLOWED_HOSTS.includes(host)) {
      throw new Error(`Invalid PostHog host: ${host}`);
    }

    // Validate projectId is numeric
    if (!/^\d+$/.test(credentials.projectId)) {
      throw new Error("Project ID must be numeric");
    }

    this.credentials = credentials;
    this.host = host;
  }

  private async query(hogql: string): Promise<HogQLResponse> {
    const url = `${this.host}/api/projects/${this.credentials.projectId}/query/`;

    // Add timeout to prevent hanging
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.credentials.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            kind: "HogQLQuery",
            query: hogql,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        console.error(`PostHog API error: ${res.status} - ${text}`);
        throw new Error(`PostHog API error: ${res.status}`);
      }

      return res.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Sanitize string for use in HogQL queries
   * Escapes special characters that could break or inject into the query
   */
  private sanitizeForHogQL(input: string): string {
    return input
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'")
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
  }

  /** Extract and sanitize domain from URL for use in HogQL LIKE clause */
  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      return this.sanitizeForHogQL(parsed.hostname);
    } catch {
      return this.sanitizeForHogQL(url);
    }
  }

  /** Clamp days parameter to safe range */
  private clampDays(days: number): number {
    return Math.max(1, Math.min(90, Math.floor(days)));
  }

  async getSchema(): Promise<SchemaInfo> {
    // Get distinct event names from the last 30 days
    const eventsQuery = `
      SELECT DISTINCT event
      FROM events
      WHERE timestamp > now() - INTERVAL 30 DAY
      ORDER BY event
      LIMIT 100
    `;

    // Get common property keys
    const propsQuery = `
      SELECT DISTINCT JSONExtractKeys(properties) as keys
      FROM events
      WHERE timestamp > now() - INTERVAL 7 DAY
      LIMIT 1000
    `;

    const [eventsResult, propsResult] = await Promise.all([
      this.query(eventsQuery),
      this.query(propsQuery).catch(() => ({ results: [], columns: [] })),
    ]);

    const events = (eventsResult.results || [])
      .map((r) => r?.[0])
      .filter((e): e is string => typeof e === "string");

    // Flatten and dedupe property keys
    const propertySet = new Set<string>();
    for (const row of propsResult.results || []) {
      const keys = row?.[0];
      if (Array.isArray(keys)) {
        keys.forEach((k) => {
          if (typeof k === "string") propertySet.add(k);
        });
      }
    }

    return {
      events,
      properties: Array.from(propertySet).slice(0, 50),
      cached_at: new Date().toISOString(),
    };
  }

  async getPageStats(pageUrl: string, days: number): Promise<PageStats> {
    const domain = this.sanitizeUrl(pageUrl);
    const safeDays = this.clampDays(days);

    const query = `
      SELECT
        count() AS pageviews,
        count(DISTINCT person_id) AS unique_visitors,
        avg(session_duration) AS avg_duration
      FROM (
        SELECT
          person_id,
          $session_id AS session_id,
          count() AS session_pageviews,
          dateDiff('second', min(timestamp), max(timestamp)) AS session_duration
        FROM events
        WHERE event = '$pageview'
          AND properties.$current_url LIKE '%${domain}%'
          AND timestamp > now() - INTERVAL ${safeDays} DAY
        GROUP BY person_id, session_id
      )
    `;

    const bounceQuery = `
      SELECT
        countIf(session_pageviews = 1) * 100.0 / count() AS bounce_rate
      FROM (
        SELECT
          $session_id AS session_id,
          count() AS session_pageviews
        FROM events
        WHERE event = '$pageview'
          AND properties.$current_url LIKE '%${domain}%'
          AND timestamp > now() - INTERVAL ${safeDays} DAY
        GROUP BY session_id
      )
    `;

    const [statsResult, bounceResult] = await Promise.all([
      this.query(query),
      this.query(bounceQuery),
    ]);

    // Defensive: check results exist
    const statsRow = statsResult.results?.[0];
    const bounceRow = bounceResult.results?.[0];

    const pageviews = statsRow?.[0] ?? 0;
    const unique_visitors = statsRow?.[1] ?? 0;
    const avg_duration = statsRow?.[2] ?? 0;
    const bounce_rate = bounceRow?.[0] ?? 0;

    return {
      pageviews: Math.round(Number(pageviews) || 0),
      unique_visitors: Math.round(Number(unique_visitors) || 0),
      bounce_rate: Math.round((Number(bounce_rate) || 0) * 10) / 10,
      avg_session_duration_seconds: Math.round(Number(avg_duration) || 0),
      period_days: safeDays,
    };
  }

  async queryTrend(
    metric: "pageviews" | "unique_visitors" | "bounce_rate" | "session_duration",
    pageUrl: string,
    days: number,
    granularity: "day" | "week"
  ): Promise<TrendPoint[]> {
    const domain = this.sanitizeUrl(pageUrl);
    const safeDays = this.clampDays(days);
    const truncate = granularity === "week" ? "toStartOfWeek" : "toStartOfDay";

    let selectExpr: string;
    switch (metric) {
      case "pageviews":
        selectExpr = "count()";
        break;
      case "unique_visitors":
        selectExpr = "count(DISTINCT person_id)";
        break;
      case "bounce_rate":
        // Bounce rate per day requires subquery
        return this.queryBounceRateTrend(pageUrl, safeDays, granularity);
      case "session_duration":
        selectExpr = "avg(dateDiff('second', min(timestamp), max(timestamp)))";
        break;
    }

    const query = `
      SELECT
        ${truncate}(timestamp) AS date,
        ${selectExpr} AS value
      FROM events
      WHERE event = '$pageview'
        AND properties.$current_url LIKE '%${domain}%'
        AND timestamp > now() - INTERVAL ${safeDays} DAY
      GROUP BY date
      ORDER BY date
    `;

    const result = await this.query(query);

    return (result.results || []).map((row) => ({
      date: String(row?.[0] ?? ""),
      value: Math.round(Number(row?.[1]) || 0),
    }));
  }

  private async queryBounceRateTrend(
    pageUrl: string,
    safeDays: number,
    granularity: "day" | "week"
  ): Promise<TrendPoint[]> {
    const domain = this.sanitizeUrl(pageUrl);
    const truncate = granularity === "week" ? "toStartOfWeek" : "toStartOfDay";

    const query = `
      SELECT
        date,
        countIf(session_pageviews = 1) * 100.0 / count() AS bounce_rate
      FROM (
        SELECT
          ${truncate}(min(timestamp)) AS date,
          $session_id AS session_id,
          count() AS session_pageviews
        FROM events
        WHERE event = '$pageview'
          AND properties.$current_url LIKE '%${domain}%'
          AND timestamp > now() - INTERVAL ${safeDays} DAY
        GROUP BY session_id
      )
      GROUP BY date
      ORDER BY date
    `;

    const result = await this.query(query);

    return (result.results || []).map((row) => ({
      date: String(row?.[0] ?? ""),
      value: Math.round((Number(row?.[1]) || 0) * 10) / 10,
    }));
  }

  async queryCustomEvent(
    eventName: string,
    pageUrl: string | null,
    days: number
  ): Promise<EventCount> {
    const safeEventName = this.sanitizeForHogQL(eventName);
    const safeDays = this.clampDays(days);
    const urlFilter = pageUrl
      ? `AND properties.$current_url LIKE '%${this.sanitizeUrl(pageUrl)}%'`
      : "";

    const query = `
      SELECT
        count() AS count,
        count(DISTINCT person_id) AS unique_users
      FROM events
      WHERE event = '${safeEventName}'
        ${urlFilter}
        AND timestamp > now() - INTERVAL ${safeDays} DAY
    `;

    const result = await this.query(query);
    const row = result.results?.[0];

    return {
      event_name: eventName,
      count: Math.round(Number(row?.[0]) || 0),
      unique_users: Math.round(Number(row?.[1]) || 0),
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

    const safeDays = this.clampDays(days);
    const urlFilter = pageUrl
      ? `AND properties.$current_url LIKE '%${this.sanitizeUrl(pageUrl)}%'`
      : "";

    const stepConditions = steps
      .map((step) => `event = '${this.sanitizeForHogQL(step)}'`)
      .join(", ");

    const query = `
      SELECT
        level,
        count() AS users
      FROM (
        SELECT
          person_id,
          windowFunnel(86400)(timestamp, ${stepConditions}) AS level
        FROM events
        WHERE timestamp > now() - INTERVAL ${safeDays} DAY
          ${urlFilter}
        GROUP BY person_id
      )
      GROUP BY level
      ORDER BY level DESC
    `;

    const result = await this.query(query);

    // Build funnel steps from results
    const levelCounts = new Map<number, number>();
    for (const row of result.results || []) {
      levelCounts.set(Number(row?.[0]), Number(row?.[1]));
    }

    // Calculate cumulative counts (level N includes everyone who reached at least N)
    const cumulativeCounts: number[] = [];
    for (let i = steps.length; i >= 1; i--) {
      const prevCount = cumulativeCounts[0] || 0;
      cumulativeCounts.unshift((levelCounts.get(i) || 0) + prevCount);
    }

    const totalStart = cumulativeCounts[0] || 1;

    return steps.map((step, i) => {
      const count = cumulativeCounts[i] || 0;
      const prevCount = i === 0 ? totalStart : cumulativeCounts[i - 1] || 1;

      return {
        step_name: step,
        count,
        conversion_rate: Math.round((count / totalStart) * 1000) / 10,
        drop_off_rate:
          i === 0 ? 0 : Math.round(((prevCount - count) / prevCount) * 1000) / 10,
      };
    });
  }

  async comparePeriods(
    metric: "pageviews" | "unique_visitors" | "bounce_rate" | "conversions",
    pageUrl: string,
    currentDays: number,
    previousDays: number
  ): Promise<PeriodComparison> {
    const domain = this.sanitizeUrl(pageUrl);
    const safeCurrentDays = this.clampDays(currentDays);
    const safePreviousDays = this.clampDays(previousDays);

    let selectExpr: string;
    let eventFilter = "event = '$pageview'";

    switch (metric) {
      case "pageviews":
        selectExpr = "count()";
        break;
      case "unique_visitors":
        selectExpr = "count(DISTINCT person_id)";
        break;
      case "bounce_rate":
        // Need separate query for bounce rate
        return this.compareBounceRatePeriods(pageUrl, safeCurrentDays, safePreviousDays);
      case "conversions":
        // Look for common conversion events
        eventFilter = "event IN ('$purchase', 'purchase', 'signup', 'sign_up', 'conversion')";
        selectExpr = "count()";
        break;
    }

    const query = `
      SELECT
        ${selectExpr} AS value,
        if(timestamp > now() - INTERVAL ${safeCurrentDays} DAY, 'current', 'previous') AS period
      FROM events
      WHERE ${eventFilter}
        AND properties.$current_url LIKE '%${domain}%'
        AND timestamp > now() - INTERVAL ${safeCurrentDays + safePreviousDays} DAY
      GROUP BY period
    `;

    const result = await this.query(query);

    let current = 0;
    let previous = 0;

    for (const row of result.results || []) {
      if (row?.[1] === "current") current = Number(row?.[0]) || 0;
      else previous = Number(row?.[0]) || 0;
    }

    const changePercent =
      previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

    return {
      metric,
      current_period: Math.round(current),
      previous_period: Math.round(previous),
      change_percent: Math.round(changePercent * 10) / 10,
      direction: changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat",
    };
  }

  private async compareBounceRatePeriods(
    pageUrl: string,
    safeCurrentDays: number,
    safePreviousDays: number
  ): Promise<PeriodComparison> {
    const domain = this.sanitizeUrl(pageUrl);

    const query = `
      SELECT
        period,
        countIf(session_pageviews = 1) * 100.0 / count() AS bounce_rate
      FROM (
        SELECT
          $session_id AS session_id,
          count() AS session_pageviews,
          if(min(timestamp) > now() - INTERVAL ${safeCurrentDays} DAY, 'current', 'previous') AS period
        FROM events
        WHERE event = '$pageview'
          AND properties.$current_url LIKE '%${domain}%'
          AND timestamp > now() - INTERVAL ${safeCurrentDays + safePreviousDays} DAY
        GROUP BY session_id
      )
      GROUP BY period
    `;

    const result = await this.query(query);

    let current = 0;
    let previous = 0;

    for (const row of result.results || []) {
      if (row?.[0] === "current") current = Number(row?.[1]) || 0;
      else previous = Number(row?.[1]) || 0;
    }

    const changePercent =
      previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

    return {
      metric: "bounce_rate",
      current_period: Math.round(current * 10) / 10,
      previous_period: Math.round(previous * 10) / 10,
      change_percent: Math.round(changePercent * 10) / 10,
      direction: changePercent > 1 ? "up" : changePercent < -1 ? "down" : "flat",
    };
  }
}
