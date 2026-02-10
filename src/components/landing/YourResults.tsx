"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * YourResults — Section 3: "Your changes. Your answers."
 * Feature-style grid showing timeline, verdicts, and compounding history.
 */

// Logos (reused from ScenarioShowcase)
const LovableLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M151.083 0c83.413 0 151.061 67.819 151.061 151.467v57.6h50.283c83.413 0 151.082 67.797 151.082 151.466 0 83.691-67.626 151.467-151.082 151.467H0V151.467C0 67.84 67.627 0 151.083 0z"
      fill="currentColor"
      opacity="0.4"
    />
  </svg>
);

const V0Logo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" fill="currentColor" opacity="0.4">
    <path d="M304.043 176h119.979c1.877 0 3.754.128 5.546.384L304.341 301.611a38.55 38.55 0 01-.405-5.654V176h-48V295.98c0 48.256 39.723 87.979 87.979 87.979h120v-48H343.936c-1.92 0-3.818-.128-5.653-.384L463.595 210.24a40.03 40.03 0 01.427 5.76v119.958H512v-119.98C512 167.724 472.278 128 424.022 128h-119.98v48zM0 160v.128l163.968 208.81c19.712 25.089 60.01 11.158 60.01-20.756V160H176v146.56L60.928 160H0z" />
  </svg>
);

const BoltLogo = ({ className = "w-5 h-5" }: { className?: string }) => (
  <Image
    src="/logos/bolt-new.avif"
    alt="Bolt"
    width={20}
    height={20}
    className={`${className} opacity-40`}
  />
);

// History card component - shows honest metrics about accumulated data
function HistoryCard({
  revealed,
  delay = 0,
}: {
  revealed: boolean;
  delay?: number;
}) {
  const scans = useCountUp(12, revealed, 1000);
  const weeks = useCountUp(8, revealed, 1200);

  return (
    <div
      className={`glass-card p-6 md:p-8 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Main stat */}
      <div className="text-center mb-6">
        <span
          className="text-5xl font-bold text-text-primary"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          {weeks}
        </span>
        <span className="text-2xl text-text-secondary ml-1">weeks</span>
        <p className="text-sm text-text-muted mt-1">of history tracked</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="text-center p-3 rounded-xl bg-bg-inset">
          <p
            className="text-xl font-semibold text-text-primary"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {scans}
          </p>
          <p className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            scans
          </p>
        </div>
        <div className="text-center p-3 rounded-xl bg-bg-inset">
          <p
            className="text-xl font-semibold text-text-primary"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            5
          </p>
          <p className="text-[10px] text-text-muted uppercase tracking-wide mt-0.5">
            changes
          </p>
        </div>
        <div className="text-center p-3 rounded-xl bg-violet/5 border-2 border-violet/30">
          <p
            className="text-xl font-semibold text-violet"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            3
          </p>
          <p className="text-[10px] text-violet/70 uppercase tracking-wide mt-0.5">
            verdicts
          </p>
        </div>
      </div>

      {/* Timeline hint */}
      <div className="flex items-center gap-3 text-[10px] text-text-muted uppercase tracking-widest">
        <span>Jan 15</span>
        <div className="flex-1 h-px bg-gradient-to-r from-line/30 via-violet/30 to-line/30" />
        <span>Today</span>
      </div>
    </div>
  );
}

function MetricsCard({
  revealed,
  delay = 0,
}: {
  revealed: boolean;
  delay?: number;
}) {
  return (
    <div
      className={`glass-card p-5 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        <span>Today</span>
        <span className="text-blue">Plain language</span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-xl bg-bg-inset px-3 py-2">
          <div>
            <p className="text-[12px] font-semibold text-text-primary">
              Signups
            </p>
            <p className="text-[10px] text-text-muted">
              People starting a trial
            </p>
          </div>
          <span className="text-sm font-semibold text-score-high">+23%</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-bg-inset px-3 py-2">
          <div>
            <p className="text-[12px] font-semibold text-text-primary">
              People leaving
            </p>
            <p className="text-[10px] text-text-muted">
              (Bounce rate)
            </p>
          </div>
          <span className="text-sm font-semibold text-score-high">-8%</span>
        </div>
        <div className="flex items-center justify-between rounded-xl bg-bg-inset px-3 py-2">
          <div>
            <p className="text-[12px] font-semibold text-text-primary">
              Button clicks
            </p>
            <p className="text-[10px] text-text-muted">
              Visitors taking action
            </p>
          </div>
          <span className="text-sm font-semibold text-score-high">+14%</span>
        </div>
      </div>
      <p className="text-[11px] text-text-muted mt-3">
        No dashboards. Just outcomes you can act on.
      </p>
    </div>
  );
}

// Count-up animation hook
function useCountUp(target: number, active: boolean, duration = 800) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || target === 0) return;

    const absTarget = Math.abs(target);
    const start = performance.now();
    let frameId: number;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * absTarget));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      }
    }

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [active, target, duration]);

  return value;
}

interface TimelineEvent {
  date: string;
  label: string;
  type: "change" | "quiet";
}

const timelineEvents: TimelineEvent[] = [
  { date: "Jan 15", label: "Page stable", type: "quiet" },
  { date: "Jan 28", label: "Headline rewritten", type: "change" },
  { date: "Feb 3", label: "Pricing section rebuilt", type: "change" },
  { date: "Feb 12", label: "Page stable", type: "quiet" },
];

function ChangeTimeline({
  events,
  revealed,
}: {
  events: TimelineEvent[];
  revealed: boolean;
}) {
  return (
    <div className="relative pl-6">
      {/* Timeline line */}
      <div className="absolute left-[7px] top-2 bottom-2 w-[2px] bg-gradient-to-b from-line/30 via-violet/40 to-line/30" />

      {/* Events */}
      <div className="space-y-6">
        {events.map((event, index) => (
          <div
            key={index}
            className={`relative scroll-reveal-child ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: `${200 + index * 100}ms` }}
          >
            {/* Dot */}
            <div
              className={`absolute left-[-19px] top-[5px] w-[10px] h-[10px] rounded-full border-2 ${
                event.type === "change"
                  ? "bg-violet border-violet-hover"
                  : "bg-paper-100 border-line"
              }`}
            />

            {/* Content */}
            <div>
              <p className="text-[11px] font-medium text-text-muted mb-0.5">
                {event.date}
              </p>
              <p
                className={`text-[13px] leading-snug ${
                  event.type === "change"
                    ? "text-text-primary font-medium"
                    : "text-text-secondary"
                }`}
              >
                {event.label}
              </p>
              {event.type === "change" && (
                <span className="inline-block mt-1 px-1.5 py-0.5 rounded-md border border-violet/30 bg-violet/10 text-[9px] font-bold text-violet uppercase tracking-wider">
                  Changed
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function VerdictCard({
  change,
  outcome,
  delta,
  metric,
  date,
  suggestion,
  tone,
  revealed,
  delay = 0,
}: {
  change: string;
  outcome: string;
  delta: number;
  metric: string;
  date: string;
  suggestion?: string;
  tone: "positive" | "negative";
  revealed: boolean;
  delay?: number;
}) {
  const count = useCountUp(Math.abs(delta), revealed);
  const isPositive = tone === "positive";
  const sign = delta >= 0 ? "+" : "-";
  const color = isPositive ? "text-score-high" : "text-score-low";
  const bgColor = isPositive ? "bg-score-high/5" : "bg-score-low/5";
  const borderColor = isPositive ? "border-score-high/20" : "border-score-low/20";

  return (
    <div
      className={`glass-card p-5 border ${borderColor} ${bgColor} scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Verdict line */}
      <p className="text-[13px] text-text-secondary mb-3">
        {change}{" "}
        <span className={`font-medium ${color}`}>{outcome}</span>
      </p>

      {/* Metric */}
      <div className="flex items-end justify-between">
        <div>
          <p
            className={`text-[2.5rem] font-bold leading-none ${color}`}
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {sign}{count}%
          </p>
          <p className="text-[12px] text-text-muted mt-1">
            {metric} since {date}
          </p>
        </div>

        {/* Mini sparkline */}
        <svg viewBox="0 0 56 28" className="w-[70px] h-[35px] -mb-1" fill="none">
          {isPositive ? (
            <path
              d="M2 24 Q10 22 16 18 Q22 14 28 15 Q34 16 40 10 Q46 4 54 2"
              stroke="var(--score-high)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />
          ) : (
            <path
              d="M2 4 Q10 6 16 10 Q22 14 28 13 Q34 12 40 18 Q46 24 54 26"
              stroke="var(--score-low)"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              opacity="0.5"
            />
          )}
        </svg>
      </div>

      {/* Suggestion for negative verdicts */}
      {suggestion && (
        <p className="text-[12px] text-text-secondary mt-3 pt-3 border-t border-border-subtle">
          {suggestion}
        </p>
      )}
    </div>
  );
}

export default function YourResults() {
  const { ref, revealed } = useScrollReveal(0.15);

  return (
    <section className="px-4 py-20 md:py-28 bg-bg-secondary">
      <div className="w-full max-w-5xl mx-auto">
        {/* Section header */}
        <div
          ref={ref}
          className={`text-center mb-12 scroll-reveal ${revealed ? "revealed" : ""}`}
        >
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-violet bg-violet/5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet">
              Your results
            </span>
          </div>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Your changes. Your answers.
          </h2>
          <p className="text-[1.05rem] md:text-[1.12rem] text-text-secondary max-w-2xl mx-auto mt-4 leading-relaxed">
            You make a change. Loupe watches what happens next and tells you if it helped.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 gap-8 md:gap-10">
          {/* Feature 1: Timeline */}
          <div
            className={`scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "150ms" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Timeline
            </p>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Every change, captured
            </h3>
            <p className="text-text-secondary leading-relaxed">
              AI rebuilds, CMS edits, and deploy tweaks show up in your timeline —
              without you checking.
            </p>
            <div className="glass-card p-5 mt-5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-4">
                Your page timeline
              </p>
              <ChangeTimeline events={timelineEvents} revealed={revealed} />
            </div>
          </div>

          {/* Feature 2: Verdicts */}
          <div
            className={`scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "300ms" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Verdicts
            </p>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Results tied to each change
            </h3>
            <p className="text-text-secondary leading-relaxed">
              When signups move, Loupe looks back and calls it: this helped,
              this didn&apos;t.
            </p>
            <div className="space-y-4 mt-5">
              <VerdictCard
                change="Your headline change"
                outcome="helped"
                delta={23}
                metric="more signups"
                date="Jan 28"
                tone="positive"
                revealed={revealed}
                delay={350}
              />
              <VerdictCard
                change="Your pricing tweak"
                outcome="didn't help"
                delta={-8}
                metric="checkout completions"
                date="Feb 3"
                suggestion="Reverting could recover those completions."
                tone="negative"
                revealed={revealed}
                delay={500}
              />
            </div>
          </div>

          {/* Feature 3: Plain language */}
          <div
            className={`scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "450ms" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Plain language
            </p>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Metrics you can feel
            </h3>
            <p className="text-text-secondary leading-relaxed">
              See outcomes in human terms — more signups, fewer people leaving
              (bounce rate), more clicks.
            </p>
            <div className="mt-5">
              <MetricsCard revealed={revealed} delay={550} />
            </div>
          </div>

          {/* Feature 4: Compounding history */}
          <div
            className={`scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "600ms" }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-2">
              Compounding
            </p>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              History that compounds
            </h3>
            <p className="text-text-secondary leading-relaxed">
              Each scan adds context, so verdicts get sharper over time. Start
              now, and next month you&apos;ll have a baseline.
            </p>
            <div className="mt-5">
              <HistoryCard revealed={revealed} delay={700} />
            </div>
          </div>
        </div>

        {/* Logo bar */}
        <div
          className={`flex items-center justify-center gap-6 mt-14 scroll-reveal ${revealed ? "revealed" : ""}`}
          style={{ transitionDelay: "700ms" }}
        >
          <span className="text-[11px] text-text-muted font-medium">
            Works with
          </span>
          <div className="flex items-center gap-4">
            <LovableLogo />
            <V0Logo />
            <BoltLogo />
            <span className="text-[11px] text-text-muted/60 font-medium">
              + more
            </span>
          </div>
        </div>

        {/* Re-entry CTA */}
        <div
          className={`text-center mt-8 scroll-reveal ${revealed ? "revealed" : ""}`}
          style={{ transitionDelay: "800ms" }}
        >
          <a
            href="#hero-form"
            className="text-sm text-violet hover:text-violet-hover transition-colors font-medium"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("hero-form")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            Start tracking your changes{" "}
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
