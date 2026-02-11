/**
 * Subscription tiers and permission checks for Loupe.
 *
 * Tier limits:
 * - Free: 1 page, weekly scans, no integrations, no mobile
 * - Starter: 3 pages, daily + deploy scans, 1 analytics integration, no mobile
 * - Pro: 10 pages, daily + deploy scans, unlimited integrations, mobile access
 */

export type SubscriptionTier = "free" | "starter" | "pro";
export type BillingPeriod = "monthly" | "annual";
export type SubscriptionStatus = "active" | "past_due" | "canceled";

export interface TierLimits {
  pages: number;
  analyticsIntegrations: number; // 0 = none, Infinity = unlimited
  deployScans: boolean;
  mobile: boolean;
  scanFrequency: "weekly" | "daily";
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  free: {
    pages: 1,
    analyticsIntegrations: 0,
    deployScans: false,
    mobile: false,
    scanFrequency: "weekly",
  },
  starter: {
    pages: 3,
    analyticsIntegrations: 1,
    deployScans: true,
    mobile: false,
    scanFrequency: "daily",
  },
  pro: {
    pages: 10,
    analyticsIntegrations: Infinity,
    deployScans: true,
    mobile: true,
    scanFrequency: "daily",
  },
} as const;

/**
 * Get the effective tier considering subscription status.
 * Users with past_due or canceled status are treated as free tier.
 */
export function getEffectiveTier(
  tier: SubscriptionTier,
  status: SubscriptionStatus | null | undefined
): SubscriptionTier {
  if (status === "past_due" || status === "canceled") {
    return "free";
  }
  return tier;
}

/**
 * Get the page limit for a tier, including any bonus pages.
 */
export function getPageLimit(tier: SubscriptionTier, bonusPages: number = 0): number {
  return TIER_LIMITS[tier].pages + bonusPages;
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
    description: "Test Loupe on your homepage",
  },
  starter: {
    name: "Starter",
    monthlyPrice: 12,
    annualPrice: 120,
    description: "Watch your core pages",
  },
  pro: {
    name: "Pro",
    monthlyPrice: 29,
    annualPrice: 290,
    description: "Track every page that drives revenue",
  },
} as const;
