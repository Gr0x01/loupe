import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  // Must be authenticated to connect GA4
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const clientId = process.env.GOOGLE_ANALYTICS_CLIENT_ID;
  if (!clientId) {
    console.error("GOOGLE_ANALYTICS_CLIENT_ID not configured");
    return NextResponse.redirect(new URL("/settings/integrations?error=config", request.url));
  }

  // Generate state token for CSRF protection
  const state = crypto.randomUUID();

  // Store state in cookie (httpOnly, short-lived)
  const cookieStore = await cookies();
  cookieStore.set("ga4_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/integrations/ga4/callback`;

  // Request analytics.readonly scope for GA4 Data API access
  const scope = [
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", scope);
  googleAuthUrl.searchParams.set("state", state);
  googleAuthUrl.searchParams.set("access_type", "offline"); // Required to get refresh_token
  googleAuthUrl.searchParams.set("prompt", "consent"); // Force consent to ensure refresh_token is returned

  return NextResponse.redirect(googleAuthUrl);
}
