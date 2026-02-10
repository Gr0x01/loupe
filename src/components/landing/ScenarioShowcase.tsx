"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * ScenarioShowcase — Logo bar + rotating single card
 * Big logos at top, one scenario card below that auto-rotates and is clickable.
 */

interface Scenario {
  id: string;
  source: string;
  sourceIcon: ReactNode;
  changeDate: string;
  sinceWindow: string;
  changeSummary: string;
  detail: {
    before: string;
    after: string;
  };
  impact: {
    delta: number;
    metric: string;
    tone: "positive" | "negative";
  };
  explanation: string;
  visual: {
    kind: "pricing" | "headline" | "cta-fold" | "checkout";
    note: string;
  };
}

const LovableLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M151.083 0c83.413 0 151.061 67.819 151.061 151.467v57.6h50.283c83.413 0 151.082 67.797 151.082 151.466 0 83.691-67.626 151.467-151.082 151.467H0V151.467C0 67.84 67.627 0 151.083 0z"
      fill="url(#lovable-gradient-showcase)"
    />
    <defs>
      <radialGradient id="lovable-gradient-showcase" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="rotate(92.545 118.724 174.844) scale(480.474 650.325)">
        <stop offset=".25" stopColor="#FE7B02"/>
        <stop offset=".433" stopColor="#FE4230"/>
        <stop offset=".548" stopColor="#FE529A"/>
        <stop offset=".654" stopColor="#DD67EE"/>
        <stop offset=".95" stopColor="#4B73FF"/>
      </radialGradient>
    </defs>
  </svg>
);

const V0Logo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fillRule="evenodd" clipRule="evenodd" strokeLinejoin="round" strokeMiterlimit="2">
    <path
      d="M304.043 176h119.979c1.877 0 3.754.128 5.546.384L304.341 301.611a38.55 38.55 0 01-.405-5.654V176h-48V295.98c0 48.256 39.723 87.979 87.979 87.979h120v-48H343.936c-1.92 0-3.818-.128-5.653-.384L463.595 210.24a40.03 40.03 0 01.427 5.76v119.958H512v-119.98C512 167.724 472.278 128 424.022 128h-119.98v48zM0 160v.128l163.968 208.81c19.712 25.089 60.01 11.158 60.01-20.756V160H176v146.56L60.928 160H0z"
      fill="#000"
    />
  </svg>
);

const BoltLogo = ({ className = "w-6 h-6" }: { className?: string }) => (
  <Image
    src="/logos/bolt-new.avif"
    alt="Bolt"
    width={24}
    height={24}
    className={className}
  />
);

const SourceBadge = ({ label }: { label: string }) => (
  <span className="scenario-source-icon" aria-hidden="true">
    {label}
  </span>
);

const scenarios: Scenario[] = [
  {
    id: "lovable",
    source: "via Lovable",
    sourceIcon: <LovableLogo />,
    changeDate: "Jan 28",
    sinceWindow: "14 days after change",
    changeSummary: "Pricing section rebuilt in Lovable",
    detail: {
      before: '"Most Popular" badge on Pro plan',
      after: "Badge removed, plans reordered",
    },
    impact: {
      delta: 18,
      metric: "people leaving immediately (bounce)",
      tone: "negative",
    },
    explanation:
      "≈30 fewer signups/month, mostly from mobile. Loupe linked this rebuild to the drop so you fix the right thing.",
    visual: {
      kind: "pricing",
      note: "Spike started after pricing rebuild",
    },
  },
  {
    id: "v0",
    source: "via v0",
    sourceIcon: <V0Logo />,
    changeDate: "Feb 02",
    sinceWindow: "7 days after change",
    changeSummary: "Headline rewritten in v0",
    detail: {
      before: '"Start your free trial"',
      after: '"Ship your idea today"',
    },
    impact: {
      delta: 14,
      metric: "time on page",
      tone: "positive",
    },
    explanation:
      "Time on page rose, but CTA clicks fell 9%. Loupe tied both signals to the same headline change so you can test the right thing.",
    visual: {
      kind: "headline",
      note: "Attention up, intent down",
    },
  },
  {
    id: "bolt",
    source: "via Bolt",
    sourceIcon: <BoltLogo />,
    changeDate: "Feb 07",
    sinceWindow: "30 days after change",
    changeSummary: "CTA moved below the fold in Bolt",
    detail: {
      before: "CTA visible in first screen",
      after: "CTA appears after two scrolls",
    },
    impact: {
      delta: -12,
      metric: "trial starts",
      tone: "negative",
    },
    explanation:
      "Paid traffic dropped first while organic stayed flat. Loupe connected the trial-start decline to this layout change.",
    visual: {
      kind: "cta-fold",
      note: "Decline began in paid cohorts",
    },
  },
  {
    id: "manual-cms",
    source: "via manual CMS edit",
    sourceIcon: <SourceBadge label="CMS" />,
    changeDate: "Feb 10",
    sinceWindow: "21 days after change",
    changeSummary: "Checkout button copy edited",
    detail: {
      before: '"Complete purchase"',
      after: '"Continue"',
    },
    impact: {
      delta: -11,
      metric: "checkout completions",
      tone: "negative",
    },
    explanation:
      "Returning visitors dropped faster than first-time visitors. Loupe traced fewer completions back to this forgotten edit.",
    visual: {
      kind: "checkout",
      note: "Completions declined after copy edit",
    },
  },
];

// Visual removed per ui-designer direction — the giant metric IS the visual

function useCountUp(target: number, active: boolean, duration = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || target === 0) return;

    const start = performance.now();
    let frameId: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [active, target, duration]);

  return value;
}

function ScenarioCard({
  scenario,
  isActive,
}: {
  scenario: Scenario;
  isActive: boolean;
}) {
  const count = useCountUp(Math.abs(scenario.impact.delta), isActive);
  const displayCount = isActive ? count : 0;
  const isPositive = scenario.impact.tone === "positive";
  const sign = scenario.impact.delta >= 0 ? "+" : "-";

  return (
    <div className={`scenario-card-v3 ${isActive ? "active" : ""}`}>
      {/* Row 1: Source + date (muted metadata) */}
      <p className="scenario-source-line scenario-step step-1">
        <span className="scenario-source-pill">
          {scenario.sourceIcon}
          {scenario.source}
        </span>
        <span className="scenario-source-sep">·</span>
        <span>{scenario.changeDate}</span>
      </p>

      {/* Row 2: Change summary (the hook) */}
      <h3 className="scenario-hook scenario-step step-2">
        {scenario.changeSummary}
      </h3>

      {/* Row 3: Diff block (visual anchor) */}
      <div className="scenario-diff-block scenario-step step-3">
        <p className="scenario-diff-before">{scenario.detail.before}</p>
        <span className="scenario-diff-arrow" aria-hidden="true">→</span>
        <p className="scenario-diff-after">{scenario.detail.after}</p>
      </div>

      {/* Row 4: Giant metric (hero moment) */}
      <div className={`scenario-metric-hero scenario-step step-4 ${isPositive ? "positive" : "negative"}`}>
        <p className="scenario-metric-value">
          {sign}{displayCount}% {scenario.impact.metric}
        </p>
        <p className="scenario-metric-label">{scenario.sinceWindow}</p>
      </div>

      {/* Row 5: Explanation (quiet closer) */}
      <p className="scenario-explanation scenario-step step-5">
        {scenario.explanation}
      </p>
    </div>
  );
}

export default function ScenarioShowcase() {
  const { ref, revealed } = useScrollReveal(0.2);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const activeScenario = scenarios[activeIndex];

  // Auto-rotate every 5 seconds
  useEffect(() => {
    if (isPaused || !revealed) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % scenarios.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [isPaused, revealed]);

  const handleLogoClick = useCallback((index: number) => {
    setActiveIndex(index);
    setIsPaused(true);
    // Resume auto-rotate after 10 seconds of inactivity
    setTimeout(() => setIsPaused(false), 10000);
  }, []);

  return (
    <section className="px-4 py-20 md:py-24">
      <div className="w-full max-w-5xl mx-auto">
        {/* Section header */}
        <div
          ref={ref}
          className={`text-center mb-12 scroll-reveal ${revealed ? "revealed" : ""}`}
        >
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">
            While you were building
          </p>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            This change cost you signups.
          </h2>
          <p className="text-[1.03rem] md:text-[1.12rem] text-text-secondary max-w-2xl mx-auto mt-4 leading-relaxed">
            Loupe ties every page edit to what happened next, so you know what helped,
            what hurt, and what to fix.
            Built for vibecoders shipping in Bolt, v0, and Lovable.
          </p>
        </div>

        {/* Logo bar */}
        <div
          className={`flex items-center justify-center gap-4 sm:gap-6 mb-8 scroll-reveal ${revealed ? "revealed" : ""}`}
          style={{ transitionDelay: "150ms" }}
        >
          {scenarios.map((scenario, index) => (
            <button
              key={scenario.id}
              onClick={() => handleLogoClick(index)}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              className={`scenario-logo-button ${activeIndex === index ? "active" : ""}`}
              aria-label={`View ${scenario.source} scenario`}
            >
              {scenario.sourceIcon}
              <span className="scenario-logo-label">{scenario.source.replace("via ", "")}</span>
            </button>
          ))}
        </div>

        {/* Single card - crossfade between scenarios */}
        <div
          className={`relative scroll-reveal ${revealed ? "revealed" : ""}`}
          style={{ transitionDelay: "300ms" }}
        >
          <div key={activeScenario.id} className="scenario-card-wrapper active">
            <ScenarioCard scenario={activeScenario} isActive={revealed} />
          </div>
        </div>

        {/* Compounding seed — one line, not a section */}
        <p className="text-center text-sm text-text-muted mt-10 mb-6">
          Every scan makes Loupe sharper about your site.
        </p>

        {/* Re-entry CTA */}
        <div className="text-center">
          <a
            href="#hero-form"
            className="text-sm text-accent hover:text-accent/80 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("hero-form")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            See what your page looks like through Loupe{" "}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
