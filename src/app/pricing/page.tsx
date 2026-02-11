"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TIER_INFO, TIER_LIMITS, type SubscriptionTier } from "@/lib/permissions";

const tiers: SubscriptionTier[] = ["free", "starter", "pro"];

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

function XIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor">
      <path
        fillRule="evenodd"
        d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface PricingCardProps {
  tier: SubscriptionTier;
  isAnnual: boolean;
  isPopular?: boolean;
  currentTier?: SubscriptionTier | null;
  isLoggedIn: boolean;
  onSelect: () => void;
  loading?: boolean;
}

function PricingCard({ tier, isAnnual, isPopular, currentTier, isLoggedIn, onSelect, loading }: PricingCardProps) {
  const isCurrentPlan = currentTier === tier;
  const info = TIER_INFO[tier];
  const limits = TIER_LIMITS[tier];
  const price = isAnnual ? info.annualPrice / 12 : info.monthlyPrice;
  const savings = isAnnual && tier !== "free" ? Math.round((1 - info.annualPrice / (info.monthlyPrice * 12)) * 100) : 0;

  return (
    <div
      className={`glass-card relative flex flex-col p-6 ${
        isPopular ? "border-2 border-signal" : ""
      }`}
    >
      {isCurrentPlan ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald text-white text-xs font-semibold rounded-full">
          Current Plan
        </span>
      ) : isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-signal text-white text-xs font-semibold rounded-full">
          Most Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-ink-900">{info.name}</h3>
        <p className="text-sm text-ink-500 mt-1">{info.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-bold text-ink-900">
            ${tier === "free" ? 0 : Math.round(price)}
          </span>
          {tier !== "free" && (
            <span className="text-ink-500">/mo</span>
          )}
        </div>
        {isAnnual && tier !== "free" && (
          <p className="text-sm text-emerald font-medium mt-1">
            Save {savings}% with annual billing
          </p>
        )}
        {isAnnual && tier !== "free" && (
          <p className="text-xs text-ink-500 mt-1">
            ${info.annualPrice}/year billed annually
          </p>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        <li className="flex items-start gap-3">
          <CheckIcon className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
          <span className="text-ink-700">
            <strong>{limits.pages}</strong> {limits.pages === 1 ? "page" : "pages"} tracked
          </span>
        </li>
        <li className="flex items-start gap-3">
          <CheckIcon className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
          <span className="text-ink-700">
            <strong>{limits.scanFrequency === "daily" ? "Daily" : "Weekly"}</strong> automated scans
          </span>
        </li>
        <li className="flex items-start gap-3">
          {limits.deployScans ? (
            <CheckIcon className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
          ) : (
            <XIcon className="w-5 h-5 text-ink-300 flex-shrink-0 mt-0.5" />
          )}
          <span className={limits.deployScans ? "text-ink-700" : "text-ink-400"}>
            Deploy-triggered scans
          </span>
        </li>
        <li className="flex items-start gap-3">
          {limits.analyticsIntegrations > 0 ? (
            <CheckIcon className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
          ) : (
            <XIcon className="w-5 h-5 text-ink-300 flex-shrink-0 mt-0.5" />
          )}
          <span className={limits.analyticsIntegrations > 0 ? "text-ink-700" : "text-ink-400"}>
            {limits.analyticsIntegrations === Infinity
              ? "Unlimited analytics integrations"
              : limits.analyticsIntegrations === 0
              ? "No analytics integrations"
              : `${limits.analyticsIntegrations} analytics integration`}
          </span>
        </li>
        <li className="flex items-start gap-3">
          <CheckIcon className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
          <span className="text-ink-700">Email alerts</span>
        </li>
        {tier === "pro" && (
          <>
            <li className="flex items-start gap-3">
              <CheckIcon className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
              <span className="text-ink-700">Mobile access</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-5 h-5 flex items-center justify-center text-xs text-amber font-medium flex-shrink-0 mt-0.5">
                Soon
              </span>
              <span className="text-ink-500">Slack alerts</span>
            </li>
          </>
        )}
      </ul>

      {isCurrentPlan ? (
        <Link
          href="/settings/billing"
          className="btn-secondary w-full text-center py-3"
        >
          Manage Plan
        </Link>
      ) : tier === "free" ? (
        isLoggedIn ? (
          <span className="block w-full py-3 text-center text-ink-400">
            Free tier
          </span>
        ) : (
          <Link
            href="/login"
            className="btn-secondary w-full text-center py-3"
          >
            Get Started Free
          </Link>
        )
      ) : (
        <button
          onClick={onSelect}
          disabled={loading}
          className={`w-full py-3 font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 ${
            isPopular
              ? "btn-primary"
              : "btn-secondary"
          }`}
        >
          {loading ? "Loading..." : `Upgrade to ${info.name}`}
        </button>
      )}
    </div>
  );
}

export default function PricingPage() {
  const [isAnnual, setIsAnnual] = useState(true);
  const [loading, setLoading] = useState<SubscriptionTier | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier | null>(null);

  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const profile = await res.json();
          setIsLoggedIn(true);
          setCurrentTier(profile.subscription_tier || "free");
        }
      } catch {
        // Not logged in
      }
    }
    checkAuth();
  }, []);

  async function handleSelect(tier: SubscriptionTier) {
    if (tier === "free") return;

    setLoading(tier);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          period: isAnnual ? "annual" : "monthly",
        }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else if (data.error === "Unauthorized") {
        // Redirect to login first
        window.location.href = `/login?redirect=/pricing`;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-paper-0">
      {/* Header */}
      <header className="border-b border-line-subtle">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="font-bold text-xl text-ink-900">
            Loupe
          </Link>
          {isLoggedIn ? (
            <Link
              href="/dashboard"
              className="text-ink-700 hover:text-ink-900 font-medium"
            >
              Dashboard
            </Link>
          ) : (
            <Link
              href="/login"
              className="text-ink-700 hover:text-ink-900 font-medium"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className="text-4xl sm:text-5xl font-bold text-ink-900 mb-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Simple pricing for every stage
          </h1>
          <p className="text-lg text-ink-500 mb-8">
            Start free, upgrade when you need more pages or faster scans.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-3 p-1 bg-paper-100 rounded-lg">
            <button
              onClick={() => setIsAnnual(false)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                !isAnnual
                  ? "bg-white text-ink-900 shadow-sm"
                  : "text-ink-500 hover:text-ink-700"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isAnnual
                  ? "bg-white text-ink-900 shadow-sm"
                  : "text-ink-500 hover:text-ink-700"
              }`}
            >
              Annual
              <span className="ml-2 text-xs text-emerald font-semibold">
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-20 px-4">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {tiers.map((tier) => (
            <PricingCard
              key={tier}
              tier={tier}
              isAnnual={isAnnual}
              isPopular={tier === "starter"}
              currentTier={currentTier}
              isLoggedIn={isLoggedIn}
              onSelect={() => handleSelect(tier)}
              loading={loading === tier}
            />
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-4 bg-paper-100 border-t border-line-subtle">
        <div className="max-w-3xl mx-auto">
          <h2
            className="text-2xl font-bold text-ink-900 mb-8 text-center"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="glass-card p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                Can I switch plans later?
              </h3>
              <p className="text-ink-500">
                Yes, you can upgrade or downgrade at any time. When upgrading, you&apos;ll
                be prorated for the remainder of your billing cycle.
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                What happens if I hit my page limit?
              </h3>
              <p className="text-ink-500">
                You&apos;ll need to remove a page or upgrade to add more. Your existing
                pages will continue to be scanned normally.
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                What counts as an analytics integration?
              </h3>
              <p className="text-ink-500">
                PostHog, Google Analytics 4, and Supabase each count as one
                integration. You can disconnect and reconnect anytime.
              </p>
            </div>

            <div className="glass-card p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-ink-500">
                We offer a full refund within 30 days of your first payment if
                Loupe isn&apos;t right for you. Contact us at team@getloupe.io.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
