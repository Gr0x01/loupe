import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/feedback
 * Store user feedback on a finding for LLM calibration
 */
export async function POST(req: NextRequest) {
  try {
    // Require authentication
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      rateLimitKey(user.id, "feedback"),
      RATE_LIMITS.feedback
    );
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    const body = await req.json();
    const { analysisId, findingId, feedbackType, feedbackText } = body;

    // Validate required fields
    if (!analysisId || !findingId || !feedbackType) {
      return NextResponse.json(
        { error: "analysisId, findingId, and feedbackType are required" },
        { status: 400 }
      );
    }

    // Validate UUID format to prevent injection
    if (!UUID_RE.test(analysisId)) {
      return NextResponse.json(
        { error: "Invalid analysisId format" },
        { status: 400 }
      );
    }

    // Validate findingId format (findings use UUIDs)
    if (typeof findingId !== "string" || !UUID_RE.test(findingId)) {
      return NextResponse.json(
        { error: "Invalid findingId format" },
        { status: 400 }
      );
    }

    // Validate feedback type
    if (!["accurate", "inaccurate"].includes(feedbackType)) {
      return NextResponse.json(
        { error: "feedbackType must be 'accurate' or 'inaccurate'" },
        { status: 400 }
      );
    }

    // Validate feedback text for inaccurate (required and max length)
    if (feedbackType === "inaccurate") {
      if (!feedbackText || typeof feedbackText !== "string") {
        return NextResponse.json(
          { error: "feedbackText is required when feedbackType is 'inaccurate'" },
          { status: 400 }
        );
      }
      if (feedbackText.length > 500) {
        return NextResponse.json(
          { error: "feedbackText must be 500 characters or less" },
          { status: 400 }
        );
      }
    }

    const supabase = createServiceClient();

    // Fetch the analysis and verify ownership
    const { data: analysis, error: analysisError } = await supabase
      .from("analyses")
      .select("id, url, user_id, structured_output")
      .eq("id", analysisId)
      .single();

    // Check for database error first (don't mask operational errors)
    if (analysisError || !analysis) {
      if (analysisError) {
        console.error("Feedback analysis lookup error:", analysisError);
      }
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Verify user owns this analysis
    if (!analysis.user_id || analysis.user_id !== user.id) {
      return NextResponse.json(
        { error: "Analysis not found" },
        { status: 404 }
      );
    }

    // Extract the finding from structured_output
    const findings = analysis.structured_output?.findings || [];
    const finding = findings.find((f: { id: string }) => f.id === findingId);

    if (!finding) {
      return NextResponse.json(
        { error: "Finding not found in analysis" },
        { status: 404 }
      );
    }

    // Create finding snapshot (only essential fields for LLM context)
    const findingSnapshot = {
      title: finding.title,
      elementType: finding.elementType,
      currentValue: finding.currentValue,
      suggestion: finding.suggestion,
      impact: finding.impact,
    };

    // Look up page_id via url + user_id
    const { data: page } = await supabase
      .from("pages")
      .select("id")
      .eq("url", analysis.url)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!page) {
      return NextResponse.json(
        { error: "Page not found for this analysis" },
        { status: 404 }
      );
    }

    // Insert feedback
    const { error: insertError } = await supabase
      .from("finding_feedback")
      .insert({
        page_id: page.id,
        analysis_id: analysisId,
        finding_id: findingId,
        feedback_type: feedbackType,
        feedback_text: feedbackType === "inaccurate" ? feedbackText.trim() : null,
        finding_snapshot: findingSnapshot,
      });

    if (insertError) {
      console.error("Feedback insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save feedback" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
