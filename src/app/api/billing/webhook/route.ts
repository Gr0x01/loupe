import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, getTierFromPriceId, VALID_PAID_TIERS } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { captureEvent, identifyUser, flushEvents } from "@/lib/posthog-server";

/**
 * POST /api/billing/webhook
 * Handle Stripe webhook events for subscription lifecycle.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = createServiceClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      default:
        // Unhandled event type - that's OK, we only care about specific events
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error handling ${event.type}:`, error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

/**
 * Handle successful checkout - set tier, customer ID, subscription ID
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.user_id;
  const tier = session.metadata?.tier;
  const period = session.metadata?.period;

  // Validate required metadata
  if (!userId || !tier) {
    console.error("Missing metadata in checkout session:", session.id);
    return; // Return without throwing - this is a permanent failure, don't retry
  }

  // Validate tier is one of the allowed values (prevents metadata tampering)
  if (!VALID_PAID_TIERS.includes(tier as typeof VALID_PAID_TIERS[number])) {
    console.error("Invalid tier in checkout metadata:", tier, session.id);
    return; // Return without throwing - permanent failure
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: tier,
      stripe_customer_id: session.customer as string,
      stripe_subscription_id: session.subscription as string,
      subscription_status: "active",
      billing_period: period || "monthly",
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to update profile after checkout:", error);
    throw error; // Throw to trigger retry - this could be a transient DB error
  }

  console.log(`Upgraded user ${userId} to ${tier} (${period})`);

  // Track in PostHog
  identifyUser(userId, {
    subscription_tier: tier,
    subscription_status: "active",
    billing_period: period || "monthly",
  });
  captureEvent(userId, "subscription_started", {
    tier,
    billing_period: period || "monthly",
  });
  await flushEvents();
}

/**
 * Handle subscription updates - plan changes, status changes
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error("Missing user_id in subscription metadata:", subscription.id);
    return;
  }

  // Get the current price to determine tier
  const priceId = subscription.items.data[0]?.price?.id;
  const tierInfo = priceId ? getTierFromPriceId(priceId) : null;

  // Map Stripe status to our status
  let status: string = "active";
  if (subscription.status === "past_due") {
    status = "past_due";
  } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
    status = "canceled";
  }

  const updateData: Record<string, unknown> = {
    subscription_status: status,
    updated_at: new Date().toISOString(),
  };

  // Update tier if we can determine it from the price
  if (tierInfo) {
    updateData.subscription_tier = tierInfo.tier;
    updateData.billing_period = tierInfo.period;
  }

  const { error } = await supabase
    .from("profiles")
    .update(updateData)
    .eq("id", userId);

  if (error) {
    console.error("Failed to update profile on subscription update:", error);
    throw error;
  }

  console.log(`Updated subscription for user ${userId}: status=${status}`);

  // Track in PostHog
  const identifyProps: Record<string, unknown> = { subscription_status: status };
  if (tierInfo) {
    identifyProps.subscription_tier = tierInfo.tier;
    identifyProps.billing_period = tierInfo.period;
  }
  identifyUser(userId, identifyProps);
  captureEvent(userId, "subscription_updated", {
    status,
    tier: tierInfo?.tier,
    billing_period: tierInfo?.period,
  });
  await flushEvents();
}

/**
 * Handle subscription deletion - downgrade to free
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error("Missing user_id in subscription metadata:", subscription.id);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "free",
      subscription_status: "canceled",
      stripe_subscription_id: null,
      billing_period: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (error) {
    console.error("Failed to downgrade user on subscription deletion:", error);
    throw error;
  }

  console.log(`Downgraded user ${userId} to free tier after subscription deletion`);

  // Track in PostHog
  identifyUser(userId, {
    subscription_tier: "free",
    subscription_status: "canceled",
  });
  captureEvent(userId, "subscription_canceled", {});
  await flushEvents();
}

/**
 * Handle payment failure - set status to past_due
 */
async function handlePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  // invoice.subscription can be string | Stripe.Subscription | null (type assertion for newer Stripe SDK)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawSubscription = (invoice as any).subscription;
  const subscriptionId =
    typeof rawSubscription === "string"
      ? rawSubscription
      : rawSubscription?.id;

  if (!subscriptionId) return;

  // Find user by subscription ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("stripe_subscription_id", subscriptionId)
    .single();

  if (!profile) {
    console.error("Could not find user for failed payment:", subscriptionId);
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      subscription_status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("id", profile.id);

  if (error) {
    console.error("Failed to update status on payment failure:", error);
    throw error;
  }

  console.log(`Set user ${profile.id} to past_due after payment failure`);

  // Track in PostHog
  identifyUser(profile.id, { subscription_status: "past_due" });
  captureEvent(profile.id, "payment_failed", {});
  await flushEvents();
}
