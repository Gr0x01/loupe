/**
 * Server-side PostHog client for tracking events from API routes.
 *
 * Use this for events that happen server-side (billing webhooks, page claims, etc.)
 * where the client-side posthog-js isn't available.
 */

import { PostHog } from "posthog-node";

let client: PostHog | null = null;

function getClient(): PostHog | null {
  if (client) return client;

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!apiKey) return null;

  client = new PostHog(apiKey, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1, // Flush immediately in serverless (Vercel)
    flushInterval: 0,
  });

  return client;
}

// Server-side event names — keep in sync with PostHog dashboard funnels
type ServerEvent =
  | "signup_completed"
  | "user_logged_in"
  | "page_claimed"
  | "page_tracked"
  | "audit_started_server"
  | "audit_completed_server"
  | "subscription_started"
  | "subscription_updated"
  | "subscription_canceled"
  | "payment_failed";

/**
 * Capture a server-side event in PostHog.
 */
export function captureEvent(
  userId: string,
  event: ServerEvent,
  properties?: Record<string, unknown>
): void {
  try {
    const ph = getClient();
    if (!ph) return;
    ph.capture({ distinctId: userId, event, properties });
  } catch {
    // Analytics should never break the app
  }
}

/**
 * Identify a user with person properties server-side.
 * Use this when user properties change (tier upgrade, billing status, etc.)
 */
export function identifyUser(
  userId: string,
  properties: Record<string, unknown>
): void {
  try {
    const ph = getClient();
    if (!ph) return;
    ph.identify({ distinctId: userId, properties });
  } catch {
    // Analytics should never break the app
  }
}

/**
 * Flush pending events. Call this at the end of serverless functions
 * to ensure events are sent before the function terminates.
 */
export async function flushEvents(): Promise<void> {
  try {
    const ph = getClient();
    if (!ph) return;
    await ph.flush();
  } catch {
    // Analytics should never break the app
  }
}
