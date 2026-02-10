"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useEffect, useRef, useState } from "react";

/**
 * HowItWorks V2 — Flow narrative:
 * One action (paste URL) cascades into two automatic benefits.
 * Action card is visually elevated. Benefits slide in from sides.
 * Typing animation on URL input. Count-up on verdict.
 */

// Counter animation hook
function useCountUp(target: number, duration = 800) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const start = performance.now();
          const animate = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setCount(Math.round(target * eased));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration, hasAnimated]);

  return { count, ref };
}

// Typing animation hook
function useTypingAnimation(text: string, speed = 80, startDelay = 600) {
  const [displayed, setDisplayed] = useState("");
  const [hasStarted, setHasStarted] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  const start = () => {
    if (hasStarted) return;
    setHasStarted(true);
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          setTimeout(() => setShowCursor(false), 1200);
        }
      }, speed);
    }, startDelay);
    return () => clearTimeout(timeout);
  };

  return { displayed, showCursor, start, hasStarted };
}

// Mini visual: URL input with typing animation — full width, prominent
function UrlInputVisual({ revealed }: { revealed: boolean }) {
  const typing = useTypingAnimation("acme.com/pricing", 70, 400);

  useEffect(() => {
    if (revealed && !typing.hasStarted) {
      typing.start();
    }
  }, [revealed]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="how-visual-url mt-5">
      {/* Browser-like address bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex gap-1.5">
          <div className="w-[7px] h-[7px] rounded-full bg-black/[0.07]" />
          <div className="w-[7px] h-[7px] rounded-full bg-black/[0.07]" />
          <div className="w-[7px] h-[7px] rounded-full bg-black/[0.07]" />
        </div>
      </div>
      <div className="flex items-center gap-2.5">
        <div className="flex-1 flex items-center gap-2 bg-bg-inset/80 rounded-[10px] px-4 py-3 border border-border-subtle/50">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-text-muted/60 shrink-0">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M20 20l-3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span className="text-[14px] text-text-primary font-mono tracking-tight">
            {typing.displayed}
            {typing.showCursor && (
              <span className="inline-block w-[1.5px] h-[15px] bg-accent ml-[1px] align-middle animate-[cursorBlink_1s_step-end_infinite]" />
            )}
          </span>
        </div>
        <button className="shrink-0 w-9 h-9 rounded-[10px] bg-accent text-white flex items-center justify-center shadow-sm hover:bg-accent-hover transition-colors">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// Mini visual: Change diff — timeline with before/after
function ChangeDiffVisual() {
  return (
    <div className="how-visual-diff-container">
      <div className="relative pl-5">
        {/* Timeline line */}
        <div className="absolute left-[7px] top-1.5 bottom-1.5 w-[1.5px] bg-gradient-to-b from-text-muted/20 via-accent/40 to-accent/20" />

        {/* Before */}
        <div className="relative mb-4">
          <div className="absolute left-[-14px] top-[7px] w-[8px] h-[8px] rounded-full bg-text-muted/25 ring-2 ring-white/80" />
          <p className="text-[11px] text-text-muted mb-1 font-medium">Jan 15</p>
          <p className="text-[14px] text-text-secondary/60 line-through decoration-text-muted/30 leading-snug">
            &ldquo;Welcome to our platform&rdquo;
          </p>
        </div>

        {/* After */}
        <div className="relative">
          <div className="absolute left-[-14px] top-[7px] w-[8px] h-[8px] rounded-full bg-accent ring-2 ring-white/80 shadow-[0_0_8px_rgba(91,46,145,0.3)]" />
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[11px] text-accent font-semibold">Jan 22</p>
            <span className="px-1.5 py-[1px] rounded-md bg-accent/10 text-[9px] font-bold text-accent uppercase tracking-wider">
              Changed
            </span>
          </div>
          <p className="text-[14px] text-text-primary font-medium leading-snug">
            &ldquo;Ship faster without breaking&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}

// Mini visual: Verdict with animated counter
function VerdictVisual({ revealed }: { revealed: boolean }) {
  const { count, ref } = useCountUp(23);

  return (
    <div ref={ref} className="how-visual-verdict-container">
      <p className="text-[13px] text-text-secondary mb-3">
        <span className="text-text-muted">Your headline change</span>
        {" → "}
        <span className="text-score-high font-medium">helped</span>
      </p>
      <div className="flex items-end justify-between">
        <div>
          <p
            className="text-[32px] font-bold text-score-high leading-none"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            +{count}%
          </p>
          <p className="text-[12px] text-text-muted mt-1">more signups</p>
        </div>
        {/* Mini sparkline */}
        <svg viewBox="0 0 56 28" className="w-[80px] h-[40px] -mb-1" fill="none">
          <path
            d="M2 24 Q10 22 16 18 Q22 14 28 15 Q34 16 40 10 Q46 4 54 2"
            stroke="var(--score-high)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            opacity="0.2"
          />
          <path
            d="M2 24 Q10 22 16 18 Q22 14 28 15 Q34 16 40 10 Q46 4 54 2"
            stroke="var(--score-high)"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            className={revealed ? "how-sparkline-draw" : ""}
            style={{ strokeDasharray: 120, strokeDashoffset: revealed ? 0 : 120 }}
          />
        </svg>
      </div>
    </div>
  );
}

// Flow connector — animated branching line from action to benefits
function FlowConnector({ revealed }: { revealed: boolean }) {
  return (
    <div className="hidden md:flex justify-center py-3 -my-1 relative z-10">
      <svg width="200" height="52" viewBox="0 0 200 52" fill="none" className="overflow-visible">
        {/* Left branch */}
        <path
          d="M100 0 C100 22, 40 22, 40 52"
          stroke="url(#flow-gradient)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: revealed ? 0 : 100,
            transition: "stroke-dashoffset 0.8s ease-out 0.8s",
          }}
        />
        {/* Right branch */}
        <path
          d="M100 0 C100 22, 160 22, 160 52"
          stroke="url(#flow-gradient)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          style={{
            strokeDasharray: 100,
            strokeDashoffset: revealed ? 0 : 100,
            transition: "stroke-dashoffset 0.8s ease-out 1s",
          }}
        />
        {/* Center dot */}
        <circle
          cx="100"
          cy="0"
          r="3.5"
          fill="var(--accent)"
          className={revealed ? "opacity-100" : "opacity-0"}
          style={{ transition: "opacity 0.3s ease-out 0.7s" }}
        />
        <defs>
          <linearGradient id="flow-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.5" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.12" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function HowItWorksV2() {
  const { ref, revealed } = useScrollReveal(0.12);

  return (
    <section className="px-4 py-20 md:py-28">
      <div className="w-full max-w-4xl mx-auto">
        {/* Section header — editorial accent line + heading */}
        <div
          ref={ref}
          className={`text-center mb-16 scroll-reveal ${revealed ? "revealed" : ""}`}
        >
          <div className="flex justify-center mb-5">
            <div className="w-8 h-[2px] rounded-full bg-accent/40" />
          </div>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Start with a free audit. Loupe handles the rest.
          </h2>
          <p className="text-[1.03rem] md:text-[1.12rem] text-text-secondary max-w-2xl mx-auto mt-4 leading-relaxed">
            Paste your URL once. Loupe tracks every change and tells you what
            helped, what hurt, and what to test next.
          </p>
        </div>

        {/* THE ACTION — elevated, violet-bordered protagonist card */}
        <div
          className={`scroll-reveal ${revealed ? "revealed" : ""}`}
          style={{ transitionDelay: revealed ? "150ms" : "0ms" }}
        >
          <div className="how-action-card p-6 md:p-8">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <p className="text-[11px] text-accent font-semibold uppercase tracking-widest mb-2">
                  The only thing you do
                </p>
                <h3
                  className="text-xl md:text-2xl text-text-primary mb-2"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  Step 1: Paste your URL
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  Loupe reads your headline, layout, and CTA. You get specific
                  findings, predicted impact, and what to fix first.
                </p>
                <div className="how-proof-chips mt-4">
                  <span className="how-proof-chip">Specific findings</span>
                  <span className="how-proof-chip">Predicted impact</span>
                  <span className="how-proof-chip">Headline rewrite</span>
                </div>
              </div>
              <div className="md:w-[320px] shrink-0">
                <UrlInputVisual revealed={revealed} />
              </div>
            </div>
          </div>
        </div>

        {/* Flow connector */}
        <FlowConnector revealed={revealed} />

        {/* Mobile connector — pulsing chevron */}
        <div className="md:hidden flex justify-center py-4">
          <div
            className={`flex flex-col items-center gap-2 scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "600ms" }}
          >
            <div className="w-[1.5px] h-5 bg-gradient-to-b from-accent/30 to-accent/10" />
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-accent/40 how-chevron-pulse"
            >
              <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <div className="w-[1.5px] h-3 bg-gradient-to-b from-accent/10 to-transparent" />
          </div>
        </div>

        {/* THE BENEFITS — two cards, slide in from sides */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Benefit 1: Tracking */}
          <div
            className={`how-benefit-slide-left scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: revealed ? "500ms" : "0ms" }}
          >
            <div className="how-benefit-card p-5 md:p-6 h-full">
              <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="how-step-number-subtle">2</span>
                Step 2 — Loupe watches
              </p>
              <h3 className="text-base md:text-lg font-semibold text-text-primary mb-1.5">
                Loupe watches what happens next
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                When your page changes, by you or your AI, Loupe catches it and
                connects it to your signups.
              </p>
              <ChangeDiffVisual />
            </div>
          </div>

          {/* Benefit 2: Answers */}
          <div
            className={`how-benefit-slide-right scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: revealed ? "650ms" : "0ms" }}
          >
            <div className="how-benefit-card p-5 md:p-6 h-full">
              <p className="text-[10px] text-text-muted font-medium uppercase tracking-widest mb-2 flex items-center gap-2">
                <span className="how-step-number-subtle">3</span>
                Step 3 — You get the verdict
              </p>
              <h3 className="text-base md:text-lg font-semibold text-text-primary mb-1.5">
                You get answers, not dashboards
              </h3>
              <p className="text-sm text-text-secondary leading-relaxed mb-5">
                Which changes helped. Which ones hurt. What to try next. Plain language.
              </p>
              <VerdictVisual revealed={revealed} />
            </div>
          </div>
        </div>

        {/* Re-entry CTA */}
        <div
          className={`how-reentry-cta scroll-reveal ${revealed ? "revealed" : ""}`}
          style={{ transitionDelay: revealed ? "760ms" : "0ms" }}
        >
          <p className="text-text-secondary">
            See what your page looks like through Loupe.
          </p>
          <a
            href="#hero-form"
            className="how-reentry-link"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("hero-form")
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            Run free audit →
          </a>
        </div>
      </div>
    </section>
  );
}
