/**
 * Shared types for analytics integrations
 */

export interface AnalyticsCredentials {
  apiKey: string;
  projectId: string;
  host?: string;
}

export interface PageStats {
  pageviews: number;
  unique_visitors: number;
  bounce_rate: number;
  avg_session_duration_seconds: number;
  period_days: number;
}

export interface TrendPoint {
  date: string;
  value: number;
}

export interface EventCount {
  event_name: string;
  count: number;
  unique_users: number;
}

export interface FunnelStep {
  step_name: string;
  count: number;
  conversion_rate: number;
  drop_off_rate: number;
}

export interface PeriodComparison {
  metric: string;
  current_period: number;
  previous_period: number;
  change_percent: number;
  direction: "up" | "down" | "flat";
}

export interface SchemaInfo {
  events: string[];
  properties: string[];
  cached_at: string;
}

export interface ToolResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}
