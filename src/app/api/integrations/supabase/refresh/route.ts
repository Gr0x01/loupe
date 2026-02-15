import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { safeDecrypt } from "@/lib/crypto";
import { createSupabaseAdapter } from "@/lib/analytics/supabase-adapter";

/**
 * POST /api/integrations/supabase/refresh
 * Re-discover tables from connected Supabase project
 */
export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const serviceClient = createServiceClient();

    const { data: integration, error: fetchError } = await serviceClient
      .from("integrations")
      .select("id, access_token, metadata")
      .eq("user_id", user.id)
      .eq("provider", "supabase")
      .maybeSingle();

    if (fetchError || !integration) {
      return NextResponse.json(
        { error: "No Supabase integration found" },
        { status: 404 }
      );
    }

    const metadata = integration.metadata as {
      project_url?: string;
      key_type?: "anon" | "service_role";
      [key: string]: unknown;
    } | null;

    if (!metadata?.project_url || !metadata?.key_type) {
      return NextResponse.json(
        { error: "Integration metadata is incomplete. Please reconnect Supabase." },
        { status: 400 }
      );
    }

    let decryptedKey: string;
    try {
      decryptedKey = safeDecrypt(integration.access_token);
    } catch {
      return NextResponse.json(
        { error: "Could not decrypt stored credentials. Please reconnect Supabase." },
        { status: 400 }
      );
    }

    if (!decryptedKey) {
      return NextResponse.json(
        { error: "Stored credentials are invalid. Please reconnect Supabase." },
        { status: 400 }
      );
    }

    const adapter = createSupabaseAdapter(
      metadata.project_url,
      decryptedKey,
      metadata.key_type
    );

    let schema;
    try {
      schema = await adapter.getSchema();
    } catch {
      return NextResponse.json(
        { error: "Could not reach your Supabase project. Please check that the project is still active." },
        { status: 502 }
      );
    }
    const tableNames = schema.tables.map((t) => t.name);

    const { error: updateError } = await serviceClient
      .from("integrations")
      .update({
        metadata: {
          ...metadata,
          tables: tableNames,
          has_schema_access: tableNames.length > 0,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    if (updateError) {
      console.error("Failed to update Supabase tables:", updateError);
      return NextResponse.json(
        { error: "Failed to update tables" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      tables_found: tableNames.length,
    });
  } catch (err) {
    console.error("Supabase refresh error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
