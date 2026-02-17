import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe, getTierFromPriceId, VALID_PAID_TIERS } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { captureEvent, identifyUser, flushEvents } from "@/lib/posthog-server";
import { welcomeSubscriberEmail } from "@/lib/email/templates";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const TRIAL_DURATION_DAYS = 14;

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
 * Handle successful checkout - set tier, customer ID, subscription ID.
 * Supports both authenticated (user_id in metadata) and unauthenticated checkouts.
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  let userId = session.metadata?.user_id;
  const tier = session.metadata?.tier;
  const period = session.metadata?.period;

  // Validate tier
  if (!tier || !VALID_PAID_TIERS.includes(tier as typeof VALID_PAID_TIERS[number])) {
    console.error("Missing/invalid tier in checkout metadata:", tier, session.id);
    return;
  }

  // Unauthenticated checkout: find or create user from Stripe email
  if (!userId) {
    const email = session.customer_details?.email?.toLowerCase();
    if (!email) {
      console.error("No user_id or email in checkout session:", session.id);
      return;
    }

    userId = await findOrCreateUser(supabase, email, tier as "pro" | "scale");
    if (!userId) return; // logged inside findOrCreateUser

    // Patch Stripe subscription metadata so future webhook events can find the user
    if (session.subscription) {
      try {
        await getStripe().subscriptions.update(session.subscription as string, {
          metadata: { user_id: userId, tier, period: period || "monthly" },
        });
      } catch (err) {
        // Non-fatal — handlers fall back to stripe_subscription_id lookup
        console.error("Failed to patch subscription metadata:", err);
      }
    }
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
 * Find existing user by email, or create a new one.
 * Sends a welcome magic link email to new/existing users from unauthenticated checkout.
 */
async function findOrCreateUser(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
  tier: "pro" | "scale",
): Promise<string | undefined> {
  // Check for existing user by email
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let userId: string;
  let isNewUser = false;

  if (existingProfile) {
    userId = existingProfile.id;
  } else {
    // Create new Supabase auth user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (createError) {
      // User may exist in auth.users but not profiles (retry after partial failure)
      if (createError.message?.includes("already been registered")) {
        const { data: { users } } = await supabase.auth.admin.listUsers();
        const existing = users?.find(u => u.email === email);
        if (existing) {
          userId = existing.id;
        } else {
          console.error("User reportedly exists but not found:", email);
          return undefined;
        }
      } else {
        console.error("Failed to create user for unauthenticated checkout:", createError);
        throw createError; // Retry-able
      }
    } else {
      userId = newUser.user!.id;
      isNewUser = true;

      // Set trial_ends_at for new user
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
      await supabase
        .from("profiles")
        .update({ trial_ends_at: trialEnd.toISOString() })
        .eq("id", userId);
    }
  }

  // Send welcome magic link email
  await sendWelcomeMagicLink(supabase, email, tier);

  console.log(`${isNewUser ? "Created" : "Found"} user ${userId} for unauthenticated checkout (${email})`);
  return userId;
}

/**
 * Generate a magic link and send a branded welcome email.
 * Non-fatal — user can always sign in from /login.
 */
async function sendWelcomeMagicLink(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
  tier: "pro" | "scale",
) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("NEXT_PUBLIC_APP_URL not configured, skipping welcome email");
    return;
  }

  try {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${appUrl}/auth/callback?next=/dashboard` },
    });

    if (linkError || !linkData?.properties?.action_link) {
      console.error("Failed to generate welcome magic link:", linkError?.message);
      return;
    }

    const { subject, html } = welcomeSubscriberEmail({
      tier,
      magicLink: linkData.properties.action_link,
    });

    await resend.emails.send({
      from: "Loupe <notifications@getloupe.io>",
      to: email,
      subject,
      html,
    });
  } catch (err) {
    // Non-fatal — user can sign in via /login
    console.error("Failed to send welcome email:", err);
  }
}

/**
 * Handle subscription updates - plan changes, status changes
 */
async function handleSubscriptionUpdated(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  let userId = subscription.metadata?.user_id;

  // Fallback: look up by stripe_subscription_id (unauthenticated checkout where metadata patch failed)
  if (!userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (!profile) {
      console.error("Cannot find user for subscription update:", subscription.id);
      return;
    }
    userId = profile.id;
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
  let userId = subscription.metadata?.user_id;

  // Fallback: look up by stripe_subscription_id (unauthenticated checkout where metadata patch failed)
  if (!userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("stripe_subscription_id", subscription.id)
      .maybeSingle();

    if (!profile) {
      console.error("Cannot find user for subscription deletion:", subscription.id);
      return;
    }
    userId = profile.id;
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
