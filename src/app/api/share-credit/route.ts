import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { MAX_BONUS_PAGES } from "@/lib/constants";

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

    const supabase = createServiceClient();

    // Get current bonus_pages
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("bonus_pages")
      .eq("id", user.id)
      .single();

    if (fetchError) {
      console.error("Failed to fetch profile:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    const currentBonus = profile?.bonus_pages ?? 0;

    // Check if already at max
    if (currentBonus >= MAX_BONUS_PAGES) {
      return NextResponse.json({
        success: true,
        bonus_pages: currentBonus,
        message: "Already at maximum bonus pages",
      });
    }

    // Increment bonus_pages
    const { data: updated, error: updateError } = await supabase
      .from("profiles")
      .update({ bonus_pages: currentBonus + 1 })
      .eq("id", user.id)
      .select("bonus_pages")
      .single();

    if (updateError) {
      console.error("Failed to update bonus_pages:", updateError);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      bonus_pages: updated.bonus_pages,
    });
  } catch (err) {
    console.error("Share credit error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
