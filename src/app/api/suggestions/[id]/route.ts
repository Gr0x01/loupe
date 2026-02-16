import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/suggestions/[id]
 * Mark a tracked suggestion as addressed or dismissed.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = checkRateLimit(
      rateLimitKey(user.id, "suggestions"),
      RATE_LIMITS.feedback
    );
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      );
    }

    const { id } = await params;
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: "Invalid suggestion ID" }, { status: 400 });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { status } = body;
    if (!status || !["addressed", "dismissed"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'addressed' or 'dismissed'" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Verify ownership
    const { data: suggestion, error: fetchErr } = await supabase
      .from("tracked_suggestions")
      .select("id, user_id, status")
      .eq("id", id)
      .single();

    if (fetchErr || !suggestion) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    if (suggestion.user_id !== user.id) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      status,
      updated_at: now,
    };
    if (status === "addressed") {
      updateData.addressed_at = now;
    } else {
      updateData.dismissed_at = now;
    }

    const { data: updated, error: updateErr } = await supabase
      .from("tracked_suggestions")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (updateErr) {
      console.error("Suggestion update error:", updateErr);
      return NextResponse.json({ error: "Failed to update suggestion" }, { status: 500 });
    }

    return NextResponse.json({ suggestion: updated });
  } catch (error) {
    console.error("Suggestion API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
