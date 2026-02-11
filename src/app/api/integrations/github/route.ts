import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { safeDecrypt } from "@/lib/crypto";

// DELETE /api/integrations/github - disconnect GitHub entirely
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get integration and repos to clean up webhooks
  const { data: integration } = await serviceClient
    .from("integrations")
    .select("id, access_token")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "Not connected" }, { status: 404 });
  }

  // Get all repos to delete their webhooks
  const { data: repos } = await serviceClient
    .from("repos")
    .select("full_name, webhook_id")
    .eq("integration_id", integration.id);

  // Delete webhooks from GitHub (best effort)
  if (repos && repos.length > 0) {
    for (const repo of repos) {
      if (repo.webhook_id) {
        try {
          // Decrypt token before API call (may be encrypted with enc: prefix)
          const accessToken = safeDecrypt(integration.access_token);
          await fetch(
            `https://api.github.com/repos/${repo.full_name}/hooks/${repo.webhook_id}`,
            {
              method: "DELETE",
              headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Accept": "application/vnd.github.v3+json",
              },
            }
          );
        } catch (err) {
          console.error(`Failed to delete webhook for ${repo.full_name}:`, err);
          // Continue anyway - webhook might already be deleted
        }
      }
    }
  }

  // Delete integration (cascades to repos via FK)
  const { error } = await serviceClient
    .from("integrations")
    .delete()
    .eq("id", integration.id);

  if (error) {
    console.error("Failed to delete GitHub integration:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
