"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TIER_INFO, type SubscriptionTier } from "@/lib/permissions";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const tiers: SubscriptionTier[] = ["free", "starter", "pro"];

function CheckIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.28 3.22a.75.75 0 00-1.06 1.06L8.94 10l-5.72 5.72a.75.75 0 101.06 1.06L10 11.06l5.72 5.72a.75.75 0 101.06-1.06L11.06 10l5.72-5.72a.75.75 0 00-1.06-1.06L10 8.94 4.28 3.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Human-readable feature bullets per tier */
const FEATURE_BULLETS: Record<SubscriptionTier, { included: string[]; excluded: string[] }> = {
  free: {
    included: [
      "1 page tracked",
      "Weekly automated scans",
      "Email alerts",
    ],
    excluded: [
      "Scans when you ship code",
      "No metrics connection",
    ],
  },
  starter: {
    included: [
      "3 pages tracked",
      "Daily automated scans",
      "Scans when you ship code",
      "Connect 1 metrics tool",
      "Email alerts",
    ],
    excluded: [],
  },
  pro: {
    included: [
      "10 pages tracked",
      "Daily automated scans",
      "Scans when you ship code",
      "Connect all your metrics tools",
      "Email alerts",
      "Mobile screenshots",
    ],
    excluded: [],
  },
};

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
  const price = isAnnual ? info.annualPrice / 12 : info.monthlyPrice;
  const savings = isAnnual && tier !== "free" ? Math.round((1 - info.annualPrice / (info.monthlyPrice * 12)) * 100) : 0;
  const bullets = FEATURE_BULLETS[tier];

  return (
    <div
      className={`relative flex flex-col p-5 sm:p-6 rounded-lg bg-white ${
        isPopular
          ? "border-2 border-signal"
          : "border-[1.5px] border-line"
      }`}
    >
      {isCurrentPlan ? (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald text-white text-xs font-semibold rounded-md">
          Current Plan
        </span>
      ) : isPopular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-signal text-white text-xs font-semibold rounded-md">
          Most Popular
        </span>
      )}

      <div className="mb-6">
        <h3 className="text-xl font-bold text-ink-900">{info.name}</h3>
        <p className="text-sm text-ink-500 mt-1">{info.description}</p>
      </div>

      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl sm:text-4xl font-bold text-ink-900" style={{ fontFamily: "var(--font-display)" }}>
            ${tier === "free" ? 0 : Math.round(price)}
          </span>
          {tier !== "free" && (
            <span className="text-ink-500">/mo</span>
          )}
        </div>
        {isAnnual && tier !== "free" && (
          <p className="text-sm text-emerald font-medium mt-1">
            Save {savings}% — 2 months free
          </p>
        )}
        {isAnnual && tier !== "free" && (
          <p className="text-xs text-ink-500 mt-1">
            ${info.annualPrice}/year billed annually
          </p>
        )}
      </div>

      <ul className="space-y-3.5 mb-8 flex-1">
        {bullets.included.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <CheckIcon className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
            <span className="text-ink-700">{text}</span>
          </li>
        ))}
        {bullets.excluded.map((text) => (
          <li key={text} className="flex items-start gap-3">
            <XIcon className="w-5 h-5 text-ink-300 flex-shrink-0 mt-0.5" />
            <span className="text-ink-400">{text}</span>
          </li>
        ))}
      </ul>

      {/* 30-day guarantee for paid tiers */}
      {tier !== "free" && !isCurrentPlan && (
        <p className="text-xs text-ink-500 text-center mb-3">
          30-day money-back guarantee
        </p>
      )}

      {isCurrentPlan ? (
        <Link
          href="/settings/billing"
          className="btn-secondary w-full text-center"
        >
          Manage subscription
        </Link>
      ) : tier === "free" ? (
        isLoggedIn ? (
          <Link
            href="/dashboard"
            className="btn-secondary w-full text-center"
          >
            You&apos;re on Free
          </Link>
        ) : (
          <Link
            href="/login"
            className="btn-secondary w-full text-center"
          >
            Start with 1 page free
          </Link>
        )
      ) : (
        <button
          onClick={onSelect}
          disabled={loading}
          className={`w-full font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
            isPopular
              ? "btn-primary"
              : "btn-secondary"
          }`}
        >
          {loading ? "Loading..." : `Get ${info.name}`}
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

  const cardsReveal = useScrollReveal(0.15);
  const ctaReveal = useScrollReveal(0.3);
  const faqReveal = useScrollReveal(0.15);

  return (
    <div className="bg-paper-0">
      {/* Hero */}
      <section className="pt-12 pb-8 sm:pt-16 sm:pb-10 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6 pricing-hero-headline"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Know what every change did to your metrics
          </h1>
          <p className="text-lg text-ink-500 mb-8 max-w-xl mx-auto pricing-hero-sub">
            Track 1 page free. Scale when you need to watch more.
          </p>

          {/* Billing toggle */}
          <div className="pricing-toggle pricing-hero-toggle">
            <div
              className="pricing-toggle-slider"
              style={{ transform: isAnnual ? "translateX(100%)" : "translateX(0)" }}
            />
            <button
              onClick={() => setIsAnnual(false)}
              aria-pressed={!isAnnual}
              className={`pricing-toggle-btn ${!isAnnual ? "active" : ""}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setIsAnnual(true)}
              aria-pressed={isAnnual}
              className={`pricing-toggle-btn ${isAnnual ? "active" : ""}`}
            >
              Annual
              <span className="ml-1.5 text-xs text-emerald font-semibold">
                2 months free
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing cards */}
      <section className="pb-12 sm:pb-16 px-4">
        <div
          ref={cardsReveal.ref}
          className={`max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6 scroll-reveal-stagger ${cardsReveal.revealed ? "revealed" : ""}`}
        >
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

      {/* Secondary CTA */}
      <section className="pb-12 sm:pb-16 px-4">
        <div
          ref={ctaReveal.ref}
          className={`max-w-2xl mx-auto text-center scroll-reveal ${ctaReveal.revealed ? "revealed" : ""}`}
        >
          <p className="text-ink-500 mb-3">
            Not ready to commit? No credit card required.
          </p>
          <Link href="/" className="text-signal font-medium hover:underline">
            Run a free audit
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-12 sm:py-16 px-4 bg-paper-100 border-t border-line-subtle">
        <div
          ref={faqReveal.ref}
          className={`max-w-3xl mx-auto scroll-reveal ${faqReveal.revealed ? "revealed" : ""}`}
        >
          <h2
            className="text-2xl sm:text-3xl font-bold text-ink-900 mb-8 text-center"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Questions
          </h2>

          <div className="space-y-4 sm:space-y-6">
            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                Can I switch plans later?
              </h3>
              <p className="text-ink-700">
                Yes. Upgrade anytime — you&apos;ll only pay the difference for
                the rest of your billing period. Downgrade at renewal if you
                need fewer pages.
              </p>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                What happens if I hit my page limit?
              </h3>
              <p className="text-ink-700">
                You can&apos;t add more pages until you remove one or upgrade.
                Everything you&apos;re already tracking keeps working.
              </p>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                What counts as a metrics tool?
              </h3>
              <p className="text-ink-700">
                Each tool counts as one: PostHog, Google Analytics 4, or Supabase.
                Connect one on Starter, all of them on Pro. You can disconnect
                and switch anytime.
              </p>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                I use Cursor/Lovable/Bolt — do I need this?
              </h3>
              <p className="text-ink-700">
                If you ship code without always remembering what changed, yes.
                Loupe watches your site and tells you exactly what&apos;s different.
                When your bounce rate moves, you&apos;ll know whether it was the
                headline you tweaked last Tuesday or the CTA your AI changed on Friday.
              </p>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                Can I see what Loupe looks like before paying?
              </h3>
              <p className="text-ink-700">
                Yes. Run a free audit on any page — no signup required. Or start
                free and track 1 page over time. No credit card, no time limit.
              </p>
            </div>

            <div className="glass-card p-4 sm:p-6">
              <h3 className="font-semibold text-ink-900 mb-2">
                Do you offer refunds?
              </h3>
              <p className="text-ink-700">
                Yes. If Loupe isn&apos;t right for you, email us within 30 days
                of your first payment for a full refund.{" "}
                <a href="mailto:team@getloupe.io" className="text-signal hover:underline">
                  team@getloupe.io
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
