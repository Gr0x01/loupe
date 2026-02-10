"use client";

import { useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

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

interface ChangeOutcome {
  date: string;
  change: string;
  result: string;
  tone: "helped" | "hurt" | "watching";
}

const changeOutcomes: ChangeOutcome[] = [
  {
    date: "Jan 28",
    change: 'Headline:\n"Get started" → "Start free trial"',
    result: "+23% signups",
    tone: "helped",
  },
  {
    date: "Feb 03",
    change: "Pricing layout rebuilt by AI tool",
    result: "-8% checkouts",
    tone: "hurt",
  },
  {
    date: "Feb 12",
    change: "Trust section reordered",
    result: "Watching for signal",
    tone: "watching",
  },
];

interface ActionItem {
  label: string;
  detail: string;
  status: "keep" | "revert" | "test";
}

const actionItems: ActionItem[] = [
  {
    label: "Keep headline rewrite",
    detail: "Qualified signups are still trending up.",
    status: "keep",
  },
  {
    label: "Revert pricing layout",
    detail: "Recover checkout starts from last baseline.",
    status: "revert",
  },
];

const almostMissedSignals = [
  {
    title: "Primary CTA dropped below the fold",
    context: "Detected right after a component rebuild.",
  },
  {
    title: "Two testimonials disappeared on mobile",
    context: "Likely caused by a layout utility class swap.",
  },
];

function HeroVerdictCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  const lift = useCountUp(23, revealed, 900);

  return (
    <div
      className={`glass-card h-full p-5 md:p-6 border-coral/35 bg-gradient-to-br from-coral/10 via-white to-emerald/10 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
            What it did
          </p>
          <span className="inline-flex items-center rounded-full border border-line/40 bg-white px-2 py-1 text-[10px] font-semibold text-text-secondary">
            14-day window
          </span>
        </div>

        <h3 className="mt-2 text-lg font-semibold text-text-primary">
          One line changed. Signups moved.
        </h3>
        <p className="mt-2 text-sm text-text-secondary leading-relaxed">
          Loupe caught the headline change, watched for 14 days, then surfaced the correlation. No dashboards to check. Just a clear answer.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-[1.12fr_0.88fr] items-end">
          <div className="py-3.5">
            <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold">
              Message change
            </p>
            <div className="mt-2 space-y-1.5">
              <p className="text-[clamp(1.3rem,2.7vw,1.9rem)] leading-[1.05] font-semibold text-text-muted line-through">
                &ldquo;Get started&rdquo;
              </p>
              <p className="text-[clamp(1.5rem,3.1vw,2.1rem)] leading-[1.05] font-semibold text-text-primary">
                &ldquo;Start free trial&rdquo;
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-emerald/10 px-4 py-3.5 flex flex-col justify-between">
            <p className="text-[10px] uppercase tracking-widest text-emerald/80 font-semibold">
              Result
            </p>
            <p
              className="text-[2.75rem] md:text-[3rem] font-bold leading-none text-emerald mt-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              +{lift}%
            </p>
            <p className="text-[12px] text-text-secondary mt-1.5">signups since Jan 28</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WhatToDoNextCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  return (
    <div
      className={`glass-card h-full p-5 md:p-6 border-violet/35 bg-gradient-to-br from-violet/10 via-white to-blue/10 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        What to do next
      </p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">
        Clear calls, not another dashboard.
      </h3>

      <p className="mt-2 text-sm text-text-secondary">
        Works whether your last update came from an AI rebuild or a late-night deploy.
      </p>

      <div className="mt-4 space-y-2.5">
        {actionItems.map((item) => {
          const statusClass =
            item.status === "keep"
              ? "bg-emerald/15 text-emerald"
              : item.status === "revert"
                ? "bg-score-low/12 text-score-low"
                : "bg-blue/12 text-blue";

          const statusLabel =
            item.status === "keep"
              ? "Keep"
              : item.status === "revert"
                ? "Revert"
                : "Test";

          return (
            <div
              key={item.label}
              className="rounded-lg bg-violet/8 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-text-primary">{item.label}</p>
                <span
                  className={`inline-flex rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${statusClass}`}
                >
                  {statusLabel}
                </span>
              </div>
              <p className="mt-1 text-[12px] text-text-secondary">{item.detail}</p>
            </div>
          );
        })}
      </div>

    </div>
  );
}

function TimelineCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  return (
    <div
      className={`glass-card h-full p-5 md:p-6 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        Change feed
      </p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">
        What changed, in order.
      </h3>
      <p className="mt-2 text-sm text-text-secondary">
        Every edit tracked. Every outcome labeled.
      </p>

      <div className="mt-4 relative pl-5">
        <div className="absolute left-[8.5px] top-2 bottom-0 w-[2px] bg-gradient-to-b from-line/40 via-line/30 to-transparent" />

        <div className="space-y-4">
          {changeOutcomes.map((item) => {
            const dotClass =
              item.tone === "helped"
                ? "bg-score-high border-score-high"
                : item.tone === "hurt"
                  ? "bg-score-low border-score-low"
                  : "bg-paper-100 border-line";

            const badgeClass =
              item.tone === "helped"
                ? "bg-score-high/10 text-score-high"
                : item.tone === "hurt"
                  ? "bg-score-low/10 text-score-low"
                  : "bg-bg-inset text-text-secondary";

            return (
              <div key={`${item.date}-${item.change}`} className="relative">
                <div className={`absolute left-[-15px] top-[6px] h-[9px] w-[9px] rounded-full border ${dotClass}`} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-text-muted">{item.date}</p>
                    <p className="text-[13px] font-medium text-text-primary whitespace-pre-line">{item.change}</p>
                  </div>
                  <span className={`mt-0.5 inline-flex rounded-md px-2 py-1 text-[10px] font-semibold ${badgeClass}`}>
                    {item.result}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AlmostMissedCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  return (
    <div
      className={`glass-card h-full p-5 md:p-6 border-amber/35 bg-gradient-to-br from-amber/10 via-white to-white scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        What you almost missed
      </p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">
        Quiet breaks caught early.
      </h3>
      <p className="mt-2 text-sm text-text-secondary">
        Loupe flags the edits that quietly cost signups before they stay live for weeks.
      </p>

      <div className="mt-4 space-y-2.5">
        {almostMissedSignals.map((signal) => (
          <div key={signal.title} className="rounded-lg bg-amber/8 px-3 py-2.5">
            <p className="text-[13px] font-semibold text-text-primary">{signal.title}</p>
            <p className="mt-1 text-[12px] text-text-secondary">{signal.context}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompoundingCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  const weeks = useCountUp(8, revealed, 1200);
  const scans = useCountUp(12, revealed, 1200);
  const changes = useCountUp(5, revealed, 1000);
  const validated = useCountUp(2, revealed, 1000);

  return (
    <div
      className={`glass-card h-full p-5 md:p-6 border-blue/30 bg-gradient-to-br from-blue/8 via-white to-emerald/8 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
        Compounding context
      </p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">
        Smarter over time.
      </h3>
      <p className="mt-2 text-sm text-text-secondary">
        The longer Loupe watches, the sharper it gets.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg bg-blue/8 py-3">
          <p className="text-2xl font-bold text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
            {weeks}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">weeks</p>
        </div>
        <div className="rounded-lg bg-blue/8 py-3">
          <p className="text-2xl font-bold text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
            {scans}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">scans</p>
        </div>
        <div className="rounded-lg bg-blue/8 py-3">
          <p className="text-2xl font-bold text-text-primary" style={{ fontFamily: "var(--font-display)" }}>
            {changes}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">changes</p>
        </div>
        <div className="rounded-lg bg-emerald/10 py-3">
          <p className="text-2xl font-bold text-emerald" style={{ fontFamily: "var(--font-display)" }}>
            {validated}
          </p>
          <p className="text-[11px] text-text-secondary mt-0.5">validated</p>
        </div>
      </div>
    </div>
  );
}

export default function YourResults() {
  const { ref, revealed } = useScrollReveal(0.15);

  return (
    <section className="px-4 py-20 md:py-28 bg-bg-secondary">
      <div className="w-full max-w-5xl mx-auto">
        <div
          ref={ref}
          className={`text-center mb-10 scroll-reveal ${revealed ? "revealed" : ""}`}
        >
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-violet bg-violet/5 text-[11px] font-semibold uppercase tracking-[0.18em] text-violet">
              Your results
            </span>
          </div>

          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your changes. Clear calls.
          </h2>

          <p className="text-[1.02rem] md:text-[1.08rem] text-text-secondary max-w-2xl mx-auto mt-4 leading-relaxed">
            One bento surface for what changed, what it did to signups, and what you should do next.
          </p>
        </div>

        <div className={`scroll-reveal ${revealed ? "revealed" : ""}`} style={{ transitionDelay: "120ms" }}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <div className="lg:col-span-7 h-full">
              <HeroVerdictCard revealed={revealed} delay={200} />
            </div>
            <div className="lg:col-span-5 h-full">
              <WhatToDoNextCard revealed={revealed} delay={300} />
            </div>
            <div className="lg:col-span-5 h-full">
              <TimelineCard revealed={revealed} delay={400} />
            </div>
            <div className="lg:col-span-4 h-full">
              <AlmostMissedCard revealed={revealed} delay={500} />
            </div>
            <div className="lg:col-span-3 h-full">
              <CompoundingCard revealed={revealed} delay={550} />
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <a
              href="#hero-form"
              className="inline-flex items-center text-sm text-violet hover:text-violet-hover transition-colors font-medium"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("hero-form")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              See what changed on your page <span aria-hidden="true" className="ml-1">-&gt;</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
