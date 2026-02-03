import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, redirectTo } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Validate redirectTo is on our own origin (prevent open redirect)
    const origin = new URL(req.url).origin;
    let safeRedirect: string | undefined;
    if (redirectTo && typeof redirectTo === "string") {
      try {
        const parsed = new URL(redirectTo);
        if (parsed.origin === origin) safeRedirect = redirectTo;
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
