import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { safeEncrypt } from "@/lib/crypto";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const redirectUrl = new URL("/settings/integrations", request.url);

  // Handle GitHub OAuth errors
  if (error) {
    console.error("GitHub OAuth error:", error);
    redirectUrl.searchParams.set("error", "github_denied");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    redirectUrl.searchParams.set("error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify state matches cookie (CSRF protection)
  const cookieStore = await cookies();
  const storedState = cookieStore.get("github_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    console.error("GitHub OAuth state mismatch");
    redirectUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  // Clear the state cookie
  cookieStore.delete("github_oauth_state");

  // Must be authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error("GitHub token exchange error:", tokenData.error);
      redirectUrl.searchParams.set("error", "token_exchange");
      return NextResponse.redirect(redirectUrl);
    }

    const { access_token, scope } = tokenData;

    // Fetch GitHub user info
    const userResponse = await fetch("https://api.github.com/user", {
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "Accept": "application/vnd.github.v3+json",
      },
    });

    const githubUser = await userResponse.json();

    // Store in integrations table (upsert)
    const serviceClient = createServiceClient();
    const { error: upsertError } = await serviceClient
      .from("integrations")
      .upsert({
        user_id: user.id,
        provider: "github",
        provider_account_id: String(githubUser.id),
        access_token: safeEncrypt(access_token),
        scope,
        metadata: {
          username: githubUser.login,
          avatar_url: githubUser.avatar_url,
          name: githubUser.name,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider",
      });

    if (upsertError) {
      console.error("Failed to store GitHub integration:", upsertError);
      redirectUrl.searchParams.set("error", "storage");
      return NextResponse.redirect(redirectUrl);
    }

    redirectUrl.searchParams.set("success", "github");
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error("GitHub OAuth callback error:", err);
    redirectUrl.searchParams.set("error", "unknown");
    return NextResponse.redirect(redirectUrl);
  }
}
