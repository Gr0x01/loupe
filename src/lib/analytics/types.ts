/**
 * Shared types for analytics integrations
 */

export interface AnalyticsCredentials {
  apiKey: string;
  projectId: string;
  host?: string;
}

export interface GA4Credentials {
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: number;
  propertyId: string;
  integrationId: string;
}

export interface SupabaseCredentials {
  projectUrl: string;
  anonKey?: string;
  serviceRoleKey?: string;
}

export interface SupabaseTableInfo {
  schema: string;
  name: string;
  row_count: number;
  columns: { name: string; type: string }[];
}

export interface SupabaseSchemaInfo {
  tables: SupabaseTableInfo[];
  cached_at: string;
}

export interface SupabaseTableStats {
  table_name: string;
  row_count: number;
  period_start?: string;
  period_end?: string;
}

export interface SupabasePeriodComparison {
  table_name: string;
  current_count: number;
  previous_count: number;
  change: number;
  change_percent: number;
  direction: "up" | "down" | "flat";
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

export interface ExperimentVariant {
  variant: string;
  participants: number;
  percentage: number;
}

export interface ExperimentInfo {
  flag_name: string;
  variants: ExperimentVariant[];
  total_participants: number;
  first_seen: string;
  last_seen: string;
}

export interface ExperimentsResult {
  experiments: ExperimentInfo[];
  period_days: number;
}
