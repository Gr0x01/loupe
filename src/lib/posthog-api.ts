/**
 * PostHog API client for fetching page metrics
 */

interface PostHogCredentials {
  apiKey: string;
  projectId: string;
  host?: string;
}

interface PageMetrics {
  pageviews: number;
  unique_visitors: number;
  bounce_rate: number;
  period_days: number;
  captured_at: string;
}

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

/**
 * Sanitize a string for use in HogQL LIKE patterns
 * Escapes special characters that could break or inject into the query
 */
function sanitizeForHogQL(input: string): string {
  return input
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

/**
 * Execute a HogQL query against PostHog
 */
async function queryPostHog(
  credentials: PostHogCredentials,
  query: string
): Promise<HogQLResponse> {
  const host = credentials.host || DEFAULT_HOST;
  const url = `${host}/api/projects/${credentials.projectId}/query/`;

  // Add timeout to prevent hanging
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query,
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
 * Validate PostHog credentials by running a simple query
 */
/**
 * Check if a host is in the allowed list
 */
export function isAllowedHost(host: string): boolean {
  return ALLOWED_HOSTS.includes(host);
}

/**
 * Validate PostHog credentials by running a simple query
 */
export async function validateCredentials(
  credentials: PostHogCredentials
): Promise<{ valid: boolean; error?: string }> {
  // Validate host
  const host = credentials.host || DEFAULT_HOST;
  if (!ALLOWED_HOSTS.includes(host)) {
    return { valid: false, error: "Invalid host" };
  }

  // Validate projectId is numeric
  if (!/^\d+$/.test(credentials.projectId)) {
    return { valid: false, error: "Project ID must be a number" };
  }

  try {
    // Simple query to validate credentials
    await queryPostHog(credentials, "SELECT 1");
    return { valid: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("401") || message.includes("403")) {
      return { valid: false, error: "Invalid API key" };
    }
    if (message.includes("404")) {
      return { valid: false, error: "Project not found" };
    }
    // Don't expose internal error details
    console.error("PostHog validation error:", message);
    return { valid: false, error: "Failed to validate credentials" };
  }
}

/**
 * Extract domain from URL for matching in PostHog
 */
function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url;
  }
}

/**
 * Fetch page metrics from PostHog for a given URL
 */
export async function fetchPageMetrics(
  credentials: PostHogCredentials,
  pageUrl: string,
  days: number = 7
): Promise<PageMetrics | null> {
  const domain = extractDomain(pageUrl);
  const safeDomain = sanitizeForHogQL(domain);
  const safeDays = Math.max(1, Math.min(90, Math.floor(days))); // Clamp to 1-90 days

  // Query for pageviews, unique visitors, and bounce rate
  // Bounce = single pageview sessions
  const query = `
    SELECT
      count() AS pageviews,
      count(DISTINCT person_id) AS unique_visitors,
      countIf(is_bounce = 1) * 100.0 / count() AS bounce_rate
    FROM (
      SELECT
        person_id,
        session_id,
        count() AS session_pageviews,
        if(count() = 1, 1, 0) AS is_bounce
      FROM events
      WHERE event = '$pageview'
        AND properties.$current_url LIKE '%${safeDomain}%'
        AND timestamp > now() - INTERVAL ${safeDays} DAY
      GROUP BY person_id, session_id
    )
  `;

  try {
    const result = await queryPostHog(credentials, query);

    if (!result.results || result.results.length === 0) {
      return {
        pageviews: 0,
        unique_visitors: 0,
        bounce_rate: 0,
        period_days: days,
        captured_at: new Date().toISOString(),
      };
    }

    const [pageviews, unique_visitors, bounce_rate] = result.results[0] as [number, number, number];

    return {
      pageviews: Math.round(pageviews || 0),
      unique_visitors: Math.round(unique_visitors || 0),
      bounce_rate: Math.round((bounce_rate || 0) * 10) / 10, // 1 decimal place
      period_days: days,
      captured_at: new Date().toISOString(),
    };
  } catch (err) {
    console.error("Failed to fetch PostHog metrics:", err);
    return null;
  }
}
