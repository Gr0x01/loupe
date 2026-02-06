"use client";

import { useState, useEffect } from "react";

/**
 * CorrelationCard - Hero "money shot" showing page change -> metric impact
 * Designed as the visual centerpiece of the landing page hero.
 * Shows a mini browser chrome with a before/after change, then the metric correlation.
 */

function MiniSparkline({ positive }: { positive: boolean }) {
  const color = positive ? "var(--score-high)" : "var(--score-low)";
  const d = positive
    ? "M0 24 Q8 24 12 20 Q16 16 20 18 Q24 20 28 14 Q32 8 36 10 Q40 12 44 4 Q48 0 48 0"
    : "M0 4 Q4 4 8 6 Q12 8 16 10 Q20 12 24 14 Q28 16 32 18 Q36 20 40 22 Q44 24 48 24";

  return (
    <svg
      viewBox="0 0 48 28"
      className="w-full h-7"
      fill="none"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`spark-${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={d + " L48 28 L0 28 Z"} fill={`url(#spark-${positive})`} />
      <path d={d} stroke={color} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export default function CorrelationCard() {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), 1800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="correlation-card-hero w-full max-w-[420px]">
      {/* Browser chrome */}
      <div className="correlation-card-chrome">
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
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-score-high" />
          <span className="text-[10px] text-text-muted font-medium">Watching</span>
        </div>
      </div>

      {/* Card body */}
      <div className="correlation-card-body">
        {/* The change detection */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-accent/10 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M2 8h12M8 2v12" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-accent uppercase tracking-wide">
              Change detected
            </span>
            <span className="text-[10px] text-text-muted ml-auto">Jan 28</span>
          </div>

          <div className="bg-bg-inset rounded-xl p-4">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wide mb-2">
              Hero headline
            </p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-text-muted line-through decoration-text-muted/30">
                &ldquo;Start your free trial&rdquo;
              </span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0 text-accent">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm font-semibold text-text-primary">
                &ldquo;Ship your idea today&rdquo;
              </span>
            </div>
          </div>
        </div>

        {/* Metric impact - the punchline */}
        <div
          className={`transition-all duration-700 ${
            revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-5 h-5 rounded-md bg-score-high/10 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path d="M2 14L6 8l3 4 5-10" stroke="var(--score-high)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-score-high uppercase tracking-wide">
              Since this change
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Bounce rate */}
            <div className="bg-bg-inset rounded-xl p-4">
              <MiniSparkline positive={true} />
              <p
                className="text-2xl font-bold text-score-high mt-2"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                -12%
              </p>
              <p className="text-xs text-text-secondary mt-0.5">bounce rate</p>
            </div>

            {/* Signups */}
            <div className="bg-bg-inset rounded-xl p-4">
              <MiniSparkline positive={true} />
              <p
                className="text-2xl font-bold text-score-high mt-2"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                +23%
              </p>
              <p className="text-xs text-text-secondary mt-0.5">signups</p>
            </div>
          </div>
        </div>

        {/* Bottom attribution */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-accent/20 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-accent" />
            </div>
            <span className="text-[10px] text-text-muted font-medium">Loupe</span>
          </div>
          <span className="text-[10px] text-text-muted">7 day correlation window</span>
        </div>
      </div>
    </div>
  );
}
