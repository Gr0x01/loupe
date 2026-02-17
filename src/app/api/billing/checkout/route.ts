import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, ALLOWED_ORIGINS } from "@/lib/stripe";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { BillingPeriod } from "@/lib/permissions";

/**
 * POST /api/billing/checkout
 * Create a Stripe Checkout session for subscription upgrade.
 * Works for both authenticated and unauthenticated users.
 */
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    const { tier, period } = await req.json();

    // Validate tier
    if (!tier || !["pro", "scale"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'pro' or 'scale'." },
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

    if (user) {
      // Authenticated: pre-fill email, redirect to billing settings
      const session = await createCheckoutSession({
        userId: user.id,
        email: user.email || "",
        tier: tier as "pro" | "scale",
        period: period as BillingPeriod,
        successUrl: `${origin}/settings/billing?success=true`,
        cancelUrl: `${origin}/pricing?canceled=true`,
      });
      return NextResponse.json({ url: session.url });
    }

    // Unauthenticated: rate limit by IP, Stripe collects email
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(`ip:${ip}:checkout`, RATE_LIMITS.checkout);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const session = await createCheckoutSession({
      tier: tier as "pro" | "scale",
      period: period as BillingPeriod,
      successUrl: `${origin}/checkout/success`,
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
