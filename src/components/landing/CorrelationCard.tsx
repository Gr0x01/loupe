"use client";

import { useState, useEffect } from "react";

/**
 * HeroVisual (replaces CorrelationCard v2)
 *
 * Shows a simplified website mockup with animated Loupe notification toasts.
 * Communicates the value prop in a single glance:
 * "Loupe watches your site and tells you what changed and whether it helped."
 *
 * Animation sequence (after initial delay):
 *   0.8s  — "Watching" badge fades in
 *   1.2s  — Headline bars briefly highlight (scan moment)
 *   1.8s  — Notification #1 slides up: "Headline changed"
 *   3.2s  — Notification #2 slides up: "Signups +23%"
 *   4.2s  — Rest state, watching dot pulses
 */

export default function CorrelationCard() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    // Delay start to let hero text stagger in first
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(setTimeout(() => setPhase(1), 800));   // Watching badge
    timers.push(setTimeout(() => setPhase(2), 1200));  // Headline highlight
    timers.push(setTimeout(() => setPhase(3), 1800));  // Notification 1
    timers.push(setTimeout(() => setPhase(4), 3200));  // Notification 2
    timers.push(setTimeout(() => setPhase(5), 4200));  // Rest

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="hero-visual w-full max-w-[440px]">
      {/* Browser chrome */}
      <div className="hero-visual-chrome">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-[rgba(0,0,0,0.03)] rounded-md px-3 py-1 text-[11px] text-text-muted font-mono truncate text-center">
            yoursite.com
          </div>
        </div>
        {/* Empty right side for balance */}
        <div className="w-16" />
      </div>

      {/* Mockup body — relative for positioned notifications */}
      <div className="hero-visual-body relative overflow-hidden">
        {/* Watching badge — top right */}
        <div
          className={`absolute top-3 right-3 z-10 flex items-center gap-1.5
            bg-[rgba(255,255,255,0.8)] backdrop-blur-[12px]
            border border-[rgba(0,0,0,0.06)] rounded-full
            py-1 px-2.5 transition-opacity duration-300
            ${phase >= 1 ? "opacity-100" : "opacity-0"}`}
        >
          <span
            className={`relative flex h-1.5 w-1.5 ${
              phase >= 5 ? "" : ""
            }`}
          >
            {phase >= 5 && (
              <span className="absolute inline-flex h-full w-full rounded-full bg-score-high opacity-40 animate-ping" />
            )}
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-score-high" />
          </span>
          <span className="text-[10px] font-medium text-text-muted">
            Watching
          </span>
        </div>

        {/* Website mockup content — abstract placeholder bars */}
        <div className="pt-10 pb-6 px-5">
          {/* Nav placeholder */}
          <div className="flex items-center justify-between mb-8">
            <div className="h-2 w-16 rounded-full bg-[rgba(0,0,0,0.07)]" />
            <div className="flex gap-3">
              <div className="h-1.5 w-10 rounded-full bg-[rgba(0,0,0,0.04)]" />
              <div className="h-1.5 w-10 rounded-full bg-[rgba(0,0,0,0.04)]" />
              <div className="h-1.5 w-8 rounded-full bg-[rgba(0,0,0,0.04)]" />
            </div>
          </div>

          {/* Hero headline placeholder — these highlight during scan */}
          <div className="space-y-2 mb-3">
            <div
              className={`h-3 w-[75%] rounded-full transition-colors duration-600 ${
                phase === 2
                  ? "hero-mockup-highlight-bar"
                  : "bg-[rgba(0,0,0,0.08)]"
              }`}
            />
            <div
              className={`h-3 w-[55%] rounded-full transition-colors duration-600 ${
                phase === 2
                  ? "hero-mockup-highlight-bar"
                  : "bg-[rgba(0,0,0,0.08)]"
              }`}
            />
          </div>

          {/* Subhead placeholder */}
          <div className="h-2 w-[65%] rounded-full bg-[rgba(0,0,0,0.04)] mb-4" />

          {/* CTA button placeholder */}
          <div className="h-7 w-24 rounded-lg bg-accent/10 border border-accent/15 mb-7" />

          {/* Body text placeholder */}
          <div className="space-y-2 mb-6">
            <div className="h-1.5 w-[90%] rounded-full bg-[rgba(0,0,0,0.04)]" />
            <div className="h-1.5 w-[80%] rounded-full bg-[rgba(0,0,0,0.04)]" />
            <div className="h-1.5 w-[70%] rounded-full bg-[rgba(0,0,0,0.04)]" />
          </div>

          {/* Section 2 hint */}
          <div className="pt-5 border-t border-[rgba(0,0,0,0.04)]">
            <div className="h-2.5 w-[60%] rounded-full bg-[rgba(0,0,0,0.06)] mb-3" />
            <div className="space-y-2">
              <div className="h-1.5 w-[85%] rounded-full bg-[rgba(0,0,0,0.03)]" />
              <div className="h-1.5 w-[75%] rounded-full bg-[rgba(0,0,0,0.03)]" />
            </div>
          </div>
        </div>

        {/* Notification toasts — positioned bottom-right, stacked */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-20">
          {/* Notification #2 — Impact (appears second, stacks on top) */}
          <div
            className={`hero-notif hero-notif-impact ${
              phase >= 4 ? "hero-notif-visible" : ""
            }`}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-score-high flex-shrink-0" />
              <span className="text-[12px] text-text-secondary font-medium">
                Signups
              </span>
              <span
                className="text-[14px] font-bold text-score-high"
                style={{ fontFamily: "var(--font-display)" }}
              >
                +23%
              </span>
            </div>
            <p className="text-[10px] text-text-muted mt-0.5 ml-3.5">
              since this change
            </p>
          </div>

          {/* Notification #1 — Change detected (appears first, below) */}
          <div
            className={`hero-notif hero-notif-change ${
              phase >= 3 ? "hero-notif-visible" : ""
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
              <span className="text-[10px] font-semibold text-accent uppercase tracking-wide">
                Headline changed
              </span>
              <span className="text-[10px] text-text-muted ml-auto">
                2h ago
              </span>
            </div>
            <div className="flex items-center gap-2 ml-3.5">
              <span className="text-[11px] text-text-muted line-through decoration-text-muted/30 truncate">
                Start your free trial
              </span>
              <svg
                width="12"
                height="12"
                viewBox="0 0 16 16"
                fill="none"
                className="flex-shrink-0 text-accent"
              >
                <path
                  d="M3 8h10M9 4l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="text-[11px] font-medium text-text-primary truncate">
                Ship your idea today
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
