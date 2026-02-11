import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createPortalSession, ALLOWED_ORIGINS } from "@/lib/stripe";

/**
 * POST /api/billing/portal
 * Create a Stripe Customer Portal session for managing subscription.
 */
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Validate origin to prevent open redirect
    const requestOrigin = req.headers.get("origin");
    const origin = ALLOWED_ORIGINS.includes(requestOrigin || "")
      ? requestOrigin!
      : "https://getloupe.io";

    const session = await createPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${origin}/settings/billing`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
