import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * POST /api/feedback/outcome
 * Store user feedback on a checkpoint assessment (thumbs up/down)
 */
export async function POST(req: NextRequest) {
  try {
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
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const { checkpointId, changeId, feedbackType, feedbackText } = body;

    // Validate required fields
    if (!checkpointId || !changeId || !feedbackType) {
      return NextResponse.json(
        { error: "checkpointId, changeId, and feedbackType are required" },
        { status: 400 }
      );
    }

    // Validate UUID formats
    if (!UUID_RE.test(checkpointId)) {
      return NextResponse.json({ error: "Invalid checkpointId format" }, { status: 400 });
    }
    if (!UUID_RE.test(changeId)) {
      return NextResponse.json({ error: "Invalid changeId format" }, { status: 400 });
    }

    // Validate feedback type
    if (!["accurate", "inaccurate"].includes(feedbackType)) {
      return NextResponse.json(
        { error: "feedbackType must be 'accurate' or 'inaccurate'" },
        { status: 400 }
      );
    }

    // Validate optional feedback text
    if (feedbackText !== undefined && feedbackText !== null) {
      if (typeof feedbackText !== "string" || feedbackText.length > 500) {
        return NextResponse.json(
          { error: "feedbackText must be a string of 500 characters or less" },
          { status: 400 }
        );
      }
    }

    const supabase = createServiceClient();

    // Ownership chain: checkpoint → change → verify user owns the change
    const { data: checkpoint, error: cpError } = await supabase
      .from("change_checkpoints")
      .select("id, change_id")
      .eq("id", checkpointId)
      .single();

    if (cpError || !checkpoint) {
      return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
    }

    // Verify checkpoint belongs to the claimed change
    if (checkpoint.change_id !== changeId) {
      return NextResponse.json({ error: "Checkpoint not found" }, { status: 404 });
    }

    // Verify user owns the change and it is resolved
    const { data: change, error: changeError } = await supabase
      .from("detected_changes")
      .select("id, user_id, status")
      .eq("id", changeId)
      .single();

    if (changeError || !change || change.user_id !== user.id) {
      return NextResponse.json({ error: "Change not found" }, { status: 404 });
    }

    // Only accept feedback on resolved outcomes
    if (change.status !== "validated" && change.status !== "regressed") {
      return NextResponse.json(
        { error: "Feedback is only accepted on resolved changes" },
        { status: 400 }
      );
    }

    // Insert feedback
    const { error: insertError } = await supabase
      .from("outcome_feedback")
      .insert({
        checkpoint_id: checkpointId,
        change_id: changeId,
        user_id: user.id,
        feedback_type: feedbackType,
        feedback_text: feedbackText ? feedbackText.trim() : null,
      });

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "Feedback already submitted for this checkpoint" },
          { status: 409 }
        );
      }
      console.error("Outcome feedback insert error:", insertError);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Outcome feedback API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
