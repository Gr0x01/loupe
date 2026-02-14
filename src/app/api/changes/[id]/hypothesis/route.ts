import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * PATCH /api/changes/[id]/hypothesis - Set hypothesis for a detected change
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid change ID" }, { status: 400 });
    }

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      rateLimitKey(user.id, "hypothesis"),
      RATE_LIMITS.changes
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
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    const { hypothesis } = body;

    if (!hypothesis || typeof hypothesis !== "string") {
      return NextResponse.json({ error: "Hypothesis is required" }, { status: 400 });
    }

    const trimmed = hypothesis.trim().slice(0, 500);
    if (!trimmed) {
      return NextResponse.json({ error: "Hypothesis is required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("detected_changes")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Change not found" }, { status: 404 });
    }

    // Update hypothesis
    const now = new Date().toISOString();
    const { data: change, error } = await supabase
      .from("detected_changes")
      .update({
        hypothesis: trimmed,
        hypothesis_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, hypothesis, hypothesis_at")
      .single();

    if (error) {
      console.error("Failed to update hypothesis:", error);
      return NextResponse.json(
        { error: "Failed to update hypothesis" },
        { status: 500 }
      );
    }

    return NextResponse.json({ change });
  } catch (err) {
    console.error("Hypothesis PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
