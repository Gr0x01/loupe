import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getGoogleUserInfo } from "@/lib/google-oauth";
import { safeEncrypt } from "@/lib/crypto";
import { canConnectAnalytics, type SubscriptionTier } from "@/lib/permissions";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const redirectUrl = new URL("/settings/integrations", request.url);

  // Handle Google OAuth errors
  if (error) {
    console.error("Google OAuth error:", error);
    redirectUrl.searchParams.set("error", "ga4_denied");
    return NextResponse.redirect(redirectUrl);
  }

  if (!code || !state) {
    redirectUrl.searchParams.set("error", "missing_params");
    return NextResponse.redirect(redirectUrl);
  }

  // Verify state matches cookie (CSRF protection)
  const cookieStore = await cookies();
  const storedState = cookieStore.get("ga4_oauth_state")?.value;

  if (!storedState || storedState !== state) {
    console.error("Google OAuth state mismatch");
    redirectUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(redirectUrl);
  }

  // Clear the state cookie
  cookieStore.delete("ga4_oauth_state");

  // Must be authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
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

    // Check if GA4 is already connected (updating doesn't count against limit)
    const { data: existingGa4 } = await serviceClient
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "ga4")
      .maybeSingle();

    // If not already connected and at limit, block
    if (!existingGa4 && !canConnectAnalytics(tier, analyticsCount || 0)) {
      redirectUrl.searchParams.set("error", "analytics_limit");
      return NextResponse.redirect(redirectUrl);
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/ga4/callback`;

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    // Get Google user info for provider_account_id
    const userInfo = await getGoogleUserInfo(tokens.access_token);

    // Calculate token expiry timestamp
    const tokenExpiresAt = Date.now() + tokens.expires_in * 1000;

    // Store in integrations table (upsert)
    // Initially property_id is null - user will select it in the next step
    const { error: upsertError } = await serviceClient
      .from("integrations")
      .upsert({
        user_id: user.id,
        provider: "ga4",
        provider_account_id: userInfo.id,
        access_token: safeEncrypt(tokens.access_token),
        metadata: {
          refresh_token: tokens.refresh_token ? safeEncrypt(tokens.refresh_token) : null,
          token_expires_at: tokenExpiresAt,
          property_id: null, // Will be set when user selects property
          property_name: null,
          email: userInfo.email,
          name: userInfo.name,
        },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "user_id,provider",
      });

    if (upsertError) {
      console.error("Failed to store GA4 integration:", upsertError);
      redirectUrl.searchParams.set("error", "storage");
      return NextResponse.redirect(redirectUrl);
    }

    // Redirect with pending=ga4 to trigger property selection modal
    redirectUrl.searchParams.set("pending", "ga4");
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error("Google OAuth callback error:", err);
    redirectUrl.searchParams.set("error", "unknown");
    return NextResponse.redirect(redirectUrl);
  }
}
