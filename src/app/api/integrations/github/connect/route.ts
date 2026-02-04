import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  // Must be authenticated to connect GitHub
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Generate state token for CSRF protection
  const state = crypto.randomUUID();

  // Store state in cookie (httpOnly, short-lived)
  const cookieStore = await cookies();
  cookieStore.set("github_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10, // 10 minutes
    path: "/",
  });

  // Redirect to GitHub App installation page
  // The app slug is derived from the app name: "Loupe by getloupe.io" -> "loupe-by-getloupe-io"
  const appSlug = "loupe-by-getloupe-io";
  const installUrl = new URL(`https://github.com/apps/${appSlug}/installations/new`);
  installUrl.searchParams.set("state", state);

  return NextResponse.redirect(installUrl);
}
