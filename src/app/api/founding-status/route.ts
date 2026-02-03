import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { FOUNDING_50_CAP } from "@/lib/constants";

/**
 * GET /api/founding-status - Returns founding 50 progress
 */
export async function GET() {
  try {
    const supabase = createServiceClient();

    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_founding_50", true);

    if (error) {
      console.error("Failed to fetch founding status:", error);
      return NextResponse.json(
        { error: "Failed to fetch status" },
        { status: 500 }
      );
    }

    const claimed = count ?? 0;
    const remaining = Math.max(0, FOUNDING_50_CAP - claimed);

    return NextResponse.json({
      claimed,
      total: FOUNDING_50_CAP,
      isFull: claimed >= FOUNDING_50_CAP,
      remaining,
    });
  } catch (err) {
    console.error("Founding status error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
