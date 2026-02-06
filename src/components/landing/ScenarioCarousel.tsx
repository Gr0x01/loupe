"use client";

import { useState, useEffect } from "react";

/**
 * ScenarioCarousel - Auto-rotating cards showing what Loupe catches
 * 3 scenarios: Vibe Coder nightmare, Technical founder win, Ongoing monitoring
 */

const LovableIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#FF6B6B" />
    <path d="M12 7l2.5 4h-5L12 7z" fill="white" />
    <circle cx="12" cy="15" r="2" fill="white" />
  </svg>
);

const DeployIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#000" />
    <path d="M12 6l6 10H6L12 6z" fill="white" />
  </svg>
);

const WatchingIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#5B2E91" />
    <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" fill="none" />
    <circle cx="12" cy="12" r="1.5" fill="white" />
  </svg>
);

interface Scenario {
  badge: { icon: React.ReactNode; label: string };
  title: string;
  detail: string;
  impact: { value: string; label: string; positive: boolean };
  descriptor: {
    headline: string;
    body: string;
  };
}

const scenarios: Scenario[] = [
  {
    badge: { icon: <LovableIcon />, label: "Lovable" },
    title: "Your AI rebuilt the pricing page",
    detail: '"Most Popular" badge removed',
    impact: { value: "+18%", label: "bounce rate", positive: false },
    descriptor: {
      headline: "Vibe coding?",
      body: "Your AI said 'Done!' — but did conversions go up or down?",
    },
  },
  {
    badge: { icon: <DeployIcon />, label: "Deployed" },
    title: "You rewrote your headline",
    detail: '"Ship faster" → "Build better products"',
    impact: { value: "+23%", label: "time on page", positive: true },
    descriptor: {
      headline: "Deploying constantly?",
      body: "You deploy. We screenshot. You see what changed.",
    },
  },
  {
    badge: { icon: <WatchingIcon />, label: "Watching" },
    title: "Your checkout flow changed",
    detail: "Button text updated",
    impact: { value: "...", label: "watching metrics", positive: true },
    descriptor: {
      headline: "Always watching",
      body: "Get notified when changes happen — before they cost you.",
    },
  },
];

export default function ScenarioCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const INTERVAL = 4000;
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

        {/* Carousel content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left - Scenario card */}
          <div className="flex justify-center lg:justify-start">
            <div
              className="glass-card-elevated p-6 w-full max-w-sm transition-all duration-300"
              key={activeIndex}
            >
              {/* Badge */}
              <div className="flex items-center gap-2 mb-5">
                <span className="element-badge flex items-center gap-1.5">
                  {scenario.badge.icon}
                  <span>{scenario.badge.label}</span>
                </span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                {scenario.title}
              </h3>
              <p className="text-sm text-text-muted mb-5">{scenario.detail}</p>

              {/* Impact */}
              <div className="bg-bg-inset rounded-xl p-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  Impact
                </p>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold ${
                      scenario.impact.positive ? "text-score-high" : "text-score-low"
                    }`}
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    {scenario.impact.value}
                  </span>
                  <span className="text-sm text-text-secondary">
                    {scenario.impact.label}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-5 h-1 bg-bg-inset rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right - Descriptor */}
          <div className="text-center lg:text-left">
            <h3
              className="text-[clamp(1.5rem,3vw,2rem)] text-text-primary mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {scenario.descriptor.headline}
            </h3>
            <p className="text-lg text-text-secondary leading-relaxed max-w-md mx-auto lg:mx-0">
              {scenario.descriptor.body}
            </p>

            {/* Scenario dots */}
            <div className="flex gap-2 justify-center lg:justify-start mt-8">
              {scenarios.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActiveIndex(i);
                    setProgress(0);
                  }}
                  className="p-2 -m-2 cursor-pointer"
                >
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      i === activeIndex ? "bg-accent w-6" : "bg-text-muted/30 w-2"
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
