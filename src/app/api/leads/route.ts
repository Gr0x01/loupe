import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // IP-based rate limit: 10 per hour
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (!ip) {
      return NextResponse.json({ error: "Unable to process request" }, { status: 400 });
    }
    const rateLimit = checkRateLimit(`ip:${ip}:leads`, RATE_LIMITS.leads);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { email, source, analysis_id, url } = body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 });
    }

    const authClient = await createClient();

    // Check if user is already authenticated
    const {
      data: { user },
    } = await authClient.auth.getUser();

    // If authenticated, skip lead capture
    if (user) {
      return NextResponse.json({ success: true, skipped: true });
    }

    // Use service client for upsert (bypasses RLS for unauthenticated requests)
    const supabase = createServiceClient();

    // Insert lead into leads table (create if not exists)
    const { error } = await supabase.from("leads").upsert(
      {
        email: email.toLowerCase().trim(),
        source: source || "pdf_download",
        analysis_id,
        url,
        created_at: new Date().toISOString(),
      },
      {
        onConflict: "email",
        ignoreDuplicates: false,
      }
    );

    if (error) {
      // If table doesn't exist, still return success (graceful degradation)
      console.error("Lead capture error:", error);
      return NextResponse.json({ success: true, captured: false });
    }

    return NextResponse.json({ success: true, captured: true });
  } catch (error) {
    console.error("Leads API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
