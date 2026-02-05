import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { safeEncrypt } from "@/lib/crypto";

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
      // RPC doesn't exist, try direct schema query
      // This will work with service role key or if user has granted access
      const { data: pgTables, error: pgError } = await testClient
        .from("information_schema.tables" as "information_schema")
        .select("table_name")
        .eq("table_schema", "public")
        .limit(50);

      if (pgError) {
        // Can't access schema directly, try to list tables via REST
        // Make a simple health check instead
        const healthCheck = await fetch(`${normalizedUrl}/rest/v1/`, {
          headers: {
            apikey: keyToUse,
            Authorization: `Bearer ${keyToUse}`,
          },
        });

        if (!healthCheck.ok) {
          return NextResponse.json(
            { error: "Could not connect to Supabase project. Please check your credentials." },
            { status: 400 }
          );
        }

        // Connection works but no schema access (likely RLS blocking)
        hasSchemaAccess = false;
      } else {
        hasSchemaAccess = true;
        schemaInfo.tables = (pgTables || []).map((t: { table_name: string }) => t.table_name);
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

    const serviceClient = createServiceClient();

    // Check if Supabase is already connected
    const { data: existing } = await serviceClient
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "supabase")
      .maybeSingle();

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

    if (existing) {
      // Update existing integration
      const { error: updateError } = await serviceClient
        .from("integrations")
        .update(integrationData)
        .eq("id", existing.id);

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
