import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { listInstallationRepos, createRepoWebhook, deleteRepoWebhook } from "@/lib/github/app";

// Validate repo fullName format (owner/repo) to prevent path manipulation
const REPO_FULLNAME_REGEX = /^[a-zA-Z0-9._-]+\/[a-zA-Z0-9._-]+$/;

// GET /api/integrations/github/repos - list repos accessible to the installation
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get GitHub App installation
  const { data: integration } = await serviceClient
    .from("integrations")
    .select("metadata")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .maybeSingle();

  if (!integration?.metadata?.installation_id) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  const installationId = Number(integration.metadata.installation_id);
  if (isNaN(installationId)) {
    return NextResponse.json({ error: "Invalid installation data" }, { status: 500 });
  }

  try {
    // Fetch repos from GitHub using installation token
    const repos = await listInstallationRepos(installationId);

    // Get already connected repos
    const { data: connectedRepos } = await serviceClient
      .from("repos")
      .select("github_repo_id")
      .eq("user_id", user.id);

    const connectedIds = new Set(connectedRepos?.map(r => r.github_repo_id) || []);

    // Return repos with connected status
    return NextResponse.json({
      repos: repos.map(repo => ({
        id: repo.id,
        full_name: repo.full_name,
        default_branch: repo.default_branch,
        private: repo.private,
        connected: connectedIds.has(repo.id),
      })),
    });

  } catch (err) {
    console.error("Failed to fetch GitHub repos:", err);
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}

// POST /api/integrations/github/repos - connect a repo (create webhook)
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { repoId: number; fullName: string; defaultBranch?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { repoId, fullName, defaultBranch = "main" } = body;

  if (!repoId || !fullName) {
    return NextResponse.json({ error: "repoId and fullName required" }, { status: 400 });
  }

  // Validate fullName format to prevent path manipulation attacks
  if (!REPO_FULLNAME_REGEX.test(fullName)) {
    return NextResponse.json({ error: "Invalid repo name format" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Get GitHub App installation
  const { data: integration } = await serviceClient
    .from("integrations")
    .select("id, metadata")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .maybeSingle();

  if (!integration?.metadata?.installation_id) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  const installationId = Number(integration.metadata.installation_id);
  if (isNaN(installationId)) {
    return NextResponse.json({ error: "Invalid installation data" }, { status: 500 });
  }

  // Check if already connected
  const { data: existing } = await serviceClient
    .from("repos")
    .select("id")
    .eq("user_id", user.id)
    .eq("github_repo_id", repoId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "Repo already connected" }, { status: 409 });
  }

  // Limit: 1 repo per user (Pro can have more in the future)
  const { count } = await serviceClient
    .from("repos")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (count && count >= 1) {
    return NextResponse.json(
      { error: "Free tier limited to 1 repo. Upgrade for more." },
      { status: 403 }
    );
  }

  // Generate webhook secret
  const webhookSecret = crypto.randomUUID();
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`;
  const isLocalhost = webhookUrl.includes("localhost");

  let webhookId: number | null = null;

  // Only create webhook if not localhost (GitHub can't reach localhost)
  if (!isLocalhost) {
    try {
      webhookId = await createRepoWebhook(
        installationId,
        fullName,
        webhookUrl,
        webhookSecret
      );
    } catch (err) {
      console.error("Failed to create GitHub webhook:", err);
      return NextResponse.json(
        { error: "Failed to create webhook. Please try again." },
        { status: 502 }
      );
    }
  } else {
    console.log(`Skipping webhook creation for localhost. Repo: ${fullName}`);
  }

  // Store in repos table
  try {
    const { data: repo, error: insertError } = await serviceClient
      .from("repos")
      .insert({
        user_id: user.id,
        integration_id: integration.id,
        github_repo_id: repoId,
        full_name: fullName,
        default_branch: defaultBranch,
        webhook_id: webhookId,
        webhook_secret: webhookSecret,
      })
      .select("id, full_name, default_branch")
      .single();

    if (insertError) {
      console.error("Failed to store repo:", insertError);
      // Clean up webhook if we created one
      if (webhookId) {
        try {
          await deleteRepoWebhook(installationId, fullName, webhookId);
        } catch (cleanupErr) {
          console.error("Failed to cleanup webhook after DB error:", cleanupErr);
        }
      }
      return NextResponse.json({ error: "Failed to store repo" }, { status: 500 });
    }

    return NextResponse.json({
      repo,
      warning: isLocalhost ? "Webhook not created (localhost). Use ngrok for webhook testing." : undefined
    });

  } catch (err) {
    console.error("Error connecting repo:", err);
    return NextResponse.json({ error: "Failed to connect repo" }, { status: 500 });
  }
}
