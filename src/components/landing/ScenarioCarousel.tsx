"use client";

import { useState, useEffect } from "react";

/**
 * ScenarioCarousel - Auto-rotating rich cards showing what Loupe catches
 * 3 scenarios: Vibe Coder nightmare, Technical founder win, Ongoing monitoring
 *
 * Design: Single centered card with full narrative (source, title, before/after
 * detail, impact metric, one-line punchline). Tab selectors below for manual
 * navigation. No fake brand logos -- uses styled text pills for source context.
 */

interface Scenario {
  source: { label: string; color: string };
  title: string;
  detail: {
    label: string;
    before: string;
    after: string;
  };
  impact: { value: string; metric: string; positive: boolean };
  punchline: string;
  tabLabel: string;
}

const scenarios: Scenario[] = [
  {
    source: { label: "via Lovable", color: "rgba(255, 107, 107, 0.12)" },
    title: "Your AI rebuilt the pricing page",
    detail: {
      label: "What changed",
      before: '"Most Popular" badge on Pro plan',
      after: "Badge removed, plans reordered",
    },
    impact: { value: "+18%", metric: "bounce rate", positive: false },
    punchline:
      "Your AI said 'Done!' but nobody's clicking the plan you wanted them to.",
    tabLabel: "AI rebuild",
  },
  {
    source: { label: "via Vercel deploy", color: "rgba(0, 0, 0, 0.06)" },
    title: "You rewrote your headline",
    detail: {
      label: "What changed",
      before: '"Start your free trial"',
      after: '"Ship your idea today"',
    },
    impact: { value: "+23%", metric: "time on page", positive: true },
    punchline:
      "One line of copy, measurable lift. Now you know which words work.",
    tabLabel: "Deploy",
  },
  {
    source: { label: "via monitoring", color: "rgba(91, 46, 145, 0.08)" },
    title: "Your checkout flow quietly changed",
    detail: {
      label: "What changed",
      before: '"Complete purchase" button',
      after: '"Continue" button (smaller, gray)',
    },
    impact: { value: "...", metric: "tracking", positive: true },
    punchline:
      "Loupe caught it before your conversion rate did. You decide what to do.",
    tabLabel: "Monitoring",
  },
];

function MiniSparkline({ positive }: { positive: boolean }) {
  const color = positive ? "var(--score-high)" : "var(--score-low)";
  const d = positive
    ? "M0 20 Q6 20 10 17 Q14 14 18 15 Q22 16 26 12 Q30 8 34 9 Q38 10 42 5 Q46 2 48 2"
    : "M0 4 Q4 4 8 6 Q12 9 16 11 Q20 13 24 14 Q28 16 32 17 Q36 19 40 20 Q44 22 48 22";

  return (
    <svg
      viewBox="0 0 48 24"
      className="w-12 h-5"
      fill="none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient
          id={`scenario-spark-${positive}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={d + " L48 24 L0 24 Z"}
        fill={`url(#scenario-spark-${positive})`}
      />
      <path
        d={d}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function ScenarioCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const INTERVAL = 5000;
    const TICK = 50;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveIndex((i) => (i + 1) % scenarios.length);
          return 0;
        }
        return prev + (TICK / INTERVAL) * 100;
      });
    }, TICK);

    return () => clearInterval(timer);
  }, []);

  const scenario = scenarios[activeIndex];

  return (
    <section className="px-4 py-20 md:py-24">
      <div className="w-full max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">
            What Loupe Catches
          </p>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Every deploy tells a story
          </h2>
        </div>

        {/* Single centered rich card */}
        <div className="flex justify-center">
          <div
            className="glass-card-elevated w-full max-w-lg transition-all duration-300"
            key={activeIndex}
          >
            {/* Card header with source pill */}
            <div className="px-6 pt-6 pb-0">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-text-secondary"
                style={{ background: scenario.source.color }}
              >
                {scenario.source.label}
              </span>
            </div>

            {/* Title */}
            <div className="px-6 pt-4">
              <h3
                className="text-xl sm:text-[1.375rem] text-text-primary leading-snug"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                {scenario.title}
              </h3>
            </div>

            {/* Before / After detail */}
            <div className="px-6 pt-4">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2.5">
                {scenario.detail.label}
              </p>
              <div className="bg-bg-inset rounded-xl p-3.5">
                <div className="flex items-start gap-3">
                  <span className="text-sm text-text-muted line-through decoration-text-muted/30 flex-1">
                    {scenario.detail.before}
                  </span>
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    className="flex-shrink-0 text-accent mt-0.5"
                  >
                    <path
                      d="M3 8h10M9 4l4 4-4 4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-sm font-semibold text-text-primary flex-1 text-right">
                    {scenario.detail.after}
                  </span>
                </div>
              </div>
            </div>

            {/* Impact metric */}
            <div className="px-6 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-1">
                    Impact
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span
                      className={`text-2xl font-bold ${
                        scenario.impact.value === "..."
                          ? "text-text-muted"
                          : scenario.impact.positive
                            ? "text-score-high"
                            : "text-score-low"
                      }`}
                      style={{ fontFamily: "var(--font-instrument-serif)" }}
                    >
                      {scenario.impact.value}
                    </span>
                    <span className="text-sm text-text-secondary">
                      {scenario.impact.metric}
                    </span>
                  </div>
                </div>
                {scenario.impact.value !== "..." && (
                  <MiniSparkline positive={scenario.impact.positive} />
                )}
                {scenario.impact.value === "..." && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-score-mid animate-pulse" />
                    <span className="text-xs text-text-muted font-medium">
                      Collecting data
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Punchline */}
            <div className="px-6 pt-4 pb-2">
              <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
                {scenario.punchline}
              </p>
            </div>

            {/* Progress bar */}
            <div className="px-6 pb-6 pt-4">
              <div className="h-1 bg-bg-inset rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tab selectors */}
        <div className="flex justify-center gap-3 mt-6">
          {scenarios.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setActiveIndex(i);
                setProgress(0);
              }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer ${
                i === activeIndex
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-text-muted hover:text-text-secondary hover:bg-white/50 border border-transparent"
              }`}
            >
              {s.tabLabel}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
