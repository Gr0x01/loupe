import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, ALLOWED_ORIGINS } from "@/lib/stripe";
import type { BillingPeriod } from "@/lib/permissions";

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for subscription upgrade.
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

    const { tier, period } = await req.json();

    // Validate tier
    if (!tier || !["starter", "pro"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'starter' or 'pro'." },
        { status: 400 }
      );
    }

    // Validate period
    if (!period || !["monthly", "annual"].includes(period)) {
      return NextResponse.json(
        { error: "Invalid period. Must be 'monthly' or 'annual'." },
        { status: 400 }
      );
    }

    // Validate origin to prevent open redirect
    const requestOrigin = req.headers.get("origin");
    const origin = ALLOWED_ORIGINS.includes(requestOrigin || "")
      ? requestOrigin!
      : "https://getloupe.io";

    const session = await createCheckoutSession({
      userId: user.id,
      email: user.email || "",
      tier: tier as "starter" | "pro",
      period: period as BillingPeriod,
      successUrl: `${origin}/settings/billing?success=true`,
      cancelUrl: `${origin}/pricing?canceled=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
