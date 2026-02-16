/**
 * Subscription tiers and permission checks for Loupe.
 *
 * Tier limits:
 * - Free: 1 page, weekly scans, no integrations, no mobile
 * - Pro: 5 pages, daily + deploy scans, all integrations, mobile, 30-day impact follow-up
 * - Scale: 15 pages, daily + deploy scans, all integrations, mobile, 90-day impact follow-up
 */

export type SubscriptionTier = "free" | "pro" | "scale";
export type BillingPeriod = "monthly" | "annual";
export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface TierLimits {
  pages: number;
  analyticsIntegrations: number; // 0 = none, Infinity = unlimited
  deployScans: boolean;
  mobile: boolean;
  scanFrequency: "weekly" | "daily";
  maxHorizonDays: number; // Max checkpoint horizon: 30 (Pro) or 90 (Scale)
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    pages: 1,
    analyticsIntegrations: 0,
    deployScans: false,
    mobile: false,
    scanFrequency: "weekly",
    maxHorizonDays: 0,
  },
  pro: {
    pages: 5,
    analyticsIntegrations: Infinity,
    deployScans: true,
    mobile: true,
    scanFrequency: "daily",
    maxHorizonDays: 30,
  },
  scale: {
    pages: 15,
    analyticsIntegrations: Infinity,
    deployScans: true,
    mobile: true,
    scanFrequency: "daily",
    maxHorizonDays: 90,
  },
} as const;

/** Duration of Pro trial for new signups (in days) */
export const TRIAL_DURATION_DAYS = 14;

/**
 * Get the effective tier considering subscription status and trial.
 * Users with past_due or canceled status are treated as free tier.
 * Users within their trial period get Pro.
 */
export function getEffectiveTier(
  tier: SubscriptionTier,
  status: SubscriptionStatus | null | undefined,
  trialEndsAt?: string | Date | null
): SubscriptionTier {
  if (status === "past_due" || status === "canceled") {
    return "free";
  }

  // If user has a paid tier, use it
  if (tier !== "free") {
    return tier;
  }

  // Check trial: free tier users with active trial get Pro
  if (trialEndsAt) {
    const trialEnd = typeof trialEndsAt === "string" ? new Date(trialEndsAt) : trialEndsAt;
    if (trialEnd > new Date()) {
      return "pro";
    }
  }

  return "free";
}

/**
 * Get the page limit for a tier.
 */
export function getPageLimit(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier].pages;
}

/**
 * Check if a user can add a new analytics integration.
 * @param tier - User's subscription tier
 * @param currentCount - Number of analytics integrations currently connected
 */
export function canConnectAnalytics(tier: SubscriptionTier, currentCount: number): boolean {
  const limit = TIER_LIMITS[tier].analyticsIntegrations;
  if (limit === Infinity) return true;
  return currentCount < limit;
}

/**
 * Check if a user can use deploy scanning (GitHub webhook triggers).
 */
export function canUseDeployScans(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].deployScans;
}

/**
 * Check if a user can access on mobile.
 */
export function canAccessMobile(tier: SubscriptionTier): boolean {
  return TIER_LIMITS[tier].mobile;
}

/**
 * Get the allowed scan frequency for a tier.
 */
export function getAllowedScanFrequency(tier: SubscriptionTier): "weekly" | "daily" {
  return TIER_LIMITS[tier].scanFrequency;
}

/**
 * Get max checkpoint horizon days for a tier.
 */
export function getMaxHorizonDays(tier: SubscriptionTier): number {
  return TIER_LIMITS[tier].maxHorizonDays;
}

/**
 * Validate and coerce scan frequency based on tier.
 * Free tier always gets weekly, regardless of request.
 */
export function validateScanFrequency(
  tier: SubscriptionTier,
  requested: string
): "weekly" | "daily" | "manual" {
  const validFrequencies = ["weekly", "daily", "manual"];

  if (!validFrequencies.includes(requested)) {
    return tier === "free" ? "weekly" : "daily";
  }

  // Free tier cannot have daily scans
  if (tier === "free" && requested === "daily") {
    return "weekly";
  }

  return requested as "weekly" | "daily" | "manual";
}

/**
 * Tier display information for UI
 */
export const TIER_INFO: Record<SubscriptionTier, {
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  description: string;
}> = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    description: "See what Loupe finds.",
  },
  pro: {
    name: "Pro",
    monthlyPrice: 39,
    annualPrice: 390,
    description: "Know what your changes did.",
  },
  scale: {
    name: "Scale",
    monthlyPrice: 99,
    annualPrice: 990,
    description: "Intelligence that compounds.",
  },
} as const;
