import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email/resend";
import { waitlistConfirmationEmail } from "@/lib/email/templates";

/**
 * POST /api/waitlist - Add email to waitlist
 */
export async function POST(req: NextRequest) {
  try {
    const { email, referrer } = await req.json();

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Insert into waitlist
    const { error } = await supabase
      .from("waitlist")
      .insert({
        email: email.toLowerCase().trim(),
        referrer: referrer || null,
      });

    if (error) {
      // Handle unique constraint violation (already on waitlist)
      if (error.code === "23505") {
        return NextResponse.json({
          success: true,
          message: "Already on waitlist",
        });
      }

      console.error("Failed to add to waitlist:", error);
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: 500 }
      );
    }

    // Send confirmation email (fire and forget)
    const normalizedEmail = email.toLowerCase().trim();
    const { subject, html } = waitlistConfirmationEmail({ email: normalizedEmail });
    sendEmail({ to: normalizedEmail, subject, html }).catch(console.error);

    return NextResponse.json({
      success: true,
      message: "Added to waitlist",
    });
  } catch (err) {
    console.error("Waitlist error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
