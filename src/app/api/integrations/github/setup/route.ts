import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getInstallationToken, listInstallationRepos } from "@/lib/github/app";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action"); // "install" or "update"
  const state = searchParams.get("state");

  const redirectUrl = new URL("/settings/integrations", request.url);

  // Verify state matches cookie (CSRF protection)
  const cookieStore = await cookies();
  const storedState = cookieStore.get("github_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    console.error("GitHub App setup state mismatch");
    redirectUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  // Clear the state cookie
  cookieStore.delete("github_oauth_state");

  if (!installationId) {
    redirectUrl.searchParams.set("error", "missing_installation");
    return NextResponse.redirect(redirectUrl);
  }

  // Validate installation ID is a reasonable integer
  const installationIdNum = parseInt(installationId, 10);
  if (isNaN(installationIdNum) || installationIdNum <= 0 || installationIdNum > Number.MAX_SAFE_INTEGER) {
    redirectUrl.searchParams.set("error", "invalid_installation_id");
    return NextResponse.redirect(redirectUrl);
  }

  // Must be authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const serviceClient = createServiceClient();

  try {
    // Verify the installation is accessible
    try {
      await getInstallationToken(installationIdNum);
    } catch (verifyErr) {
      console.error("Failed to verify GitHub installation:", verifyErr);
      redirectUrl.searchParams.set("error", "installation_verification_failed");
      return NextResponse.redirect(redirectUrl);
    }

    // Fetch GitHub account info from the installation
    // We need to use the App JWT to get installation details (not installation token)
    let githubUser: { login: string; avatar_url: string; name?: string } | null = null;
    try {
      const { createAppJWT } = await import("@/lib/github/app");
      const appJwt = await createAppJWT();

      const installationResponse = await fetch(
        `https://api.github.com/app/installations/${installationIdNum}`,
        {
          headers: {
            Authorization: `Bearer ${appJwt}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
      if (installationResponse.ok) {
        const installationData = await installationResponse.json();
        if (installationData.account) {
          githubUser = {
            login: installationData.account.login,
            avatar_url: installationData.account.avatar_url,
          };
        }
      }
    } catch (userErr) {
      // Non-fatal - we can still proceed without user info
      console.warn("Could not fetch GitHub account info:", userErr);
    }

    // Store installation in integrations table (upsert)
    const { data: integration, error: upsertError } = await serviceClient
      .from("integrations")
      .upsert({
        user_id: user.id,
        provider: "github",
        provider_account_id: String(installationIdNum),
        access_token: "", // Not used for GitHub App - we generate tokens on demand
        metadata: {
          installation_id: installationIdNum,
          setup_action: setupAction,
          installed_at: new Date().toISOString(),
          username: githubUser?.login,
          avatar_url: githubUser?.avatar_url,
          name: githubUser?.name,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider",
      })
      .select("id")
      .single();

    if (upsertError) {
      console.error("Failed to store GitHub App installation:", upsertError);
      redirectUrl.searchParams.set("error", "storage");
      return NextResponse.redirect(redirectUrl);
    }

    // Auto-connect repos that the user selected during installation
    try {
      const repos = await listInstallationRepos(installationIdNum);

      if (repos.length > 0) {
        // Check how many repos user already has connected
        const { count: existingCount } = await serviceClient
          .from("repos")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);

        const repoLimit = 1; // Free tier limit
        const availableSlots = repoLimit - (existingCount || 0);

        if (availableSlots > 0) {
          // Connect repos up to the limit
          const reposToConnect = repos.slice(0, availableSlots);
          const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`;
          const isLocalhost = webhookUrl.includes("localhost");

          for (const repo of reposToConnect) {
            // Check if already connected
            const { data: existing } = await serviceClient
              .from("repos")
              .select("id")
              .eq("user_id", user.id)
              .eq("github_repo_id", repo.id)
              .maybeSingle();

            if (existing) continue;

            const webhookSecret = crypto.randomUUID();
            let webhookId: number | null = null;

            // Only create webhook if not localhost
            if (!isLocalhost) {
              try {
                const { createRepoWebhook } = await import("@/lib/github/app");
                webhookId = await createRepoWebhook(
                  installationIdNum,
                  repo.full_name,
                  webhookUrl,
                  webhookSecret
                );
              } catch (webhookErr) {
                console.error(`Failed to create webhook for ${repo.full_name}:`, webhookErr);
                // Continue without webhook - user can retry later
              }
            }

            // Store repo
            await serviceClient.from("repos").insert({
              user_id: user.id,
              integration_id: integration.id,
              github_repo_id: repo.id,
              full_name: repo.full_name,
              default_branch: repo.default_branch,
              webhook_id: webhookId,
              webhook_secret: webhookSecret,
            });
          }
        }
      }
    } catch (repoErr) {
      // Non-fatal - repos can be added manually
      console.error("Failed to auto-connect repos:", repoErr);
    }

    redirectUrl.searchParams.set("success", "github");
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error("GitHub App setup error:", err);
    redirectUrl.searchParams.set("error", "unknown");
    return NextResponse.redirect(redirectUrl);
  }
}
