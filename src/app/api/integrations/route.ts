import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET /api/integrations - list connected integrations
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get GitHub integration
  const { data: github } = await serviceClient
    .from("integrations")
    .select("id, provider_account_id, metadata, created_at")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .maybeSingle();

  // Get connected repos if GitHub is connected
  let repos: { id: string; full_name: string; default_branch: string }[] = [];
  if (github) {
    const { data: repoData } = await serviceClient
      .from("repos")
      .select("id, full_name, default_branch")
      .eq("user_id", user.id);
    repos = repoData || [];
  }

  // Get PostHog integration
  const { data: posthog } = await serviceClient
    .from("integrations")
    .select("id, provider_account_id, metadata, created_at")
    .eq("user_id", user.id)
    .eq("provider", "posthog")
    .maybeSingle();

  // Get GA4 integration
  const { data: ga4 } = await serviceClient
    .from("integrations")
    .select("id, provider_account_id, metadata, created_at")
    .eq("user_id", user.id)
    .eq("provider", "ga4")
    .maybeSingle();

  // Get Supabase integration
  const { data: supabaseIntegration } = await serviceClient
    .from("integrations")
    .select("id, provider_account_id, metadata, created_at")
    .eq("user_id", user.id)
    .eq("provider", "supabase")
    .maybeSingle();

  return NextResponse.json({
    github: github ? {
      connected: true,
      username: github.metadata?.username,
      avatar_url: github.metadata?.avatar_url,
      connected_at: github.created_at,
      repos,
    } : null,
    posthog: posthog ? {
      connected: true,
      project_id: posthog.provider_account_id,
      host: posthog.metadata?.host || "https://us.i.posthog.com",
      connected_at: posthog.created_at,
    } : null,
    ga4: ga4 ? {
      connected: true,
      property_id: ga4.metadata?.property_id || null,
      property_name: ga4.metadata?.property_name || null,
      email: ga4.metadata?.email,
      pending_property_selection: !ga4.metadata?.property_id,
      connected_at: ga4.created_at,
    } : null,
    supabase: supabaseIntegration ? {
      connected: true,
      project_ref: supabaseIntegration.provider_account_id,
      project_url: supabaseIntegration.metadata?.project_url,
      key_type: supabaseIntegration.metadata?.key_type || "anon",
      has_schema_access: supabaseIntegration.metadata?.has_schema_access ?? false,
      tables: supabaseIntegration.metadata?.tables || [],
      connected_at: supabaseIntegration.created_at,
    } : null,
  });
}
