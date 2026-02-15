import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { safeEncrypt } from "@/lib/crypto";
import { canConnectAnalytics, type SubscriptionTier } from "@/lib/permissions";
import { createSupabaseAdapter } from "@/lib/analytics/supabase-adapter";

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

    // Validate credentials by hitting the OpenAPI endpoint directly
    const testResponse = await fetch(`${normalizedUrl}/rest/v1/`, {
      headers: { apikey: keyToUse, Authorization: `Bearer ${keyToUse}` },
    });

    if (!testResponse.ok) {
      return NextResponse.json(
        { error: "Could not connect to Supabase project. Please check your credentials." },
        { status: 400 }
      );
    }

    // Discover tables via SupabaseAdapter (getSchema returns empty on parse errors, never throws)
    const adapter = createSupabaseAdapter(normalizedUrl, keyToUse, keyType as "anon" | "service_role");
    const schema = await adapter.getSchema();
    const tableNames = schema.tables.map((t) => t.name);
    const hasSchemaAccess = tableNames.length > 0;

    // Extract project ref from URL
    const projectRef = new URL(normalizedUrl).hostname.split(".")[0];

    const metadata: Record<string, unknown> = {
      project_url: normalizedUrl,
      key_type: keyType,
      has_schema_access: hasSchemaAccess,
      tables: tableNames,
    };
    if (!existingSupabase) {
      metadata.connected_at = new Date().toISOString();
    }

    const integrationData = {
      provider_account_id: projectRef,
      access_token: safeEncrypt(keyToUse),
      metadata,
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
      tables_found: tableNames.length,
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
