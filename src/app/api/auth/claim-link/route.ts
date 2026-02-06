import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { claimPageEmail } from "@/lib/email/templates";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { Resend } from "resend";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP (unauthenticated endpoint)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(`ip:${ip}:claim-link`, RATE_LIMITS.claimLink);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { email, analysisId } = await req.json();

    // Validate email (with length check)
    if (!email || typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Validate analysisId
    if (!analysisId || typeof analysisId !== "string" || !UUID_RE.test(analysisId)) {
      return NextResponse.json({ error: "Valid analysis ID is required" }, { status: 400 });
    }

    // Require NEXT_PUBLIC_APP_URL in production
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error("NEXT_PUBLIC_APP_URL is not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = createServiceClient();

    // Fetch the analysis to get the page URL
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("url")
      .eq("id", analysisId)
      .single();

    if (analysisError || !analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    let domain: string;
    try {
      domain = new URL(analysis.url).hostname;
    } catch {
      domain = analysis.url;
    }

    // Generate magic link via Supabase Admin API
    const redirectTo = `${appUrl}/auth/callback?claim=${analysisId}`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: cleanEmail,
      options: {
        redirectTo,
      },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate magic link:", linkError?.message);
      return NextResponse.json({ error: "Failed to generate link" }, { status: 500 });
    }

    const magicLink = linkData.properties.action_link;

    // Send custom branded email (not fire-and-forget for auth flow)
    const { subject, html } = claimPageEmail({ domain, magicLink });
    const { error: emailError } = await resend.emails.send({
      from: "Loupe <notifications@getloupe.io>",
      to: cleanEmail,
      subject,
      html,
    });

    if (emailError) {
      console.error("Failed to send claim email:", emailError);
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Claim link route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
