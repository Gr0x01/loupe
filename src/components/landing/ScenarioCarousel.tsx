"use client";

import { useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * ScenarioCards — Static evidence cards showing what Loupe catches.
 * Replaces the auto-rotating carousel with scroll-revealed cards
 * that each animate independently. Metrics count up on viewport entry.
 */

interface Scenario {
  source: { label: string; color: string };
  title: string;
  detail: {
    label: string;
    before: string;
    after: string;
  };
  impact: { value: string; number: number; metric: string; positive: boolean };
  punchline: string;
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
    impact: {
      value: "+18%",
      number: 18,
      metric: "people leaving immediately",
      positive: false,
    },
    punchline:
      "Your AI said \"Done.\" Eighteen percent more visitors left. Loupe flagged it the same day so you could fix it before it cost you a week of signups.",
  },
  {
    source: { label: "via Vercel", color: "rgba(0, 0, 0, 0.06)" },
    title: "You rewrote your headline",
    detail: {
      label: "What changed",
      before: '"Start your free trial"',
      after: '"Ship your idea today"',
    },
    impact: {
      value: "+23%",
      number: 23,
      metric: "people signing up",
      positive: true,
    },
    punchline:
      "One line of copy. Measurable lift. Without Loupe, you might have changed it again next week.",
  },
  {
    source: { label: "caught by Loupe", color: "rgba(91, 46, 145, 0.08)" },
    title: "Your checkout flow quietly changed",
    detail: {
      label: "What changed",
      before: '"Complete purchase" button',
      after: '"Continue" button (smaller, gray)',
    },
    impact: {
      value: "...",
      number: 0,
      metric: "collecting data",
      positive: true,
    },
    punchline:
      "Nobody pushed this change. Loupe caught it before your revenue dipped.",
  },
];

function AnimatedSparkline({
  positive,
  drawing,
}: {
  positive: boolean;
  drawing: boolean;
}) {
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
      <path
        d={d}
        stroke={color}
        strokeWidth="1.5"
        fill="none"
        strokeLinecap="round"
        className={`spark-draw ${drawing ? "drawing" : ""}`}
      />
    </svg>
  );
}

function useCountUp(target: number, active: boolean, duration = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || target === 0) {
      setValue(0);
      return;
    }

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
  index,
}: {
  scenario: Scenario;
  index: number;
}) {
  const { ref, revealed } = useScrollReveal(0.3);
  const count = useCountUp(scenario.impact.number, revealed);

  const isTracking = scenario.impact.value === "...";

  return (
    <div
      ref={ref}
      className={`scroll-reveal ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: revealed ? `${index * 100}ms` : "0ms" }}
    >
      <div className="scenario-evidence-card p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          {/* Left: narrative */}
          <div className="flex-1 min-w-0">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-text-secondary mb-3"
              style={{ background: scenario.source.color }}
            >
              {scenario.source.label}
            </span>

            <h3
              className="text-lg sm:text-xl text-text-primary leading-snug mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {scenario.title}
            </h3>

            {/* Before / After */}
            <div className="bg-bg-inset rounded-xl p-3.5 mb-4">
              <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">
                {scenario.detail.label}
              </p>
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

            <p className="text-sm text-text-secondary leading-relaxed">
              {scenario.punchline}
            </p>
          </div>

          {/* Right: metric */}
          <div className="sm:w-[160px] flex-shrink-0 flex sm:flex-col items-center sm:items-end gap-3 sm:gap-1 sm:text-right sm:pt-8">
            {!isTracking ? (
              <>
                <span
                  className={`text-3xl font-bold ${
                    scenario.impact.positive
                      ? "text-score-high"
                      : "text-score-low"
                  }`}
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  +{count}%
                </span>
                <span className="text-xs text-text-secondary">
                  {scenario.impact.metric}
                </span>
                <AnimatedSparkline
                  positive={scenario.impact.positive}
                  drawing={revealed}
                />
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-score-mid animate-pulse" />
                  <span className="text-xs text-text-muted font-medium">
                    Collecting data
                  </span>
                </div>
                <span className="text-xs text-text-secondary">
                  Loupe is watching
                </span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ScenarioCarousel() {
  return (
    <section className="px-4 py-20 md:py-24">
      <div className="w-full max-w-3xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">
            While you were building
          </p>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Here&apos;s what Loupe caught this&nbsp;week.
          </h2>
        </div>

        {/* Stacked evidence cards */}
        <div className="space-y-6">
          {scenarios.map((scenario, i) => (
            <ScenarioCard key={i} scenario={scenario} index={i} />
          ))}
        </div>

        {/* Re-entry CTA */}
        <div className="text-center mt-10">
          <a
            href="#hero-form"
            className="text-sm text-accent hover:text-accent/80 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("hero-form")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            See what your page looks like through Loupe <span aria-hidden="true">→</span>
          </a>
        </div>

        {/* Integration logos */}
        <div className="mt-16 text-center">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-6">
            Works with the tools you use
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap opacity-50">
            {/* Lovable */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
            {/* Bolt */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
            {/* Vercel */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
              <path d="M12 2L2 19.5h20L12 2z"/>
            </svg>
            {/* GitHub */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            {/* PostHog */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
              <circle cx="12" cy="12" r="10"/>
            </svg>
            {/* Supabase */}
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-text-secondary">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
