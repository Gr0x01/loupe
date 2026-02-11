import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // IP-based rate limit: 5 per hour (prevent email spam)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!ip) {
      return NextResponse.json({ error: "Unable to process request" }, { status: 400 });
    }
    const rateLimit = checkRateLimit(`ip:${ip}:magic-link`, RATE_LIMITS.magicLink);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { email, redirectTo } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate redirectTo is on our own origin (prevent open redirect)
    // Require NEXT_PUBLIC_APP_URL to be set - don't fall back to Host header (spoofable)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error("NEXT_PUBLIC_APP_URL not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }
    const allowedOrigin = new URL(appUrl).origin;
    let safeRedirect: string | undefined;
    if (redirectTo && typeof redirectTo === "string") {
      try {
        const parsed = new URL(redirectTo);
        if (parsed.origin === allowedOrigin) safeRedirect = redirectTo;
      } catch {
        // invalid URL, ignore
      }
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: safeRedirect,
      },
    });

    if (error) {
      console.error("Magic link error:", error.message);
      return NextResponse.json({ error: "Failed to send magic link" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Magic link route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
