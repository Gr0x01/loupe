"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import MockComparisonCard from "@/components/MockComparisonCard";
import FreeAuditForm from "@/components/seo/FreeAuditForm";

interface FoundingStatus {
  claimed: number;
  total: number;
  isFull: boolean;
  remaining: number;
}

function FoundingProgress({ status }: { status: FoundingStatus | null }) {
  if (!status) return null;

  const percentage = Math.round((status.claimed / status.total) * 100);

  if (status.isFull) {
    return (
      <p className="text-sm text-text-muted text-center lg:text-left">
        Founding 50 is full.{" "}
        <Link href="/waitlist" className="text-accent font-medium hover:underline">
          Join the waitlist
        </Link>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 justify-center lg:justify-start">
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-bg-inset rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${percentage}%`, backgroundColor: "#5B2E91" }}
          />
        </div>
        <span className="text-sm font-medium text-text-primary">
          {status.claimed}/{status.total}
        </span>
      </div>
      <span className="text-sm text-text-muted">Founding spots — free forever</span>
    </div>
  );
}

function WatchingIndicator() {
  return (
    <div className="inline-flex items-center gap-2 text-xs font-medium text-text-secondary uppercase tracking-wide">
      <div className="relative">
        <div className="w-1.5 h-1.5 rounded-full bg-score-high" />
        <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-score-high animate-ping opacity-75" />
      </div>
      <span>Watching 847 pages</span>
    </div>
  );
}

function MiniScreenshot() {
  return (
    <div className="w-full max-w-[140px] h-[72px] mx-auto md:mx-0">
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm overflow-hidden h-full flex flex-col">
        {/* Browser chrome */}
        <div className="flex items-center gap-1 px-2 py-1.5 bg-bg-secondary border-b border-border-subtle">
          <div className="w-1.5 h-1.5 rounded-full bg-text-muted/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-text-muted/20" />
          <div className="w-1.5 h-1.5 rounded-full bg-text-muted/20" />
        </div>
        {/* Content placeholder */}
        <div className="p-2 space-y-1.5 flex-1">
          <div className="h-2 w-3/4 bg-accent/10 rounded" />
          <div className="h-1.5 w-full bg-text-muted/10 rounded" />
          <div className="h-1.5 w-2/3 bg-text-muted/10 rounded" />
        </div>
      </div>
    </div>
  );
}

function MiniNotification() {
  return (
    <div className="w-full max-w-[140px] h-[72px] mx-auto md:mx-0">
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-3 h-full flex flex-col justify-center">
        <div className="flex items-start gap-2">
          <div className="w-6 h-6 rounded bg-accent/30 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-[#333340] truncate">Your page changed</p>
            <p className="text-[10px] text-[#6E6E80] truncate">Hero headline updated</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniChart() {
  return (
    <div className="w-full max-w-[140px] h-[72px] mx-auto md:mx-0">
      <div className="bg-white rounded-lg border border-border-subtle shadow-sm p-3 h-full flex flex-col justify-between">
        <div className="flex items-end justify-between gap-1.5 flex-1">
          <div className="w-4 bg-text-muted/10 rounded-sm" style={{ height: '40%' }} />
          <div className="w-4 bg-text-muted/10 rounded-sm" style={{ height: '65%' }} />
          <div className="w-4 bg-text-muted/10 rounded-sm" style={{ height: '50%' }} />
          <div className="w-4 bg-accent/20 rounded-sm" style={{ height: '85%' }} />
          <div className="w-4 bg-score-high/30 rounded-sm" style={{ height: '100%' }} />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <span className="text-[10px] font-bold text-score-high">+12%</span>
          <span className="text-[9px] text-text-muted">conversions</span>
        </div>
      </div>
    </div>
  );
}

function HowItWorksSection() {
  return (
    <section className="section-dark px-4 py-20">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-14 text-center">
          <h2
            className="text-[clamp(2rem,4vw,3rem)] leading-tight"
            style={{ fontFamily: "var(--font-instrument-serif)", color: "#F5F5F7" }}
          >
            Ship fast. We&apos;ll catch what&nbsp;you&nbsp;miss.
          </h2>
        </div>

        {/* Steps — 3 columns with mini mockups */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-8">
          <div className="text-center md:text-left">
            <div className="mb-5">
              <MiniScreenshot />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "#F5F5F7" }}>
              We watch it
            </h3>
            <p className="text-base leading-relaxed" style={{ color: "rgba(245, 245, 247, 0.7)" }}>
              After every change. See what actually&nbsp;shipped.
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="mb-5">
              <MiniNotification />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "#F5F5F7" }}>
              We tell you when
            </h3>
            <p className="text-base leading-relaxed" style={{ color: "rgba(245, 245, 247, 0.7)" }}>
              On deploy or weekly. Email when we detect&nbsp;changes.
            </p>
          </div>

          <div className="text-center md:text-left">
            <div className="mb-5">
              <MiniChart />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: "#F5F5F7" }}>
              You connect the dots
            </h3>
            <p className="text-base leading-relaxed" style={{ color: "rgba(245, 245, 247, 0.7)" }}>
              Link your analytics. See what the change&nbsp;did.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

const CheckIconSmall = () => (
  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
);

const TerminalIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 6 7 9 4 12" />
    <line x1="9" y1="12" x2="12" y2="12" />
  </svg>
);

function AIChangelogCard() {
  return (
    <div className="glass-card-elevated p-5 sm:p-6 max-w-sm w-full">
      {/* Header — tool context */}
      <div className="flex items-center gap-2 mb-5">
        <span className="element-badge flex items-center gap-1.5">
          <TerminalIcon />
          <span>Cursor</span>
        </span>
        <span className="text-text-muted">&middot;</span>
        <span className="text-xs text-text-muted">14 minutes ago</span>
      </div>

      {/* Section label */}
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Session changes
      </p>

      {/* Changes list */}
      <div className="space-y-3">
        {/* Change 1 - Hero refactor */}
        <div className="bg-bg-inset rounded-xl p-3">
          <div className="flex items-start gap-2.5">
            <span className="evaluation-icon evaluation-icon-resolved flex-shrink-0 mt-0.5 !w-5 !h-5">
              <CheckIconSmall />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Refactored hero section
              </p>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-text-muted font-mono">
                  <span className="text-score-low">−</span> &quot;Ship 10x faster&quot;
                </p>
                <p className="text-xs text-text-muted font-mono">
                  <span className="text-score-high">+</span> &quot;Build better products&quot;
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Change 2 - Pricing */}
        <div className="bg-bg-inset rounded-xl p-3">
          <div className="flex items-start gap-2.5">
            <span className="evaluation-icon evaluation-icon-resolved flex-shrink-0 mt-0.5 !w-5 !h-5">
              <CheckIconSmall />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Updated pricing component
              </p>
              <p className="text-xs text-text-muted mt-1">
                &ldquo;Most Popular&rdquo; badge removed
              </p>
            </div>
          </div>
        </div>

        {/* Change 3 - Checkout */}
        <div className="bg-bg-inset rounded-xl p-3">
          <div className="flex items-start gap-2.5">
            <span className="evaluation-icon evaluation-icon-resolved flex-shrink-0 mt-0.5 !w-5 !h-5">
              <CheckIconSmall />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">
                Fixed checkout flow
              </p>
              <p className="text-xs text-text-muted mt-1">
                Button: &ldquo;Buy now&rdquo; &rarr; &ldquo;Continue&rdquo;
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer question */}
      <div className="mt-5 pt-4 border-t border-border-subtle">
        <p className="text-sm text-text-muted text-center">
          Your AI said <span className="font-semibold text-text-secondary">&ldquo;Done!&rdquo;</span>
        </p>
        <p className="text-sm text-accent font-medium text-center mt-1">
          But what did your visitors see?
        </p>
      </div>
    </div>
  );
}

function VibeCoderSection() {
  return (
    <section className="px-4 py-24">
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Copy */}
          <div className="text-center lg:text-left">
            <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-4">
              Building with AI?
            </p>
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight mb-6"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              We catch what it changes.
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed">
              Lovable rebuilt your pricing page. Cursor refactored your hero. Bolt &ldquo;fixed&rdquo; your checkout flow. Do you know what actually&nbsp;shipped?
            </p>
          </div>

          {/* Right — Mock AI Changelog */}
          <div className="flex justify-center lg:justify-end">
            <AIChangelogCard />
          </div>
        </div>
      </div>
    </section>
  );
}

function AnalyticsSection() {
  const [activeExample, setActiveExample] = useState(0);

  const examples = [
    {
      change: "CTA moved above the fold",
      status: "resolved",
      time: "Tuesday 2:34pm",
      commit: "e8f2a1b",
      metrics: [
        { value: "-12%", label: "bounce rate", positive: true },
        { value: "+8%", label: "signups", positive: true },
      ],
    },
    {
      change: "Testimonials section removed",
      status: "regressed",
      time: "Monday 11:20am",
      commit: "a3c9d2f",
      metrics: [
        { value: "+18%", label: "bounce rate", positive: false },
        { value: "-5%", label: "conversions", positive: false },
      ],
    },
    {
      change: "Headline rewritten",
      status: "improved",
      time: "Friday 4:15pm",
      commit: "b7e1f4a",
      metrics: [
        { value: "+23%", label: "time on page", positive: true },
        { value: "+11%", label: "scroll depth", positive: true },
      ],
    },
  ];

  // Auto-cycle examples
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveExample((prev) => (prev + 1) % examples.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [examples.length]);

  const example = examples[activeExample];

  const statusConfig = {
    resolved: { icon: "check", class: "evaluation-icon-resolved" },
    regressed: { icon: "down", class: "evaluation-icon-regressed" },
    improved: { icon: "up", class: "evaluation-icon-improved" },
  };

  const config = statusConfig[example.status as keyof typeof statusConfig];

  return (
    <section className="px-4 py-24">
      <div className="w-full max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — Mock correlation card */}
          <div className="flex justify-center lg:justify-start order-2 lg:order-1">
            <div className="glass-card-elevated p-6 w-full max-w-md transition-all duration-300" key={activeExample}>
              {/* The change */}
              <div className="flex items-start gap-4 mb-6 animate-[fadeIn_0.3s_ease-out]">
                <div className={`evaluation-icon ${config.class} flex-shrink-0 mt-1`}>
                  {config.icon === "check" && (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                    </svg>
                  )}
                  {config.icon === "down" && (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 4l-4 4-4 4" />
                      <path d="M12 4H4" />
                    </svg>
                  )}
                  {config.icon === "up" && (
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12l4-4 4-4" />
                      <path d="M4 12h8" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="font-semibold text-text-primary">{example.change}</p>
                  <p className="text-sm text-text-muted mt-0.5">
                    {example.time}
                  </p>
                </div>
              </div>

              {/* The metric impact */}
              <div className="bg-bg-inset rounded-xl p-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                  Since this change
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {example.metrics.map((metric, i) => (
                    <div key={i}>
                      <p
                        className={`text-2xl font-bold ${metric.positive ? "text-score-high" : "text-score-low"}`}
                        style={{ fontFamily: "var(--font-instrument-serif)" }}
                      >
                        {metric.value}
                      </p>
                      <p className="text-sm text-text-secondary">{metric.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attribution line */}
              <p className="text-xs text-text-muted mt-4 text-center">
                From your analytics · 7 day window
              </p>
            </div>
          </div>

          {/* Right — The insight */}
          <div className="text-center lg:text-left order-1 lg:order-2">
            <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-4">
              Catch it early
            </p>
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Know what changed before it costs&nbsp;you
            </h2>
            <p className="text-lg text-text-secondary leading-relaxed mb-6">
              Every change ships with numbers attached. Not just what moved&mdash;what it cost&nbsp;you.
            </p>

            {/* Example selector dots */}
            <div className="flex gap-1 justify-center lg:justify-start">
              {examples.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveExample(i)}
                  className="p-2 -m-2 cursor-pointer"
                >
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === activeExample ? "bg-accent w-6" : "bg-text-muted/30 w-2"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [foundingStatus, setFoundingStatus] = useState<FoundingStatus | null>(null);

  useEffect(() => {
    // Fetch founding 50 status
    fetch("/api/founding-status")
      .then((res) => res.json())
      .then((data) => setFoundingStatus(data))
      .catch(() => {}); // Silently fail — status is nice-to-have
  }, []);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero — Two Column Layout */}
      <section className="min-h-[80vh] flex items-start pt-16 lg:pt-24 px-4 pb-16">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left Column — Copy + Input */}
            <div className="text-center lg:text-left">
              <div className="mb-5 flex justify-center lg:justify-start">
                <WatchingIndicator />
              </div>

              <h1
                className="text-[clamp(2.75rem,5.5vw,4.5rem)] leading-[1.08] tracking-tight text-text-primary"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Your site drifted.
                <br />
                <span className="text-accent">You were busy shipping.</span>
              </h1>
              <p className="text-xl text-text-secondary mt-5 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                We watched. Here&apos;s what changed.
              </p>
              <p className="text-base text-text-muted mt-3 max-w-xl mx-auto lg:mx-0">
                Then we&apos;ll track it. You&apos;ll get an email when it moves.
              </p>

              <div className="mt-12 max-w-xl mx-auto lg:mx-0">
                <FreeAuditForm />
                <div className="flex items-center gap-4 mt-4 justify-center lg:justify-start flex-wrap">
                  <p className="text-sm text-text-muted">
                    Free audit. No signup needed.
                  </p>
                  <FoundingProgress status={foundingStatus} />
                </div>
              </div>
            </div>

            {/* Right Column — Mock Comparison Card */}
            <div className="flex justify-center lg:justify-end">
              <MockComparisonCard />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorksSection />

      {/* Vibe Coder Hook */}
      <VibeCoderSection />

      {/* Analytics Integration */}
      <AnalyticsSection />

      {/* Closing CTA */}
      <section className="bg-bg-inset px-4 py-24 border-t border-border-subtle">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h2
            className="text-[clamp(1.75rem,4vw,2.5rem)] text-text-primary mb-4"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Ship fast. We&apos;ll catch what you&nbsp;miss.
          </h2>
          <div className="flex items-center justify-center gap-4 mb-8 text-sm text-text-muted">
            <span className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-score-high" />
              847 pages watched
            </span>
            <span className="text-text-muted/30">•</span>
            <span>Free audit, no&nbsp;signup</span>
          </div>
          <FreeAuditForm />
        </div>
      </section>
    </div>
  );
}
