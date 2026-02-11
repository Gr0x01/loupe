import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { validateUrl, isBlockedDomain } from "@/lib/url-validation";
import { captureEvent, flushEvents } from "@/lib/posthog-server";

const RATE_LIMIT_WINDOW_MINUTES = 60;
const RATE_LIMIT_MAX_REQUESTS = 5;
const MAX_URL_LENGTH = 2048;
const MAX_EMAIL_LENGTH = 320;

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      null;

    if (!ip) {
      return NextResponse.json(
        { error: "Unable to process request" },
        { status: 400 }
      );
    }

    const { url, email } = await req.json();

    if (!url || typeof url !== "string" || url.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    if (email && (typeof email !== "string" || email.length > MAX_EMAIL_LENGTH)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    // URL validation with SSRF protection
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const validation = validateUrl(parsedUrl.toString());
    if (!validation.valid) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block major domains — no point auditing google.com
    if (isBlockedDomain(parsedUrl.toString())) {
      return NextResponse.json(
        { error: "This domain cannot be audited. Try a site you own!" },
        { status: 403 }
      );
    }

    // Check if user is logged in (optional — free tool stays open)
    let userId: string | null = null;
    try {
      const authClient = await createClient();
      const { data: { user } } = await authClient.auth.getUser();
      userId = user?.id ?? null;
    } catch {
      // Not logged in — that's fine
    }

    const supabase = createServiceClient();

    // Atomic rate-limited insert via RPC
    const { data, error } = await supabase.rpc("create_analysis_if_allowed", {
      p_ip: ip,
      p_url: parsedUrl.toString(),
      p_email: email || null,
      p_window_minutes: RATE_LIMIT_WINDOW_MINUTES,
      p_max_requests: RATE_LIMIT_MAX_REQUESTS,
      p_user_id: userId,
    });

    if (error) {
      console.error("Supabase RPC error:", error);
      return NextResponse.json(
        { error: "Failed to create analysis" },
        { status: 500 }
      );
    }

    if (data.error === "rate_limit_exceeded") {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(RATE_LIMIT_WINDOW_MINUTES * 60) },
        }
      );
    }

    // Trigger Inngest background job
    await inngest.send({
      name: "analysis/created",
      data: { analysisId: data.id, url: parsedUrl.toString() },
    });

    // Track audit server-side (captures both logged-in and anonymous audits)
    if (userId) {
      captureEvent(userId, "audit_started_server", {
        domain: parsedUrl.hostname,
        url: parsedUrl.toString(),
      });
      await flushEvents();
    }

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
