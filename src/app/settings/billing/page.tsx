"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/PageLoader";
import {
  TIER_INFO,
  TIER_LIMITS,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/permissions";

interface BillingData {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod: "monthly" | "annual" | null;
  pagesUsed: number;
  pagesLimit: number;
  analyticsUsed: number;
  analyticsLimit: number;
  hasStripeSubscription: boolean;
}

function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function UsageBar({
  used,
  limit,
  label,
}: {
  used: number;
  limit: number;
  label: string;
}) {
  const percentage = limit === Infinity ? 0 : Math.min((used / limit) * 100, 100);
  const isNearLimit = percentage >= 80;

  return (
    <div>
      <div className="flex justify-between text-sm mb-2">
        <span className="text-ink-700">{label}</span>
        <span className={isNearLimit ? "text-amber font-medium" : "text-ink-500"}>
          {used} / {limit === Infinity ? "Unlimited" : limit}
        </span>
      </div>
      {limit !== Infinity && (
        <div className="h-2 bg-paper-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isNearLimit ? "bg-amber" : "bg-emerald"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
    </div>
  );
}

function BillingPageContent() {
  const searchParams = useSearchParams();
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const showSuccess = searchParams.get("success") === "true";

  useEffect(() => {
    async function loadBilling() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          window.location.href = "/login";
          return;
        }

        const profile = await res.json();

        // Fetch page count
        const pagesRes = await fetch("/api/pages");
        const pagesData = await pagesRes.json();
        const pagesUsed = pagesData.pages?.length || 0;

        // Fetch integrations count
        const integrationsRes = await fetch("/api/integrations");
        const integrationsData = await integrationsRes.json();
        let analyticsUsed = 0;
        if (integrationsData.posthog?.connected) analyticsUsed++;
        if (integrationsData.ga4?.connected) analyticsUsed++;
        if (integrationsData.supabase?.connected) analyticsUsed++;

        const tier = (profile.subscription_tier as SubscriptionTier) || "free";
        const limits = TIER_LIMITS[tier];

        setData({
          tier,
          status: profile.subscription_status || "active",
          billingPeriod: profile.billing_period || null,
          pagesUsed,
          pagesLimit: limits.pages,
          analyticsUsed,
          analyticsLimit: limits.analyticsIntegrations,
          hasStripeSubscription: !!profile.stripe_subscription_id,
        });
      } catch (err) {
        console.error("Failed to load billing:", err);
      } finally {
        setLoading(false);
      }
    }

    loadBilling();
  }, []);

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal");
      }
    } catch (err) {
      console.error("Portal error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setPortalLoading(false);
    }
  }

  if (loading) {
    return <PageLoader />;
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-ink-500">Failed to load billing information.</p>
      </div>
    );
  }

  const tierInfo = TIER_INFO[data.tier];
  const limits = TIER_LIMITS[data.tier];

  return (
    <div className="min-h-screen bg-paper-0">
      {/* Header */}
      <header className="border-b border-line-subtle">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-xl text-ink-900">
              Loupe
            </Link>
            <nav className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-ink-500 hover:text-ink-900"
              >
                Dashboard
              </Link>
              <Link
                href="/settings/integrations"
                className="text-ink-500 hover:text-ink-900"
              >
                Integrations
              </Link>
              <span className="text-ink-900 font-medium">Billing</span>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Success banner */}
        {showSuccess && (
          <div className="mb-6 p-4 bg-emerald-subtle border border-emerald rounded-lg flex items-center gap-3">
            <CheckIcon className="w-5 h-5 text-emerald" />
            <p className="text-ink-900">
              Your subscription has been activated. Welcome to{" "}
              <strong>{tierInfo.name}</strong>!
            </p>
          </div>
        )}

        {/* Past due warning */}
        {data.status === "past_due" && (
          <div className="mb-6 p-4 bg-amber-subtle border border-amber rounded-lg">
            <p className="text-ink-900 font-medium">Payment failed</p>
            <p className="text-ink-700 text-sm mt-1">
              Your last payment didn&apos;t go through. Please update your payment
              method to avoid service interruption.
            </p>
            <button
              onClick={openPortal}
              className="mt-3 text-sm font-medium text-amber hover:underline"
            >
              Update payment method
            </button>
          </div>
        )}

        <h1
          className="text-2xl font-bold text-ink-900 mb-8"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Billing & Subscription
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current plan */}
          <div className="glass-card p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-ink-500 mb-1">Current plan</p>
                <h2 className="text-2xl font-bold text-ink-900">
                  {tierInfo.name}
                </h2>
              </div>
              {data.tier !== "free" && (
                <span
                  className={`px-2 py-1 text-xs font-medium rounded ${
                    data.status === "active"
                      ? "bg-emerald-subtle text-emerald"
                      : data.status === "past_due"
                      ? "bg-amber-subtle text-amber"
                      : "bg-paper-100 text-ink-500"
                  }`}
                >
                  {data.status === "active"
                    ? "Active"
                    : data.status === "past_due"
                    ? "Past due"
                    : "Canceled"}
                </span>
              )}
            </div>

            <p className="text-ink-500 mb-4">{tierInfo.description}</p>

            {data.billingPeriod && (
              <p className="text-sm text-ink-500 mb-4">
                Billed {data.billingPeriod}
              </p>
            )}

            <ul className="space-y-2 text-sm mb-6">
              <li className="flex items-center gap-2 text-ink-700">
                <CheckIcon className="w-4 h-4 text-emerald" />
                {limits.pages} {limits.pages === 1 ? "page" : "pages"} included
              </li>
              <li className="flex items-center gap-2 text-ink-700">
                <CheckIcon className="w-4 h-4 text-emerald" />
                {limits.scanFrequency === "daily" ? "Daily" : "Weekly"} scans
              </li>
              {limits.deployScans && (
                <li className="flex items-center gap-2 text-ink-700">
                  <CheckIcon className="w-4 h-4 text-emerald" />
                  Deploy-triggered scans
                </li>
              )}
            </ul>

            <div className="flex flex-col gap-2">
              {data.tier !== "pro" && (
                <Link href="/pricing" className="btn-primary text-center py-2.5">
                  Upgrade Plan
                </Link>
              )}
              {data.hasStripeSubscription && (
                <button
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="btn-secondary py-2.5 disabled:opacity-50"
                >
                  {portalLoading ? "Loading..." : "Manage Subscription"}
                </button>
              )}
            </div>
          </div>

          {/* Usage */}
          <div className="glass-card p-6">
            <h2 className="text-lg font-semibold text-ink-900 mb-6">Usage</h2>

            <div className="space-y-6">
              <UsageBar
                used={data.pagesUsed}
                limit={data.pagesLimit}
                label="Pages tracked"
              />
              <UsageBar
                used={data.analyticsUsed}
                limit={data.analyticsLimit}
                label="Analytics integrations"
              />
            </div>

            {data.pagesUsed >= data.pagesLimit && data.tier !== "pro" && (
              <div className="mt-6 p-3 bg-amber-subtle rounded-lg">
                <p className="text-sm text-ink-700">
                  You&apos;ve reached your page limit.{" "}
                  <Link
                    href="/pricing"
                    className="text-signal font-medium hover:underline"
                  >
                    Upgrade to add more pages
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <BillingPageContent />
    </Suspense>
  );
}
