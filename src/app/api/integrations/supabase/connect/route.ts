import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { safeEncrypt } from "@/lib/crypto";
import { canConnectAnalytics, type SubscriptionTier } from "@/lib/permissions";

/**
 * POST /api/integrations/supabase/connect
 * Connect user's Supabase project by validating and storing credentials
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { projectUrl, anonKey, serviceRoleKey } = body;

    if (!projectUrl) {
      return NextResponse.json(
        { error: "Project URL is required" },
        { status: 400 }
      );
    }

    if (!anonKey && !serviceRoleKey) {
      return NextResponse.json(
        { error: "Either Anon Key or Service Role Key is required" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Check user's tier and analytics limit
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const tier = (profile?.subscription_tier as SubscriptionTier) || "free";

    // Count existing analytics integrations
    const { count: analyticsCount } = await serviceClient
      .from("integrations")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("provider", ["posthog", "ga4", "supabase"]);

    // Check if Supabase is already connected (updating doesn't count against limit)
    const { data: existingSupabase } = await serviceClient
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "supabase")
      .maybeSingle();

    // If not already connected and at limit, block
    if (!existingSupabase && !canConnectAnalytics(tier, analyticsCount || 0)) {
      return NextResponse.json(
        {
          error: "analytics_limit_reached",
          message: "Upgrade to connect more analytics integrations",
          upgrade_url: "/pricing",
        },
        { status: 403 }
      );
    }

    // Validate project URL format
    let normalizedUrl: string;
    try {
      const parsed = new URL(projectUrl);
      // Accept both full URLs and project refs
      if (parsed.hostname.endsWith(".supabase.co")) {
        normalizedUrl = `${parsed.protocol}//${parsed.hostname}`;
      } else {
        return NextResponse.json(
          { error: "Invalid Supabase project URL. Expected format: https://xyz.supabase.co" },
          { status: 400 }
        );
      }
    } catch {
      // Try treating it as a project ref (alphanumeric, typically 10-30 chars)
      if (/^[a-z0-9]{10,30}$/.test(projectUrl)) {
        normalizedUrl = `https://${projectUrl}.supabase.co`;
      } else {
        return NextResponse.json(
          { error: "Invalid project URL format" },
          { status: 400 }
        );
      }
    }

    // Use service role key if provided, otherwise anon key
    const keyToUse = serviceRoleKey || anonKey;
    const keyType = serviceRoleKey ? "service_role" : "anon";

    // Test connection by trying to query the schema
    const testClient = createSupabaseJsClient(normalizedUrl, keyToUse);

    // Try to introspect schema - this tests if credentials work
    const { data: tables, error: schemaError } = await testClient.rpc(
      "get_table_info"
    ).maybeSingle();

    // If RPC doesn't exist, try a simpler test
    let schemaInfo: { tables: string[]; row_counts: Record<string, number> } = {
      tables: [],
      row_counts: {},
    };
    let hasSchemaAccess = false;

    if (schemaError) {
      // RPC doesn't exist - use OpenAPI endpoint to discover tables
      // Supabase/PostgREST returns Swagger 2.0 spec with all table paths
      const openApiResponse = await fetch(`${normalizedUrl}/rest/v1/`, {
        headers: {
          apikey: keyToUse,
          Authorization: `Bearer ${keyToUse}`,
          Accept: "application/openapi+json",
        },
      });

      if (!openApiResponse.ok) {
        return NextResponse.json(
          { error: "Could not connect to Supabase project. Please check your credentials." },
          { status: 400 }
        );
      }

      try {
        const spec = await openApiResponse.json();

        // Extract table names from paths (Swagger 2.0 format)
        // Paths look like: { "/": {...}, "/tablename": {...}, "/rpc/funcname": {...} }
        if (spec.paths && typeof spec.paths === "object") {
          const tableNames = Object.keys(spec.paths)
            .filter((path) =>
              path !== "/" && // Skip root introspection endpoint
              !path.startsWith("/rpc/") // Skip RPC functions
            )
            .map((path) => path.replace(/^\//, "")); // Remove leading slash

          schemaInfo.tables = tableNames;
          hasSchemaAccess = true;
        } else {
          // Unexpected response format
          console.error("Unexpected OpenAPI response format:", Object.keys(spec));
          hasSchemaAccess = false;
        }
      } catch (parseError) {
        console.error("Failed to parse Supabase OpenAPI response:", parseError);
        hasSchemaAccess = false;
      }
    } else {
      hasSchemaAccess = true;
      if (tables && typeof tables === "object") {
        // Type guard for the expected shape
        const tablesData = tables as { tables?: string[]; row_counts?: Record<string, number> };
        if (Array.isArray(tablesData.tables)) {
          schemaInfo.tables = tablesData.tables;
        }
        if (tablesData.row_counts && typeof tablesData.row_counts === "object") {
          schemaInfo.row_counts = tablesData.row_counts;
        }
      }
    }

    // Extract project ref from URL
    const projectRef = new URL(normalizedUrl).hostname.split(".")[0];

    const integrationData = {
      provider_account_id: projectRef,
      access_token: safeEncrypt(keyToUse),
      metadata: {
        project_url: normalizedUrl,
        key_type: keyType,
        has_schema_access: hasSchemaAccess,
        tables: schemaInfo.tables,
        connected_at: new Date().toISOString(),
      },
      updated_at: new Date().toISOString(),
    };

    if (existingSupabase) {
      // Update existing integration
      const { error: updateError } = await serviceClient
        .from("integrations")
        .update(integrationData)
        .eq("id", existingSupabase.id);

      if (updateError) {
        console.error("Failed to update Supabase integration:", updateError);
        return NextResponse.json(
          { error: "Failed to update integration" },
          { status: 500 }
        );
      }
    } else {
      // Create new integration
      const { error: insertError } = await serviceClient
        .from("integrations")
        .insert({
          user_id: user.id,
          provider: "supabase",
          ...integrationData,
        });

      if (insertError) {
        console.error("Failed to create Supabase integration:", insertError);
        return NextResponse.json(
          { error: "Failed to save integration" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      has_schema_access: hasSchemaAccess,
      tables_found: schemaInfo.tables.length,
      key_type: keyType,
    });
  } catch (err) {
    console.error("Supabase connect error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
