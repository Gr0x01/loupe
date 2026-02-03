import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

// GET /api/integrations/github/repos - list user's GitHub repos
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Get GitHub integration
  const { data: integration } = await serviceClient
    .from("integrations")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
  }

  try {
    // Fetch repos from GitHub API (paginated, sorted by recently pushed)
    const response = await fetch(
      "https://api.github.com/user/repos?per_page=100&sort=pushed&direction=desc",
      {
        headers: {
          "Authorization": `Bearer ${integration.access_token}`,
          "Accept": "application/vnd.github.v3+json",
        },
      }
    );

    if (!response.ok) {
      console.error("GitHub API error:", response.status);
      return NextResponse.json({ error: "GitHub API error" }, { status: 502 });
    }

    const repos = await response.json();

    // Get already connected repos
    const { data: connectedRepos } = await serviceClient
      .from("repos")
      .select("github_repo_id")
      .eq("user_id", user.id);

    const connectedIds = new Set(connectedRepos?.map(r => r.github_repo_id) || []);

    // Return simplified list
    return NextResponse.json({
      repos: repos.map((repo: {
        id: number;
        full_name: string;
        default_branch: string;
        private: boolean;
      }) => ({
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

  const serviceClient = createServiceClient();

  // Get GitHub integration
  const { data: integration } = await serviceClient
    .from("integrations")
    .select("id, access_token")
    .eq("user_id", user.id)
    .eq("provider", "github")
    .maybeSingle();

  if (!integration) {
    return NextResponse.json({ error: "GitHub not connected" }, { status: 400 });
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
      const webhookResponse = await fetch(
        `https://api.github.com/repos/${fullName}/hooks`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${integration.access_token}`,
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: "web",
            active: true,
            events: ["push"],
            config: {
              url: webhookUrl,
              content_type: "json",
              secret: webhookSecret,
            },
          }),
        }
      );

      if (!webhookResponse.ok) {
        const error = await webhookResponse.json();
        console.error("Failed to create GitHub webhook:", error);
        return NextResponse.json(
          { error: "Failed to create webhook", details: error.message },
          { status: 502 }
        );
      }

      const webhook = await webhookResponse.json();
      webhookId = webhook.id;
    } catch (err) {
      console.error("Error creating webhook:", err);
      return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
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
      // Try to clean up webhook if we created one
      if (webhookId) {
        await fetch(
          `https://api.github.com/repos/${fullName}/hooks/${webhookId}`,
          {
            method: "DELETE",
            headers: {
              "Authorization": `Bearer ${integration.access_token}`,
              "Accept": "application/vnd.github.v3+json",
            },
          }
        );
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
