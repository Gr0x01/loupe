import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MAX_BONUS_PAGES } from "@/lib/constants";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/share-credit - Increment user's bonus_pages (honor system)
 */
export async function POST() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 per hour per user
    const rateLimit = checkRateLimit(
      rateLimitKey(user.id, "share-credit"),
      RATE_LIMITS.shareCredit
    );
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = createServiceClient();

    // Atomic increment with cap check (prevents race condition)
    const { data: newValue, error: rpcError } = await supabase.rpc(
      "increment_bonus_pages",
      { p_user_id: user.id, p_max: MAX_BONUS_PAGES }
    );

    if (rpcError) {
      console.error("Failed to increment bonus_pages:", rpcError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    // -1 means user was already at max (no update happened)
    if (newValue === -1) {
      return NextResponse.json({
        success: true,
        bonus_pages: MAX_BONUS_PAGES,
        message: "Already at maximum bonus pages",
      });
    }

    return NextResponse.json({
      success: true,
      bonus_pages: newValue,
    });
  } catch (err) {
    console.error("Share credit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
