import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

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

  try {
    // Verify the installation is accessible before storing
    const { getInstallationToken } = await import("@/lib/github/app");
    try {
      await getInstallationToken(installationIdNum);
    } catch (verifyErr) {
      console.error("Failed to verify GitHub installation:", verifyErr);
      redirectUrl.searchParams.set("error", "installation_verification_failed");
      return NextResponse.redirect(redirectUrl);
    }

    // Store installation in integrations table (upsert)
    const serviceClient = createServiceClient();
    const { error: upsertError } = await serviceClient
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
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider",
      });

    if (upsertError) {
      console.error("Failed to store GitHub App installation:", upsertError);
      redirectUrl.searchParams.set("error", "storage");
      return NextResponse.redirect(redirectUrl);
    }

    redirectUrl.searchParams.set("success", "github");
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error("GitHub App setup error:", err);
    redirectUrl.searchParams.set("error", "unknown");
    return NextResponse.redirect(redirectUrl);
  }
}
