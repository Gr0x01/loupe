"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

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
  label: string;
  deltaText: string;
  tone: "positive" | "negative" | "neutral";
}

const changeOutcomes: ChangeOutcome[] = [
  { date: "Jan 15", label: "Page stable", deltaText: "Baseline locked", tone: "neutral" },
  { date: "Jan 28", label: "Headline rewritten", deltaText: "+23% signups", tone: "positive" },
  { date: "Feb 3", label: "Pricing section rebuilt", deltaText: "-8% checkouts", tone: "negative" },
  { date: "Feb 12", label: "Page stable", deltaText: "Watching for signal", tone: "neutral" },
];

function HeroVerdictCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  const lift = useCountUp(23, revealed, 900);

  return (
    <div
      className={`glass-card h-full p-5 md:p-6 border-emerald/35 bg-emerald/5 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">What it did</p>
        <span className="inline-flex items-center rounded-full border border-emerald/30 bg-white px-2 py-1 text-[10px] font-semibold text-emerald">
          High confidence
        </span>
      </div>

      <p className="mt-2 text-sm md:text-base font-semibold text-text-primary">Headline rewrite helped signups</p>

      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p
            className="text-[2.8rem] md:text-[3.1rem] font-bold leading-none text-emerald"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            +{lift}%
          </p>
          <p className="text-[12px] text-text-secondary mt-1">since Jan 28</p>
        </div>

        <svg viewBox="0 0 70 36" className="w-[90px] h-[46px]" fill="none" aria-hidden="true">
          <path
            d="M2 32 Q12 30 18 24 Q24 18 32 19 Q40 20 48 12 Q56 6 68 4"
            stroke="var(--score-high)"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            opacity="0.6"
          />
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-line/50 bg-white p-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Confidence</p>
          <p className="text-[13px] font-semibold text-text-primary">92%</p>
        </div>
        <div className="rounded-lg border border-line/50 bg-white p-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Sample</p>
          <p className="text-[13px] font-semibold text-text-primary">8,412 sessions</p>
        </div>
        <div className="rounded-lg border border-line/50 bg-white p-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Window</p>
          <p className="text-[13px] font-semibold text-text-primary">14 days</p>
        </div>
      </div>
    </div>
  );
}

function WhatToDoNextCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  return (
    <div
      className={`glass-card h-full p-5 md:p-6 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">What to do next</p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">Ship winners. Revert losers.</h3>

      <div className="mt-4 space-y-2">
        <div className="rounded-lg border border-emerald/30 bg-emerald/5 px-3 py-2">
          <p className="text-[12px] text-text-secondary">Keep headline rewrite</p>
          <p className="text-sm font-semibold text-emerald">Likely adding qualified signups</p>
        </div>
        <div className="rounded-lg border border-score-low/25 bg-score-low/5 px-3 py-2">
          <p className="text-[12px] text-text-secondary">Revert pricing layout</p>
          <p className="text-sm font-semibold text-score-low">Recover an estimated 8% checkouts</p>
        </div>
      </div>

      <a
        href="#hero-form"
        className="inline-flex items-center mt-4 text-sm text-violet hover:text-violet-hover transition-colors font-medium"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("hero-form")?.scrollIntoView({ behavior: "smooth" });
        }}
      >
        Start tracking your page <span aria-hidden="true" className="ml-1">→</span>
      </a>
    </div>
  );
}

function ChangeEvidenceCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  return (
    <div
      className={`glass-card h-full p-5 md:p-6 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">What changed</p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">Timeline with verdicts attached</h3>

      <div className="mt-4 relative pl-6">
        <div className="absolute left-[7px] top-1 bottom-1 w-[2px] bg-gradient-to-b from-line/30 via-blue/35 to-line/30" />

        <div className="space-y-3">
          {changeOutcomes.map((item) => {
            const dotClass =
              item.tone === "positive"
                ? "bg-score-high border-score-high"
                : item.tone === "negative"
                  ? "bg-score-low border-score-low"
                  : "bg-paper-100 border-line";

            const badgeClass =
              item.tone === "positive"
                ? "border-score-high/25 bg-score-high/5 text-score-high"
                : item.tone === "negative"
                  ? "border-score-low/25 bg-score-low/5 text-score-low"
                  : "border-line/40 bg-bg-inset text-text-secondary";

            return (
              <div key={`${item.date}-${item.label}`} className="relative">
                <div className={`absolute left-[-17px] top-[8px] h-[9px] w-[9px] rounded-full border ${dotClass}`} />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-text-muted">{item.date}</p>
                    <p className="text-[13px] font-medium text-text-primary">{item.label}</p>
                  </div>
                  <span className={`mt-0.5 inline-flex rounded-md border px-2 py-1 text-[10px] font-semibold ${badgeClass}`}>
                    {item.deltaText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          <span>Plain language</span>
          <span className="text-blue">Today</span>
        </div>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-lg bg-bg-inset px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Signups</p>
            <p className="text-sm font-semibold text-score-high mt-0.5">+23%</p>
          </div>
          <div className="rounded-lg bg-bg-inset px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">Bounce rate</p>
            <p className="text-sm font-semibold text-score-high mt-0.5">-8%</p>
          </div>
          <div className="rounded-lg bg-bg-inset px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-text-muted">CTA clicks</p>
            <p className="text-sm font-semibold text-score-high mt-0.5">+14%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChangeSourcesCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  return (
    <div
      className={`glass-card h-full p-5 md:p-6 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Captured automatically</p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">Where changes came from</h3>

      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between rounded-lg bg-bg-inset px-3 py-2">
          <div className="flex items-center gap-2">
            <LovableLogo className="w-4 h-4 text-violet" />
            <p className="text-[12px] font-medium text-text-primary">AI builder edits</p>
          </div>
          <span className="text-[10px] text-text-muted">2 changes</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-bg-inset px-3 py-2">
          <div className="flex items-center gap-2">
            <V0Logo className="w-4 h-4 text-blue" />
            <p className="text-[12px] font-medium text-text-primary">CMS updates</p>
          </div>
          <span className="text-[10px] text-text-muted">1 change</span>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-bg-inset px-3 py-2">
          <div className="flex items-center gap-2">
            <BoltLogo className="w-4 h-4" />
            <p className="text-[12px] font-medium text-text-primary">Deploy tweaks</p>
          </div>
          <span className="text-[10px] text-text-muted">2 changes</span>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-text-muted">No manual logging. Every page state is captured for attribution.</p>
    </div>
  );
}

function SignalCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  return (
    <div
      className={`glass-card h-full p-5 md:p-6 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Signal quality</p>
      <h3 className="mt-2 text-lg font-semibold text-text-primary">How fast decisions get clearer</h3>

      <div className="mt-4 space-y-2">
        <div className="rounded-lg border border-line/50 bg-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Median time to verdict</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">36 hours</p>
        </div>
        <div className="rounded-lg border border-line/50 bg-white px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Decisive verdicts</p>
          <p className="text-sm font-semibold text-text-primary mt-0.5">2 of 3 changes</p>
        </div>
        <div className="rounded-lg border border-violet/30 bg-violet/5 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-violet/80">Still collecting</p>
          <p className="text-sm font-semibold text-violet mt-0.5">1 change needs more data</p>
        </div>
      </div>
    </div>
  );
}

function HistoryCard({ revealed, delay = 0 }: { revealed: boolean; delay?: number }) {
  const scans = useCountUp(12, revealed, 1000);
  const weeks = useCountUp(8, revealed, 1200);

  return (
    <div
      className={`glass-card h-full p-5 md:p-6 scroll-reveal-child ${revealed ? "revealed" : ""}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">Compounding history</p>

      <div className="mt-3 flex items-end gap-2">
        <p className="text-4xl font-bold text-text-primary" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          {weeks}
        </p>
        <p className="pb-1 text-lg text-text-secondary">weeks</p>
      </div>

      <p className="text-sm text-text-secondary mt-1">Verdicts sharpen as scans stack up.</p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-bg-inset p-2 text-center">
          <p className="text-lg font-semibold text-text-primary" style={{ fontFamily: "var(--font-instrument-serif)" }}>{scans}</p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Scans</p>
        </div>
        <div className="rounded-lg bg-bg-inset p-2 text-center">
          <p className="text-lg font-semibold text-text-primary" style={{ fontFamily: "var(--font-instrument-serif)" }}>5</p>
          <p className="text-[10px] uppercase tracking-wider text-text-muted">Changes</p>
        </div>
        <div className="rounded-lg border border-violet/30 bg-violet/5 p-2 text-center">
          <p className="text-lg font-semibold text-violet" style={{ fontFamily: "var(--font-instrument-serif)" }}>3</p>
          <p className="text-[10px] uppercase tracking-wider text-violet/80">Verdicts</p>
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
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Your changes. Your answers.
          </h2>

          <p className="text-[1.02rem] md:text-[1.08rem] text-text-secondary max-w-2xl mx-auto mt-4 leading-relaxed">
            One compact surface for what changed, what it did, and what to do next.
          </p>
        </div>

        <div className={`scroll-reveal ${revealed ? "revealed" : ""}`} style={{ transitionDelay: "120ms" }}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-stretch">
            <div className="md:col-span-8 h-full">
              <HeroVerdictCard revealed={revealed} delay={200} />
            </div>
            <div className="md:col-span-4 h-full">
              <WhatToDoNextCard revealed={revealed} delay={300} />
            </div>
            <div className="md:col-span-4 h-full">
              <ChangeSourcesCard revealed={revealed} delay={400} />
            </div>
            <div className="md:col-span-8 h-full">
              <ChangeEvidenceCard revealed={revealed} delay={400} />
            </div>
            <div className="md:col-span-7 h-full">
              <HistoryCard revealed={revealed} delay={600} />
            </div>
            <div className="md:col-span-5 h-full">
              <SignalCard revealed={revealed} delay={700} />
            </div>
          </div>
        </div>

        <div
          className={`flex items-center justify-center gap-6 mt-10 scroll-reveal ${revealed ? "revealed" : ""}`}
          style={{ transitionDelay: "700ms" }}
        >
          <span className="text-[11px] text-text-muted font-medium">Works with</span>
          <div className="flex items-center gap-4">
            <LovableLogo />
            <V0Logo />
            <BoltLogo />
            <span className="text-[11px] text-text-muted/60 font-medium">+ more</span>
          </div>
        </div>
      </div>
    </section>
  );
}
