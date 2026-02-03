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

  return NextResponse.json({
    github: github ? {
      connected: true,
      username: github.metadata?.username,
      avatar_url: github.metadata?.avatar_url,
      connected_at: github.created_at,
      repos,
    } : null,
    // Future: posthog, etc.
  });
}
