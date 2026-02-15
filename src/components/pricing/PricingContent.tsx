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

const TIER_TAGLINE: Record<SubscriptionTier, string> = {
  free: "1 page, weekly scans.",
  starter: "3 pages, daily scans.",
  pro: "10 pages, daily scans.",
};

const TIER_CTA: Record<SubscriptionTier, string> = {
  free: "Start free",
  starter: "Track my 3 pages",
  pro: "Upgrade to Pro",
};

const TIER_BENEFIT: Record<SubscriptionTier, string> = {
  free: "Weekly baseline checks.",
  starter: "Desktop screenshots + deploy tracking.",
  pro: "Mobile + desktop screenshots.",
};

/** Comparison table rows: [label, free, starter, pro] — ✓ = included, — = not */
const COMPARE_ROWS: { label: string; free: string; starter: string; pro: string }[] = [
  { label: "Pages tracked", free: "1", starter: "3", pro: "10" },
  { label: "Scan frequency", free: "Weekly", starter: "Daily", pro: "Daily" },
  { label: "Mobile screenshots", free: "—", starter: "—", pro: "✓" },
  { label: "GitHub deploy tracking", free: "—", starter: "✓", pro: "✓" },
  { label: "Analytics sources", free: "—", starter: "1", pro: "All" },
  { label: "Email alerts", free: "✓", starter: "✓", pro: "✓" },
];

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
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border-2 border-line bg-white p-5 space-y-3">
              <div className="h-5 w-16 bg-border-subtle/40 rounded animate-pulse" />
              <div className="h-8 w-20 bg-border-subtle/30 rounded animate-pulse" />
              <div className="h-10 w-full bg-border-subtle/30 rounded-lg animate-pulse" />
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
  const tableReveal = useScrollReveal(0.1);
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
            Conversions dropped. What changed?
          </h1>
          <p className="text-lg text-ink-500 mb-6 max-w-xl mx-auto pricing-hero-sub">
            Loupe tracks what changed on your pages and connects it to your PostHog, GA4, or Supabase numbers — so you stop guessing and start knowing.
          </p>
        </div>
      </section>

      {/* Compact tier cards + comparison table */}
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

        <div className="max-w-3xl mx-auto">
          {/* Compact cards row */}
          <div
            ref={cardsReveal.ref}
            className={`grid grid-cols-1 sm:grid-cols-3 gap-4 scroll-reveal-stagger ${cardsReveal.revealed ? "revealed" : ""}`}
          >
            {tiers.map((tier) => {
              const info = TIER_INFO[tier];
              const price = isAnnual ? info.annualPrice / 12 : info.monthlyPrice;
              const isStarter = tier === "starter";
              const isPro = tier === "pro";
              const isCurrent = currentTier === tier;
              const savings = isAnnual && tier !== "free" ? Math.round((1 - info.annualPrice / (info.monthlyPrice * 12)) * 100) : 0;

              return (
                <div
                  key={tier}
                  className={`rounded-xl border-2 bg-white p-5 transition-all duration-200 flex flex-col ${
                    isStarter
                      ? "border-signal shadow-[2px_2px_0_rgba(248,90,56,0.16)] order-first sm:order-none"
                    : isPro
                        ? "border-line shadow-[2px_2px_0_rgba(51,65,85,0.14)]"
                        : "border-line-subtle border-dashed shadow-none order-last sm:order-none"
                  }`}
                >
                  {/* Badge area */}
                  <div className="h-5 mb-2 flex items-center">
                    {isCurrent && (
                      <span className="text-[11px] font-semibold text-emerald uppercase tracking-wider">
                        Current plan
                      </span>
                    )}
                    {!isCurrent && isStarter && (
                      <span className="text-[11px] font-semibold text-signal uppercase tracking-wider">
                        Most popular
                      </span>
                    )}
                    {!isCurrent && isPro && (
                      <span className="text-[11px] font-semibold text-emerald uppercase tracking-wider">
                        Mobile included
                      </span>
                    )}
                  </div>

                  {/* Name + tagline */}
                  <h3
                    className="text-lg font-bold text-ink-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {info.name}
                  </h3>
                  <p className="text-sm text-ink-500 mt-0.5">
                    {TIER_TAGLINE[tier]}
                  </p>

                  {/* Price */}
                  <div className="mt-4 mb-1">
                    <span
                      className="text-4xl font-bold text-ink-900"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      ${tier === "free" ? 0 : Math.round(price)}
                    </span>
                    {tier !== "free" && (
                      <span className="text-ink-500 ml-1">/mo</span>
                    )}
                  </div>
                  {isAnnual && tier !== "free" ? (
                    <p className="text-xs text-emerald font-medium">
                      Save {savings}% — ${info.annualPrice}/yr
                    </p>
                  ) : (
                    <div className="h-4" />
                  )}

                  <p
                    className={`mt-3 text-sm min-h-[52px] ${
                      isPro ? "text-ink-900 font-semibold" : "text-ink-600"
                    }`}
                  >
                    {TIER_BENEFIT[tier]}
                  </p>

                  {/* CTA */}
                  <div className="mt-auto pt-3">
                    {isCurrent ? (
                      <Link
                        href="/settings/billing"
                        className="btn-secondary w-full h-12 inline-flex items-center justify-center text-sm"
                      >
                        {isPro ? "Manage Pro plan" : "Manage plan"}
                      </Link>
                    ) : tier === "free" ? (
                      isLoggedIn ? (
                        currentTier === "free" ? (
                          <Link
                            href="/dashboard"
                            className="btn-secondary w-full h-12 inline-flex items-center justify-center text-sm"
                          >
                            You&apos;re on Free
                          </Link>
                        ) : (
                          <Link
                            href="/settings/billing"
                            className="btn-secondary w-full h-12 inline-flex items-center justify-center text-sm"
                          >
                            Downgrade in billing
                          </Link>
                        )
                      ) : (
                        <Link
                          href="/#hero-form"
                          className="btn-secondary w-full h-12 inline-flex items-center justify-center text-sm"
                        >
                          {TIER_CTA[tier]}
                        </Link>
                      )
                    ) : (
                      <button
                        onClick={() => handleSelect(tier)}
                        disabled={loading === tier}
                        className={`w-full h-12 inline-flex items-center justify-center text-sm font-semibold rounded-[10px] px-4 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
                          isStarter
                            ? "btn-primary"
                            : "bg-ink-900 text-white border-2 border-ink-900 hover:bg-ink-700 hover:border-ink-700"
                        }`}
                      >
                        {loading === tier ? "Loading..." : TIER_CTA[tier]}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Comparison table */}
          <div
            ref={tableReveal.ref}
            className={`mt-10 scroll-reveal ${tableReveal.revealed ? "revealed" : ""}`}
          >
            <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wider mb-4">
              Compare features
            </h3>
            <div className="rounded-xl border-2 border-line bg-white shadow-[2px_2px_0_rgba(51,65,85,0.14)] overflow-x-auto">
              {/* Table header — tier names aligned to cards */}
              <div className="grid grid-cols-[140px_repeat(3,minmax(80px,1fr))] sm:grid-cols-[1fr_repeat(3,minmax(0,1fr))] border-b-2 border-line min-w-[420px] sm:min-w-0">
                <div className="px-4 py-3" />
                {tiers.map((tier) => (
                  <div
                    key={tier}
                    className={`px-3 py-3 text-center text-xs font-semibold uppercase tracking-wider ${
                      tier === "starter"
                        ? "text-signal bg-signal/5 border-x-2 border-signal/20"
                        : "text-ink-500"
                    }`}
                  >
                    {TIER_INFO[tier].name}
                  </div>
                ))}
              </div>

              {/* Table rows */}
              {COMPARE_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="grid grid-cols-[140px_repeat(3,minmax(80px,1fr))] sm:grid-cols-[1fr_repeat(3,minmax(0,1fr))] border-b border-line-subtle last:border-0 min-w-[420px] sm:min-w-0"
                >
                  <div className="px-4 py-3 text-sm text-ink-700 font-medium">
                    {row.label}
                  </div>
                  {(["free", "starter", "pro"] as const).map((tier) => {
                    const val = row[tier];
                    const isCheck = val === "✓";
                    const isDash = val === "—";
                    return (
                      <div
                        key={tier}
                        className={`px-3 py-3 text-center text-sm ${
                          tier === "starter"
                            ? "bg-signal/5 border-x-2 border-signal/20 text-ink-900 font-medium"
                            : isDash
                              ? "text-ink-300"
                              : "text-ink-500"
                        }`}
                      >
                        {isCheck ? (
                          <CheckIcon className={`w-5 h-5 mx-auto ${tier === "starter" ? "text-signal" : "text-emerald"}`} />
                        ) : (
                          val
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
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
            Free for one page. Upgrade when you need more.
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
