import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * GET /api/profile - Get current user's profile
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: profile, error } = await serviceClient
    .from("profiles")
    .select("email, email_notifications, bonus_pages, is_founding_50")
    .eq("id", user.id)
    .single();

  if (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  return NextResponse.json(profile);
}

/**
 * PATCH /api/profile - Update current user's profile preferences
 */
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // Only allow updating specific fields
    const allowedFields = ["email_notifications"];
    const updateData: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Validate email_notifications is boolean
    if (
      "email_notifications" in updateData &&
      typeof updateData.email_notifications !== "boolean"
    ) {
      return NextResponse.json(
        { error: "email_notifications must be a boolean" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
      .from("profiles")
      .update(updateData)
      .eq("id", user.id);

    if (error) {
      console.error("Failed to update profile:", error);
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
