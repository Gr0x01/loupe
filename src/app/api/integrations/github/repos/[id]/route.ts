import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// DELETE /api/integrations/github/repos/[id] - disconnect a repo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json({ error: "Invalid repo ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get repo
  const { data: repo } = await serviceClient
    .from("repos")
    .select("id, full_name, webhook_id, integration_id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!repo) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  // Get integration for access token
  const { data: integration } = await serviceClient
    .from("integrations")
    .select("access_token")
    .eq("id", repo.integration_id)
    .single();

  // Delete webhook from GitHub (best effort)
  if (repo.webhook_id && integration?.access_token) {
    try {
      await fetch(
        `https://api.github.com/repos/${repo.full_name}/hooks/${repo.webhook_id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${integration.access_token}`,
            "Accept": "application/vnd.github.v3+json",
          },
        }
      );
    } catch (err) {
      console.error(`Failed to delete webhook for ${repo.full_name}:`, err);
      // Continue anyway
    }
  }

  // Delete repo record
  const { error } = await serviceClient
    .from("repos")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Failed to delete repo:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
