/**
 * Type-safe PostHog event tracking utility
 *
 * Usage:
 *   import { track } from "@/lib/analytics/track";
 *   track("audit_started", { source: "homepage" });
 */

import posthog from "posthog-js";

// Event definitions with typed properties
type TrackEvents = {
  // Acquisition
  audit_started: { source: "homepage" | "dashboard" | "page_detail" };
  audit_completed: { findings_count: number; impact_range: string };

  // Activation
  page_claimed: { domain: string };
  login_started: { method: "magic_link" | "google" };
  signup_completed: { method: "magic_link" | "google" };
  page_tracked: { domain: string; is_first_page: boolean };

  // Retention / Engagement
  rescan_triggered: { domain: string };
  correlation_viewed: { domain: string; status: "validated" | "regressed" };
  suggestion_copied: { element_type: string };
  finding_feedback_submitted: { feedback_type: "accurate" | "inaccurate" };

  // Feature Adoption
  integration_connected: { type: "github" | "posthog" | "ga4" | "supabase" };
  github_repo_connected: { repo_name: string };
  pdf_downloaded: { domain: string };
  share_link_copied: { context: "analysis" | "dashboard" };
};

type EventName = keyof TrackEvents;

/**
 * Track an event in PostHog with type-safe properties.
 * Silently fails if PostHog is not available — analytics should never break the app.
 */
export function track<T extends EventName>(
  event: T,
  properties: TrackEvents[T]
): void {
  try {
    if (typeof window !== "undefined" && posthog?.capture) {
      posthog.capture(event, properties);
    }
  } catch {
    // Analytics should never break the app
  }
}

/**
 * Identify a user in PostHog.
 * Silently fails if PostHog is not available.
 */
export function identify(
  userId: string,
  traits?: Record<string, unknown>
): void {
  try {
    if (typeof window !== "undefined" && posthog?.identify) {
      posthog.identify(userId, traits);
    }
  } catch {
    // Analytics should never break the app
  }
}

/**
 * Set person properties on the current user without re-identifying.
 * Use this when you learn new info about a user mid-session (e.g. after fetching profile).
 */
export function setPersonProperties(
  properties: Record<string, unknown>
): void {
  try {
    if (typeof window !== "undefined" && posthog?.setPersonProperties) {
      posthog.setPersonProperties(properties);
    }
  } catch {
    // Analytics should never break the app
  }
}

/**
 * Reset PostHog identity (call on logout).
 * Silently fails if PostHog is not available.
 */
export function reset(): void {
  try {
    if (typeof window !== "undefined" && posthog?.reset) {
      posthog.reset();
    }
  } catch {
    // Analytics should never break the app
  }
}
