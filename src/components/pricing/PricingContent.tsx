"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TIER_INFO, BETA_PRICING, type SubscriptionTier } from "@/lib/permissions";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import FreeAuditForm from "@/components/seo/FreeAuditForm";

const tiers: SubscriptionTier[] = ["free", "pro", "scale"];

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
  pro: "5 pages, daily scans.",
  scale: "15 pages, daily scans.",
};

const TIER_CTA: Record<SubscriptionTier, string> = {
  free: "Start free",
  pro: "Start 14-day free trial",
  scale: "Start 14-day free trial",
};

const TIER_BENEFIT: Record<SubscriptionTier, string> = {
  free: "Weekly baseline checks.",
  pro: "Desktop + mobile screenshots. 30-day impact follow-up.",
  scale: "Everything in Pro. 90-day impact follow-up.",
};

/** Comparison table rows: [label, free, pro, scale] — ✓ = included, — = not */
const COMPARE_ROWS: { label: string; free: string; pro: string; scale: string }[] = [
  { label: "Pages tracked", free: "1", pro: "5", scale: "15" },
  { label: "Scan frequency", free: "Weekly", pro: "Daily", scale: "Daily" },
  { label: "Mobile screenshots", free: "—", pro: "✓", scale: "✓" },
  { label: "GitHub deploy tracking", free: "—", pro: "✓", scale: "✓" },
  { label: "Analytics sources", free: "—", pro: "All", scale: "All" },
  { label: "Impact follow-up", free: "—", pro: "30 days", scale: "90 days" },
  { label: "Email alerts", free: "✓", pro: "✓", scale: "✓" },
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
          period: "monthly",
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
                onClick={() => handleSelect("pro")}
                disabled={loading !== null}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading === "pro" ? "Loading..." : "Try Pro free"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="pt-12 pb-2 sm:pt-16 sm:pb-3 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-[11px] font-semibold uppercase tracking-[0.12em] mb-4"
            style={{ borderColor: "var(--violet-border)", background: "var(--violet-subtle)", color: "var(--violet)" }}
          >
            {BETA_PRICING.label}
          </p>
          <h1
            className="text-3xl sm:text-4xl md:text-5xl font-bold text-ink-900 mb-6 pricing-hero-headline"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Conversions dropped. What&nbsp;changed?
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
        <div className="max-w-3xl mx-auto">
          {/* Compact cards row */}
          <div
            ref={cardsReveal.ref}
            className={`grid grid-cols-1 sm:grid-cols-3 gap-4 scroll-reveal-stagger ${cardsReveal.revealed ? "revealed" : ""}`}
          >
            {tiers.map((tier) => {
              const info = TIER_INFO[tier];
              const isPro = tier === "pro";
              const isScale = tier === "scale";
              const isCurrent = currentTier === tier;

              return (
                <div
                  key={tier}
                  className={`rounded-xl border-2 bg-white p-5 transition-all duration-200 flex flex-col ${
                    isPro
                      ? "border-signal shadow-[2px_2px_0_rgba(248,90,56,0.16)] order-first sm:order-none"
                    : isScale
                        ? "border-line shadow-[2px_2px_0_rgba(51,65,85,0.14)]"
                        : "border-line-subtle border-dashed shadow-none order-last sm:order-none"
                  }`}
                >
                  {/* Name + tagline */}
                  <h3
                    className="text-lg font-bold text-ink-900"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {info.name}
                    {isCurrent && (
                      <span className="text-[11px] font-normal text-emerald uppercase tracking-wider ml-2">
                        Current plan
                      </span>
                    )}
                  </h3>
                  <p className="text-sm text-ink-500 mt-0.5">
                    {TIER_TAGLINE[tier]}
                  </p>

                  {/* Price */}
                  <div className="mt-4 mb-1">
                    {tier !== "free" ? (
                      <div className="flex items-baseline gap-2">
                        <span
                          className="text-4xl font-bold text-ink-900"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          ${Math.round(info.monthlyPrice * BETA_PRICING.discount)}
                        </span>
                        <span className="text-lg text-ink-400 line-through">
                          ${info.monthlyPrice}
                        </span>
                        <span className="text-ink-500">/mo</span>
                      </div>
                    ) : (
                      <span
                        className="text-4xl font-bold text-ink-900"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        $0
                      </span>
                    )}
                  </div>
                  {tier !== "free" ? (
                    <p className="text-xs text-ink-500">
                      ${info.monthlyPrice}/mo after beta
                    </p>
                  ) : (
                    <div className="h-4" />
                  )}

                  <p
                    className={`mt-3 text-sm min-h-[52px] ${
                      isScale ? "text-ink-900 font-semibold" : "text-ink-600"
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
                        Manage plan
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
                          isPro
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
                      tier === "pro"
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
                  {(["free", "pro", "scale"] as const).map((tier) => {
                    const val = row[tier];
                    const isCheck = val === "✓";
                    const isDash = val === "—";
                    return (
                      <div
                        key={tier}
                        className={`px-3 py-3 text-center text-sm ${
                          tier === "pro"
                            ? "bg-signal/5 border-x-2 border-signal/20 text-ink-900 font-medium"
                            : isDash
                              ? "text-ink-300"
                              : "text-ink-500"
                        }`}
                      >
                        {isCheck ? (
                          <CheckIcon className={`w-5 h-5 mx-auto ${tier === "pro" ? "text-signal" : "text-emerald"}`} />
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
                How does the 14-day trial work?
              </h3>
              <p className="text-ink-700">
                When you sign up, you get 14 days of Pro features — 5 pages,
                daily scans, mobile screenshots, and 30-day impact follow-up.
                No credit card required. After 14 days, you keep your free page
                and can upgrade anytime.
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
                What&apos;s the difference between Pro and Scale?
              </h3>
              <p className="text-ink-700">
                Pro tracks 5 pages with 30-day impact follow-up — enough for most
                solo founders and small teams. Scale gives you 15 pages and 90-day
                impact follow-up, so you can track longer experiments and more of your site.
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
                Will my beta price go up?
              </h3>
              <p className="text-ink-700">
                No. If you subscribe during beta, you keep your beta price for
                life — even as we add features and raise prices for new customers.
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
