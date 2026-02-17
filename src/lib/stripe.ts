import Stripe from "stripe";
import type { SubscriptionTier, BillingPeriod } from "./permissions";

// Stripe client - initialized lazily to avoid build-time errors when env var is missing
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is required");
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
}

// Export for backward compatibility - use getStripe() for lazy initialization
export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe);

// Allowed origins for redirect URLs (prevent open redirect)
export const ALLOWED_ORIGINS = [
  "https://getloupe.io",
  "http://localhost:3002",
  "http://localhost:3000",
];

// Valid subscription tiers (for metadata validation)
export const VALID_PAID_TIERS = ["pro", "scale"] as const;

/**
 * Price IDs from Stripe Dashboard.
 * Set via env vars: STRIPE_PRICE_PRO_MONTHLY, STRIPE_PRICE_PRO_ANNUAL,
 * STRIPE_PRICE_SCALE_MONTHLY, STRIPE_PRICE_SCALE_ANNUAL
 */
export const PRICE_IDS = {
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || "",
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL || "",
  },
  scale: {
    monthly: process.env.STRIPE_PRICE_SCALE_MONTHLY || "",
    annual: process.env.STRIPE_PRICE_SCALE_ANNUAL || "",
  },
} as const;

/** Beta coupon ID — 50% off for 12 months. Created in Stripe Dashboard. */
export const BETA_COUPON_ID = process.env.STRIPE_BETA_COUPON_ID || "";

/**
 * Get the Stripe price ID for a tier and billing period.
 */
export function getPriceId(tier: "pro" | "scale", period: BillingPeriod): string {
  const priceId = PRICE_IDS[tier][period];
  if (!priceId) {
    throw new Error(`Missing price ID for ${tier} ${period}`);
  }
  return priceId;
}

/**
 * Map a Stripe price ID back to tier and period.
 */
export function getTierFromPriceId(priceId: string): { tier: SubscriptionTier; period: BillingPeriod } | null {
  if (!priceId) return null;

  if (priceId === PRICE_IDS.pro.monthly) return { tier: "pro", period: "monthly" };
  if (priceId === PRICE_IDS.pro.annual) return { tier: "pro", period: "annual" };
  if (priceId === PRICE_IDS.scale.monthly) return { tier: "scale", period: "monthly" };
  if (priceId === PRICE_IDS.scale.annual) return { tier: "scale", period: "annual" };
  return null;
}

/**
 * Create a Stripe Checkout session for subscription.
 */
export async function createCheckoutSession({
  userId,
  email,
  tier,
  period,
  successUrl,
  cancelUrl,
}: {
  userId?: string;
  email?: string;
  tier: "pro" | "scale";
  period: BillingPeriod;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const priceId = getPriceId(tier, period);

  return getStripe().checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    ...(email ? { customer_email: email } : {}),
    metadata: {
      ...(userId ? { user_id: userId } : {}),
      tier,
      period,
    },
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    ...(BETA_COUPON_ID ? { discounts: [{ coupon: BETA_COUPON_ID }] } : {}),
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        ...(userId ? { user_id: userId } : {}),
        tier,
        period,
      },
    },
  });
}

/**
 * Create a Stripe Customer Portal session for managing subscription.
 */
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<Stripe.BillingPortal.Session> {
  return getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

/**
 * Get a customer by ID.
 */
export async function getCustomer(customerId: string): Promise<Stripe.Customer | Stripe.DeletedCustomer> {
  return getStripe().customers.retrieve(customerId);
}

/**
 * Get a subscription by ID.
 */
export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return getStripe().subscriptions.retrieve(subscriptionId);
}
