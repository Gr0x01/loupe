/**
 * Supabase implementation of database analytics
 * Unlike PostHog/GA4, this tracks database row counts rather than pageviews
 */

import { createClient } from "@supabase/supabase-js";
import type {
  SupabaseCredentials,
  SupabaseSchemaInfo,
  SupabaseTableInfo,
  SupabaseTableStats,
  SupabasePeriodComparison,
} from "./types";

/**
 * Validate table name to prevent injection attacks
 * PostgreSQL identifiers: start with letter/underscore, alphanumeric/underscore, max 63 chars
 */
function isValidTableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name) && name.length <= 63;
}

export class SupabaseAdapter {
  private client: ReturnType<typeof createClient>;
  private credentials: SupabaseCredentials;

  constructor(credentials: SupabaseCredentials) {
    const key = credentials.serviceRoleKey || credentials.anonKey;
    if (!key) {
      throw new Error("Either anonKey or serviceRoleKey is required");
    }

    this.credentials = credentials;
    this.client = createClient(credentials.projectUrl, key);
  }

  /**
   * Get schema info including tables and row counts
   * Uses OpenAPI endpoint to discover all tables, then queries row counts
   */
  async getSchema(): Promise<SupabaseSchemaInfo> {
    const tables: SupabaseTableInfo[] = [];
    const key = this.credentials.serviceRoleKey || this.credentials.anonKey;

    // Fetch OpenAPI spec to discover tables (Swagger 2.0 format)
    const openApiResponse = await fetch(`${this.credentials.projectUrl}/rest/v1/`, {
      headers: {
        apikey: key!,
        Authorization: `Bearer ${key}`,
        Accept: "application/openapi+json",
      },
    });

    if (!openApiResponse.ok) {
      return { tables: [], cached_at: new Date().toISOString() };
    }

    let tableNames: string[] = [];
    try {
      const spec = await openApiResponse.json();

      if (spec.paths && typeof spec.paths === "object") {
        tableNames = Object.keys(spec.paths)
          .filter((path) => path !== "/" && !path.startsWith("/rpc/"))
          .map((path) => path.replace(/^\//, ""));
      }
    } catch {
      return { tables: [], cached_at: new Date().toISOString() };
    }

    // Get row counts for discovered tables
    for (const tableName of tableNames) {
      try {
        const { count, error } = await this.client
          .from(tableName)
          .select("*", { count: "exact", head: true });

        if (!error) {
          tables.push({
            schema: "public",
            name: tableName,
            row_count: count || 0,
            columns: [],
          });
        }
      } catch {
        // Skip tables we can't access
      }
    }

    return {
      tables,
      cached_at: new Date().toISOString(),
    };
  }

  /**
   * Get current row counts for specified tables
   */
  async getTableStats(tableNames: string[]): Promise<SupabaseTableStats[]> {
    const stats: SupabaseTableStats[] = [];

    for (const tableName of tableNames) {
      if (!isValidTableName(tableName)) {
        continue; // Skip invalid table names
      }

      try {
        const { count, error } = await this.client
          .from(tableName)
          .select("*", { count: "exact", head: true });

        if (!error) {
          stats.push({
            table_name: tableName,
            row_count: count || 0,
          });
        }
      } catch {
        // Skip tables we can't access
      }
    }

    return stats;
  }

  /**
   * Get row count for a single table
   */
  async getTableRowCount(tableName: string): Promise<number> {
    if (!isValidTableName(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const { count, error } = await this.client
      .from(tableName)
      .select("*", { count: "exact", head: true });

    if (error) {
      throw new Error(`Failed to get row count for ${tableName}: ${error.message}`);
    }

    return count || 0;
  }

  /**
   * Identify potential "conversion" tables based on common naming patterns
   * Returns tables that likely represent signups, orders, etc.
   */
  async identifyConversionTables(): Promise<string[]> {
    const schema = await this.getSchema();

    const conversionPatterns = [
      // User signups
      /^(users?|profiles?|accounts?|signups?|registrations?)$/i,
      // Purchases/orders
      /^(orders?|purchases?|transactions?|payments?|checkouts?)$/i,
      // Leads/contacts
      /^(leads?|contacts?|inquir(y|ies)|waitlist|subscribers?)$/i,
      // Bookings
      /^(bookings?|appointments?|reservations?)$/i,
      // Generic conversions
      /^(conversions?|events?|submissions?)$/i,
    ];

    const conversionTables: string[] = [];

    for (const table of schema.tables) {
      for (const pattern of conversionPatterns) {
        if (pattern.test(table.name)) {
          conversionTables.push(table.name);
          break;
        }
      }
    }

    return conversionTables;
  }

  /**
   * Compare row counts between two snapshots
   * Used for tracking changes over time
   */
  compareCounts(
    currentCounts: Record<string, number>,
    previousCounts: Record<string, number>
  ): SupabasePeriodComparison[] {
    const comparisons: SupabasePeriodComparison[] = [];

    for (const [tableName, currentCount] of Object.entries(currentCounts)) {
      const previousCount = previousCounts[tableName] || 0;
      const change = currentCount - previousCount;
      const changePercent =
        previousCount === 0
          ? currentCount > 0
            ? 100
            : 0
          : (change / previousCount) * 100;

      comparisons.push({
        table_name: tableName,
        current_count: currentCount,
        previous_count: previousCount,
        change,
        change_percent: Math.round(changePercent * 10) / 10,
        direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
      });
    }

    return comparisons;
  }

  /**
   * Get table structure (for LLM context)
   * Column info extracted from OpenAPI spec, row count from direct query
   */
  async getTableStructure(tableName: string): Promise<{
    columns: { name: string; type: string }[];
    row_count: number;
  }> {
    if (!isValidTableName(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    // Get column info from OpenAPI spec
    const key = this.credentials.serviceRoleKey || this.credentials.anonKey;
    let columns: { name: string; type: string }[] = [];

    try {
      const restResponse = await fetch(`${this.credentials.projectUrl}/rest/v1/`, {
        headers: {
          apikey: key!,
          Authorization: `Bearer ${key}`,
          Accept: "application/openapi+json",
        },
      });

      if (restResponse.ok) {
        const openApiSpec = await restResponse.json();
        // OpenAPI spec has table definitions under "definitions" key
        const tableDefinition = openApiSpec.definitions?.[tableName];
        if (tableDefinition?.properties) {
          columns = Object.entries(tableDefinition.properties).map(
            ([name, prop]) => ({
              name,
              type: (prop as { type?: string; format?: string }).format ||
                (prop as { type?: string }).type ||
                "unknown",
            })
          );
        }
      }
    } catch {
      // Column info unavailable, continue with just row count
    }

    const { count } = await this.client
      .from(tableName)
      .select("*", { count: "exact", head: true });

    return {
      columns,
      row_count: count || 0,
    };
  }

  /**
   * Test connection and return basic info
   */
  async testConnection(): Promise<{
    success: boolean;
    tables_found: number;
    has_schema_access: boolean;
    error?: string;
  }> {
    try {
      const schema = await this.getSchema();

      return {
        success: true,
        tables_found: schema.tables.length,
        has_schema_access: schema.tables.length > 0,
      };
    } catch (err) {
      return {
        success: false,
        tables_found: 0,
        has_schema_access: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  }
}

/**
 * Create a Supabase adapter from stored integration credentials
 */
export function createSupabaseAdapter(
  projectUrl: string,
  accessToken: string,
  keyType: "anon" | "service_role"
): SupabaseAdapter {
  const credentials: SupabaseCredentials = {
    projectUrl,
    ...(keyType === "service_role"
      ? { serviceRoleKey: accessToken }
      : { anonKey: accessToken }),
  };

  return new SupabaseAdapter(credentials);
}
