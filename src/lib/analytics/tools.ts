/**
 * LLM tool definitions for analytics queries
 * Uses Vercel AI SDK tool() helper
 */

import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsProvider } from "./provider";
import type { SupabaseAdapter } from "./supabase-adapter";

export interface ToolContext {
  provider: AnalyticsProvider;
  supabase: SupabaseClient;
  analysisId: string;
  userId: string;
  pageUrl: string;
  providerType: string;
}

export interface DatabaseToolContext {
  adapter: SupabaseAdapter;
  supabase: SupabaseClient;
  analysisId: string;
  userId: string;
  pageUrl: string;
}

/**
 * Save tool call result to analytics_snapshots for historical tracking
 */
async function saveSnapshot(
  ctx: ToolContext,
  toolName: string,
  toolInput: unknown,
  toolOutput: unknown
) {
  try {
    await ctx.supabase.from("analytics_snapshots").insert({
      analysis_id: ctx.analysisId,
      user_id: ctx.userId,
      tool_name: toolName,
      tool_input: toolInput,
      tool_output: toolOutput,
      provider: ctx.providerType,
      page_url: ctx.pageUrl,
    });
  } catch (err) {
    console.error("Failed to save analytics snapshot:", err);
  }
}

/**
 * Create analytics tools bound to a specific context
 * These tools allow the LLM to query analytics data on-demand
 */
export function createAnalyticsTools(ctx: ToolContext) {
  return {
    discover_metrics: tool({
      description:
        "Discover what events and properties are available in the analytics system. Call this first to understand what data you can query.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const schema = await ctx.provider.getSchema();
          await saveSnapshot(ctx, "discover_metrics", {}, schema);
          return { success: true, data: schema };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    get_page_stats: tool({
      description:
        "Get basic page statistics: pageviews, unique visitors, bounce rate, and average session duration for the specified time period.",
      inputSchema: z.object({
        page_url: z
          .string()
          .describe("The page URL to get stats for (use the page being analyzed)"),
        days: z
          .number()
          .min(1)
          .max(90)
          .default(7)
          .describe("Number of days to look back (default: 7)"),
      }),
      execute: async ({ page_url, days }) => {
        try {
          const stats = await ctx.provider.getPageStats(page_url, days);
          await saveSnapshot(ctx, "get_page_stats", { page_url, days }, stats);
          return { success: true, data: stats };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    query_trend: tool({
      description:
        "Get a metric trend over time to see how it changed day-by-day or week-by-week. Useful for spotting patterns or changes after deploys.",
      inputSchema: z.object({
        metric: z
          .enum(["pageviews", "unique_visitors", "bounce_rate", "session_duration"])
          .describe("The metric to track over time"),
        page_url: z.string().describe("The page URL to analyze"),
        days: z
          .number()
          .min(7)
          .max(90)
          .default(14)
          .describe("Number of days to look back (default: 14)"),
        granularity: z
          .enum(["day", "week"])
          .default("day")
          .describe("Time granularity for the trend"),
      }),
      execute: async ({ metric, page_url, days, granularity }) => {
        try {
          const trend = await ctx.provider.queryTrend(
            metric,
            page_url,
            days,
            granularity
          );
          await saveSnapshot(
            ctx,
            "query_trend",
            { metric, page_url, days, granularity },
            trend
          );
          return { success: true, data: trend };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    query_custom_event: tool({
      description:
        "Query a specific custom event to see how often it occurs. Use discover_metrics first to see available events.",
      inputSchema: z.object({
        event_name: z
          .string()
          .describe("The exact event name to query (e.g., 'signup', '$purchase')"),
        page_url: z
          .string()
          .nullable()
          .describe("Optional: filter to events on a specific page URL"),
        days: z
          .number()
          .min(1)
          .max(90)
          .default(7)
          .describe("Number of days to look back (default: 7)"),
      }),
      execute: async ({ event_name, page_url, days }) => {
        try {
          const eventData = await ctx.provider.queryCustomEvent(
            event_name,
            page_url,
            days
          );
          await saveSnapshot(
            ctx,
            "query_custom_event",
            { event_name, page_url, days },
            eventData
          );
          return { success: true, data: eventData };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    get_funnel: tool({
      description:
        "Analyze a conversion funnel to see drop-off between steps. Useful for understanding where users abandon.",
      inputSchema: z.object({
        steps: z
          .array(z.string())
          .min(2)
          .max(6)
          .describe(
            "Event names representing funnel steps in order (e.g., ['$pageview', 'signup', '$purchase'])"
          ),
        page_url: z
          .string()
          .nullable()
          .describe("Optional: filter to events on a specific page URL"),
        days: z
          .number()
          .min(7)
          .max(90)
          .default(30)
          .describe("Number of days to look back (default: 30)"),
      }),
      execute: async ({ steps, page_url, days }) => {
        try {
          const funnel = await ctx.provider.getFunnel(steps, page_url, days);
          await saveSnapshot(ctx, "get_funnel", { steps, page_url, days }, funnel);
          return { success: true, data: funnel };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    compare_periods: tool({
      description:
        "Compare a metric between two time periods to see if there was improvement or decline. Useful for before/after analysis.",
      inputSchema: z.object({
        metric: z
          .enum(["pageviews", "unique_visitors", "bounce_rate", "conversions"])
          .describe("The metric to compare"),
        page_url: z.string().describe("The page URL to analyze"),
        current_days: z
          .number()
          .min(1)
          .max(30)
          .default(7)
          .describe("Days in the current (recent) period"),
        previous_days: z
          .number()
          .min(1)
          .max(30)
          .default(7)
          .describe("Days in the previous (older) period"),
      }),
      execute: async ({ metric, page_url, current_days, previous_days }) => {
        try {
          const comparison = await ctx.provider.comparePeriods(
            metric,
            page_url,
            current_days,
            previous_days
          );
          await saveSnapshot(
            ctx,
            "compare_periods",
            { metric, page_url, current_days, previous_days },
            comparison
          );
          return { success: true, data: comparison };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    get_experiments: tool({
      description:
        "Get active A/B tests and feature flag experiments with variant distribution. Shows which experiments are running, how traffic is split between variants, and participation counts. Useful for understanding if changes might be due to an experiment.",
      inputSchema: z.object({
        days: z
          .number()
          .min(1)
          .max(90)
          .default(30)
          .describe("Number of days to look back for experiment activity (default: 30)"),
      }),
      execute: async ({ days }) => {
        try {
          const experiments = await ctx.provider.getExperiments(days);
          await saveSnapshot(ctx, "get_experiments", { days }, experiments);
          return { success: true, data: experiments };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),
  };
}

export type AnalyticsTools = ReturnType<typeof createAnalyticsTools>;

/**
 * Save database tool call result to analytics_snapshots
 */
async function saveDatabaseSnapshot(
  ctx: DatabaseToolContext,
  toolName: string,
  toolInput: unknown,
  toolOutput: unknown
) {
  try {
    await ctx.supabase.from("analytics_snapshots").insert({
      analysis_id: ctx.analysisId,
      user_id: ctx.userId,
      tool_name: toolName,
      tool_input: toolInput,
      tool_output: toolOutput,
      provider: "supabase",
      page_url: ctx.pageUrl,
    });
  } catch (err) {
    console.error("Failed to save database snapshot:", err);
  }
}

/**
 * Create database tools for Supabase integration
 * These track business outcomes (signups, orders) rather than pageviews
 */
export function createDatabaseTools(ctx: DatabaseToolContext) {
  return {
    discover_tables: tool({
      description:
        "Discover what database tables are available and their row counts. Call this first to understand what business data you can track. Look for tables like 'users', 'signups', 'orders', 'waitlist' that indicate conversions.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const schema = await ctx.adapter.getSchema();
          await saveDatabaseSnapshot(ctx, "discover_tables", {}, schema);
          return {
            success: true,
            data: {
              tables: schema.tables.map((t) => ({
                name: t.name,
                row_count: t.row_count,
                columns: t.columns.slice(0, 10), // Limit columns shown
              })),
              cached_at: schema.cached_at,
            },
          };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    get_table_count: tool({
      description:
        "Get the current row count for a specific table. Use this to check conversion metrics like signups, orders, or waitlist entries.",
      inputSchema: z.object({
        table_name: z
          .string()
          .describe("The table name to count rows from (e.g., 'users', 'orders')"),
      }),
      execute: async ({ table_name }) => {
        try {
          const count = await ctx.adapter.getTableRowCount(table_name);
          await saveDatabaseSnapshot(ctx, "get_table_count", { table_name }, { count });
          return {
            success: true,
            data: { table_name, row_count: count },
          };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    identify_conversion_tables: tool({
      description:
        "Automatically identify tables that likely represent business conversions (signups, orders, waitlist). Returns table names that match common conversion patterns.",
      inputSchema: z.object({}),
      execute: async () => {
        try {
          const tables = await ctx.adapter.identifyConversionTables();
          await saveDatabaseSnapshot(ctx, "identify_conversion_tables", {}, { tables });
          return {
            success: true,
            data: {
              conversion_tables: tables,
              hint: "These tables likely track business outcomes. Compare their row counts over time to measure real conversions.",
            },
          };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    compare_table_counts: tool({
      description:
        "Compare row counts between current and previous snapshots to measure growth. Use this to see if signups or orders increased since a page change.",
      inputSchema: z.object({
        current_counts: z
          .record(z.string(), z.number())
          .describe("Current row counts by table name, e.g. { users: 150, orders: 45 }"),
        previous_counts: z
          .record(z.string(), z.number())
          .describe("Previous row counts by table name from an earlier snapshot"),
      }),
      execute: async ({ current_counts, previous_counts }) => {
        try {
          const comparisons = ctx.adapter.compareCounts(
            current_counts as Record<string, number>,
            previous_counts as Record<string, number>
          );
          await saveDatabaseSnapshot(
            ctx,
            "compare_table_counts",
            { current_counts, previous_counts },
            comparisons
          );
          return { success: true, data: comparisons };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),

    get_table_structure: tool({
      description:
        "Get the column structure of a table to understand what data it tracks. Useful for determining if a table is relevant for conversion tracking.",
      inputSchema: z.object({
        table_name: z.string().describe("The table name to inspect"),
      }),
      execute: async ({ table_name }) => {
        try {
          const structure = await ctx.adapter.getTableStructure(table_name);
          await saveDatabaseSnapshot(ctx, "get_table_structure", { table_name }, structure);
          return { success: true, data: structure };
        } catch (err) {
          const error = err instanceof Error ? err.message : "Unknown error";
          return { success: false, error };
        }
      },
    }),
  };
}

export type DatabaseTools = ReturnType<typeof createDatabaseTools>;
