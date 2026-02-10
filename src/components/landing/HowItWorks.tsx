"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * HowItWorks — 3-step visual explanation of the Loupe loop.
 * "Paste your URL" → "We watch what changes" → "See what worked"
 * Scroll-triggered stagger reveal with connecting line.
 */

function StepIcon({ step }: { step: 1 | 2 | 3 }) {
  if (step === 1) {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="text-accent"
      >
        <rect
          x="3"
          y="5"
          width="18"
          height="14"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M3 9h18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <circle cx="6" cy="7" r="0.75" fill="currentColor" />
        <circle cx="8.5" cy="7" r="0.75" fill="currentColor" />
        <circle cx="11" cy="7" r="0.75" fill="currentColor" />
      </svg>
    );
  }
  if (step === 2) {
    return (
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        className="text-accent"
      >
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M12 7v5l3 3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      className="text-accent"
    >
      <path
        d="M2 16l5-5 3 3 5-7 5 5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17 7h5v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const steps = [
  {
    number: 1,
    title: "Paste your URL",
    description: "Loupe looks at your headline, layout, and CTA. You get specific findings, predicted impact, and a rewritten headline you can copy-paste.",
    miniVisual: "url" as const,
  },
  {
    number: 2,
    title: "Loupe watches what happens next",
    description: "You make a change. Your AI rebuilds something. A deploy goes out. Loupe tracks it and connects it to your signups. You don't have to check.",
    miniVisual: "watch" as const,
  },
  {
    number: 3,
    title: "You get answers, not dashboards",
    description: "Which changes helped. Which ones hurt. What to try next. Plain language, not charts.",
    miniVisual: "metrics" as const,
  },
];

function MiniUrlVisual() {
  return (
    <div className="bg-bg-inset rounded-lg p-3 mt-4">
      <div className="flex items-center gap-2 rounded-md bg-white/60 border border-border-subtle px-3 py-2">
        <span className="text-xs text-text-muted font-mono">
          yoursite.com
        </span>
        <div className="ml-auto w-5 h-5 rounded-md bg-accent flex items-center justify-center">
          <svg
            width="10"
            height="10"
            viewBox="0 0 16 16"
            fill="none"
            className="text-white"
          >
            <path
              d="M3 8h10M9 4l4 4-4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}

function MiniWatchVisual() {
  return (
    <div className="bg-bg-inset rounded-lg p-3 mt-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-score-high" />
          <div className="flex-1 h-2 rounded bg-white/60" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <div className="flex-1 h-2 rounded bg-accent/10" />
          <span className="text-[9px] text-accent font-semibold uppercase">
            Changed
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-score-high" />
          <div className="flex-1 h-2 rounded bg-white/60" />
        </div>
      </div>
    </div>
  );
}

function MiniMetricsVisual() {
  return (
    <div className="bg-bg-inset rounded-lg p-3 mt-4">
      <div className="flex items-center justify-between">
        <div>
          <p
            className="text-lg font-bold text-score-high"
            style={{ fontFamily: "var(--font-display)" }}
          >
            +23%
          </p>
          <p className="text-[10px] text-text-muted">signups</p>
        </div>
        <svg
          viewBox="0 0 48 24"
          className="w-16 h-6"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M0 20 Q8 20 12 17 Q16 14 20 15 Q24 16 28 12 Q32 8 36 9 Q40 10 44 5 Q48 2 48 2"
            stroke="var(--score-high)"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>
  );
}

const miniVisuals = {
  url: MiniUrlVisual,
  watch: MiniWatchVisual,
  metrics: MiniMetricsVisual,
};

export default function HowItWorks() {
  const { ref, revealed } = useScrollReveal(0.2);

  return (
    <section className="px-4 py-20 md:py-24">
      <div className="w-full max-w-5xl mx-auto">
        {/* Section header */}
        <div
          ref={ref}
          className={`text-center mb-14 scroll-reveal ${revealed ? "revealed" : ""}`}
        >
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">
            How it works
          </p>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Start with a free audit. Loupe handles the&nbsp;rest.
          </h2>
        </div>

        {/* 3-step cards with connectors */}
        <div className="relative">
          {/* Connecting line (desktop only) */}
          <svg
            className="hidden lg:block absolute top-[72px] left-0 w-full h-[2px] pointer-events-none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <line
              x1="16.5%"
              y1="1"
              x2="83.5%"
              y2="1"
              stroke="var(--accent)"
              strokeWidth="1"
              strokeDasharray="6 4"
              strokeOpacity="0.25"
              className={`how-connector-line ${revealed ? "drawing" : ""}`}
            />
          </svg>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {steps.map((step, i) => {
              const MiniVisual = miniVisuals[step.miniVisual];
              return (
                <div
                  key={step.number}
                  className={`scroll-reveal ${revealed ? "revealed" : ""}`}
                  style={{
                    transitionDelay: revealed ? `${i * 150}ms` : "0ms",
                  }}
                >
                  <div className="how-step-card p-6 h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="how-step-number">{step.number}</div>
                      <StepIcon step={step.number as 1 | 2 | 3} />
                    </div>
                    <h3 className="text-lg font-semibold text-text-primary mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-text-secondary leading-relaxed">
                      {step.description}
                    </p>
                    <MiniVisual />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
