"use client";

import { useState, useEffect } from "react";

/**
 * SitePreviewCard — Hero visual showing what Loupe feels like.
 *
 * Shows a fake landing page with a headline change detected by Loupe.
 * The "notification" feel comes from the floating badge that appears
 * when the change is detected.
 *
 * Three beats:
 *   1. Headline changes (old strikes through, new appears) + notification badge
 *   2. Outcome card floats in
 *   3. +23% number pulses
 */
export default function SitePreviewCard() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="site-preview-wrapper w-full max-w-[840px] relative">
      <div className="site-preview-canvas">
        <div className="site-preview-browser-strip" />

        {/* Fake landing page hero area */}
        <div className="site-preview-page-hero">
          {/* Left: copy */}
          <div className="site-preview-hero-copy">
            {/* The headlines */}
            <div className="site-preview-headlines">
              <p
                className={`site-preview-headline-old transition-all duration-700 ease-out ${
                  phase >= 1 ? "struck" : ""
                }`}
              >
                Start free trial
              </p>
              <p
                className={`site-preview-headline-new transition-all duration-700 ease-out ${
                  phase >= 1
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-2"
                }`}
              >
                Get started free
              </p>
            </div>

            {/* Subheadline placeholder */}
            <p className="site-preview-subheadline">
              Loupe tracks this change and watches the signup impact.
            </p>

            {/* CTA button placeholder */}
            <div className="site-preview-cta">Try it free</div>
          </div>
        </div>

        {/* Notification badge - floats in from top-right */}
        <div
          className={`site-preview-notif transition-all duration-500 ease-out ${
            phase >= 1
              ? "opacity-100 translate-x-0"
              : "opacity-0 translate-x-4"
          }`}
        >
          <span className="site-preview-notif-dot" />
          <span className="site-preview-notif-text">Change tracked</span>
        </div>
      </div>

      {/* Impact tile */}
      <div
        className={`site-preview-impact-tile transition-all duration-700 ease-out ${
          phase >= 2
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4"
        }`}
      >
        <p className="site-preview-metric-label">After 7 days</p>
        <p className={`site-preview-metric ${phase >= 3 ? "pulse" : ""}`}>
          +23%
        </p>
        <p className="site-preview-metric-sub">more signups</p>
      </div>
    </div>
  );
}
