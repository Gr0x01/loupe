"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TIER_INFO, type SubscriptionTier } from "@/lib/permissions";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import FreeAuditForm from "@/components/seo/FreeAuditForm";

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

interface FeatureRow {
  text: string;
  included: boolean;
}

/** Ordered feature rows per tier (keeps row order consistent across cards) */
const FEATURE_ROWS: Record<SubscriptionTier, FeatureRow[]> = {
  free: [
    { text: "1 page tracked", included: true },
    { text: "Weekly automated scans", included: true },
    { text: "GitHub commit tracking", included: false },
    { text: "Analytics integrations", included: false },
    { text: "Email alerts", included: true },
    { text: "Mobile + desktop page checks", included: false },
  ],
  starter: [
    { text: "3 pages tracked", included: true },
    { text: "Daily automated scans", included: true },
    { text: "GitHub commit tracking", included: true },
    { text: "1 integration: PostHog, GA4, or Supabase", included: true },
    { text: "Email alerts", included: true },
    { text: "Mobile + desktop page checks", included: false },
  ],
  pro: [
    { text: "10 pages tracked", included: true },
    { text: "Daily automated scans", included: true },
    { text: "GitHub commit tracking", included: true },
    { text: "All integrations: PostHog + GA4 + Supabase", included: true },
    { text: "Email alerts", included: true },
    { text: "Mobile + desktop page checks", included: true },
  ],
};

const TIER_BEST_FOR: Record<SubscriptionTier, string> = {
  free: "Trying one critical page",
  starter: "Solo founders shipping fast",
  pro: "Founders with multiple funnels",
};

const TIER_VALUE_LINE: Record<SubscriptionTier, string> = {
  free: "Set baseline for homepage",
  starter: "Catch risky changes after deploy",
  pro: "Correlate commits to outcomes",
};

const TIER_THEME: Record<SubscriptionTier, {
  cardBorder: string;
  headerBg: string;
  headerText: string;
  headerSubtle: string;
  valueText: string;
}> = {
  free: {
    cardBorder: "border-line",
    headerBg: "bg-paper-100",
    headerText: "text-ink-900",
    headerSubtle: "text-ink-500",
    valueText: "text-ink-700",
  },
  starter: {
    cardBorder: "border-signal",
    headerBg: "bg-signal",
    headerText: "text-white",
    headerSubtle: "text-white/85",
    valueText: "text-signal",
  },
  pro: {
    cardBorder: "border-blue",
    headerBg: "bg-blue",
    headerText: "text-white",
    headerSubtle: "text-white/85",
    valueText: "text-blue",
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
  const isPro = tier === "pro";
  const info = TIER_INFO[tier];
  const price = isAnnual ? info.annualPrice / 12 : info.monthlyPrice;
  const savings = isAnnual && tier !== "free" ? Math.round((1 - info.annualPrice / (info.monthlyPrice * 12)) * 100) : 0;
  const features = FEATURE_ROWS[tier];
  const bestFor = TIER_BEST_FOR[tier];
  const valueLine = TIER_VALUE_LINE[tier];
  const theme = TIER_THEME[tier];
  const badge = isCurrentPlan
    ? { label: "Current Plan", className: "bg-emerald text-white border border-emerald-hover" }
    : isPopular
      ? { label: "Most Popular", className: "bg-white text-signal border border-signal/40" }
      : isPro
        ? { label: "For Teams", className: "bg-white text-blue border border-blue/40" }
        : null;

  return (
    <div
      className={`relative flex flex-col rounded-2xl overflow-hidden border-2 ${theme.cardBorder} bg-white shadow-[2px_2px_0_rgba(51,65,85,0.14)] transition-all duration-200 hover:-translate-y-[3px] hover:shadow-[4px_4px_0_rgba(51,65,85,0.2)]`}
    >
      <div className={`px-5 sm:px-6 py-4 border-b-2 ${theme.cardBorder} ${theme.headerBg} ${theme.headerText}`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-2xl font-bold">{info.name}</h3>
          {badge && (
            <span className={`px-2.5 py-1 text-[11px] leading-none font-semibold rounded-full ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
        <p className={`text-sm mt-1 ${theme.headerSubtle}`}>{info.description}</p>
        <p className={`text-xs mt-2 ${theme.headerSubtle} flex items-baseline gap-1 min-w-0 whitespace-nowrap`}>
          <span>Best for:</span>
          <span className="font-semibold min-w-0 truncate" title={bestFor}>
            {bestFor}
          </span>
        </p>
      </div>

      <div className="px-5 sm:px-6 pt-5 pb-6 flex flex-col flex-1">
        <div className="flex items-baseline gap-1">
          <span className="text-4xl sm:text-5xl font-bold text-ink-900" style={{ fontFamily: "var(--font-display)" }}>
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
        {isAnnual && tier === "free" && (
          <div aria-hidden="true" className="mt-1">
            <p className="text-sm mt-1 opacity-0 select-none">
              Save 17% — 2 months free
            </p>
            <p className="text-xs text-ink-500 mt-1 opacity-0 select-none">
              $120/year billed annually
            </p>
          </div>
        )}
        <p className={`mt-2 text-[11px] uppercase tracking-[0.08em] font-semibold ${theme.valueText} leading-[1.2] whitespace-nowrap overflow-hidden text-ellipsis`}>
          {valueLine}
        </p>

        <div className="h-px bg-line-subtle my-6" />

        <ul className="space-y-2.5 mb-8 flex-1">
          {features.map((feature) => (
            <li
              key={feature.text}
              className="grid grid-cols-[20px_1fr] items-start gap-2.5 pb-2 border-b border-dashed border-line-subtle last:border-0 last:pb-0"
            >
              {feature.included ? (
                <CheckIcon className="w-5 h-5 text-emerald flex-shrink-0 mt-0.5" />
              ) : (
                <XIcon className="w-5 h-5 text-ink-300 flex-shrink-0 mt-0.5" />
              )}
              <span className={feature.included ? "text-ink-700 leading-snug" : "text-ink-400 leading-snug"}>
                {feature.text}
              </span>
            </li>
          ))}
        </ul>

        {/* 30-day guarantee for paid tiers */}
        {tier !== "free" && !isCurrentPlan && (
          <p className="text-xs text-ink-500 text-center mb-3 pt-3 border-t border-line-subtle">
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
              href="/#hero-form"
              className="btn-secondary w-full text-center"
            >
              Run a free audit
            </Link>
          )
        ) : (
          <button
            onClick={onSelect}
            disabled={loading}
            className={`w-full font-medium rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              isPopular
                ? "btn-primary"
                : isPro
                  ? "py-3 px-5 bg-blue text-white border-2 border-blue-hover rounded-[10px] shadow-[2px_2px_0_rgba(37,99,235,0.24)] hover:bg-blue-hover"
                  : "btn-secondary"
            }`}
          >
            {loading ? "Loading..." : tier === "starter" ? "Start watching 3 pages" : "Track revenue pages"}
          </button>
        )}
      </div>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div className="bg-paper-0 min-h-screen">
      <section className="pt-12 pb-10 sm:pt-16 sm:pb-12 px-4">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="h-5 w-48 mx-auto bg-border-subtle/30 rounded-full animate-pulse" />
          <div className="h-10 w-3/4 mx-auto bg-border-subtle/40 rounded animate-pulse" />
          <div className="h-5 w-2/3 mx-auto bg-border-subtle/30 rounded animate-pulse" />
          <div className="h-10 w-56 mx-auto bg-border-subtle/20 rounded-full animate-pulse mt-4" />
        </div>
      </section>
      <section className="pt-7 sm:pt-10 pb-12 sm:pb-16 px-4">
        <div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border-2 border-line bg-white p-6 space-y-4">
              <div className="h-6 w-24 bg-border-subtle/40 rounded animate-pulse" />
              <div className="h-10 w-20 bg-border-subtle/30 rounded animate-pulse" />
              <div className="space-y-2">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-4 w-full bg-border-subtle/20 rounded animate-pulse" />
                ))}
              </div>
              <div className="h-11 w-full bg-border-subtle/30 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** Wrap in Suspense for useSearchParams */
export default function PricingContentWrapper() {
  return (
    <Suspense fallback={<PricingSkeleton />}>
      <PricingContent />
    </Suspense>
  );
}

function PricingContent() {
  const searchParams = useSearchParams();
  const canceledCheckout = searchParams.get("canceled") === "true";
  const [isAnnual, setIsAnnual] = useState(true);
  const [loading, setLoading] = useState<SubscriptionTier | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentTier, setCurrentTier] = useState<SubscriptionTier | null>(null);
  const [showCanceledToast, setShowCanceledToast] = useState(false);

  function clearCanceledParam() {
    if (typeof window === "undefined") return;

    const url = new URL(window.location.href);
    if (!url.searchParams.has("canceled")) return;

    url.searchParams.delete("canceled");
    const nextUrl = `${url.pathname}${url.search}${url.hash}`;
    window.history.replaceState({}, "", nextUrl);
  }

  function dismissCanceledToast() {
    setShowCanceledToast(false);
    clearCanceledParam();
  }

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

  useEffect(() => {
    if (canceledCheckout) {
      setShowCanceledToast(true);
    }
  }, [canceledCheckout]);

  useEffect(() => {
    if (!showCanceledToast) return;

    const timer = window.setTimeout(() => {
      setShowCanceledToast(false);
      clearCanceledParam();
    }, 7000);

    return () => window.clearTimeout(timer);
  }, [showCanceledToast]);

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
      {showCanceledToast && (
        <div className="fixed bottom-4 right-4 z-[150] w-[min(440px,calc(100vw-2rem))]">
          <div className="p-4 sm:p-5 rounded-lg border border-slate-600 bg-slate-900/95 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <p className="text-white font-medium text-sm sm:text-base leading-snug pr-1">
                Checkout canceled. You can keep using Free (1 page, forever).
              </p>
              <button
                onClick={dismissCanceledToast}
                className="text-slate-300 hover:text-white transition-colors p-0.5 -m-0.5"
                aria-label="Dismiss"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <Link
                href={isLoggedIn ? "/dashboard" : "/login?redirect=/dashboard"}
                className="btn-secondary text-center w-full"
              >
                Keep using Free
              </Link>
              <button
                onClick={() => handleSelect("starter")}
                disabled={loading !== null}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === "starter" ? "Loading..." : "Resume upgrade"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="pt-12 pb-2 sm:pt-16 sm:pb-3 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 border-line bg-white text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-700 mb-4">
            Pricing for fast-shipping founders
          </p>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6 pricing-hero-headline"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Know what changed while you were shipping
          </h1>
          <p className="text-lg text-ink-500 mb-6 max-w-xl mx-auto pricing-hero-sub">
            Loupe watches your key pages and shows whether each change helped or hurt. Connect PostHog, GA4, or Supabase for proof.
          </p>

        </div>
      </section>

      {/* Pricing cards */}
      <section
        className="pt-5 sm:pt-6 pb-12 sm:pb-16 px-4 relative overflow-hidden"
        style={{
          backgroundImage: "radial-gradient(rgba(148,163,184,0.26) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
        }}
      >
        {/* Billing toggle */}
        <div className="flex justify-center mb-8 relative">
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

      {/* Try It First — Audit CTA */}
      <section className="py-10 sm:py-14 px-4 bg-white border-y-2 border-line-subtle">
        <div
          ref={ctaReveal.ref}
          className={`max-w-2xl mx-auto text-center scroll-reveal ${ctaReveal.revealed ? "revealed" : ""}`}
        >
          <span
            className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ background: 'var(--violet-subtle)', color: 'var(--violet)' }}
          >
            Try it first
          </span>
          <h2
            className="text-xl sm:text-2xl font-bold text-ink-900 mb-2"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            See what Loupe finds on your page
          </h2>
          <p className="text-ink-500 mb-6">
            Paste any URL. Get findings and predictions in 30 seconds. No signup.
          </p>
          <FreeAuditForm
            ctaText="Run free audit"
            placeholder="https://yoursite.com"
            className="max-w-lg mx-auto"
            source="pricing"
          />
          <p className="text-xs text-ink-400 mt-4">
            Free forever for 1 page. Upgrade when you need more.
          </p>
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
                Can I try Loupe before signing up?
              </h3>
              <p className="text-ink-700">
                Yes. Paste any URL above and get findings in 30 seconds — no
                account needed. If you want to track changes over time, the free
                plan gives you 1 page forever.
              </p>
            </div>

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
