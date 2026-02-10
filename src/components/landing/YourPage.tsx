"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";

/**
 * YourPage — Section 2: "Your page, through Loupe"
 * Two-column feature layout with audit preview on the left
 * and crisp takeaways on the right.
 */

export default function YourPage() {
  const { ref, revealed } = useScrollReveal(0.1);

  return (
    <section className="px-4 py-20 md:py-28">
      <div className="w-full max-w-6xl mx-auto">
        <div
          ref={ref}
          className="grid lg:grid-cols-[0.95fr_1.05fr] gap-10 lg:gap-14 items-start"
        >
          {/* Visual: Audit preview */}
          <div
            className={`relative scroll-reveal lg:order-2 ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "100ms" }}
          >
            <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-blue/10 via-white/40 to-amber/10 blur-2xl opacity-60" />
            <div className="relative glass-card-elevated p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  Change brief
                </span>
                <span className="text-[10px] text-text-muted">Today</span>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-lg bg-bg-inset/70 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Detected change
                  </p>
                  <div className="mt-2 space-y-1.5">
                    <p className="text-sm text-text-muted line-through decoration-score-low/70">
                      Start free trial
                    </p>
                    <p
                      className="text-[1.05rem] text-text-primary leading-snug"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      Get started free
                    </p>
                  </div>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                    Loupe flags this as a meaningful message change, not just a
                    visual diff.
                  </p>
                </div>

                <div className="rounded-lg bg-amber/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-amber">
                      Prediction
                    </span>
                    <span className="text-[11px] font-semibold text-amber">
                      +10–20% signups
                    </span>
                  </div>
                  <p className="text-sm text-text-primary mt-2">
                    Likely outcome over 7 days if this change stays live.
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-paper-100 overflow-hidden">
                    <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-amber/60 to-amber" />
                  </div>
                </div>

                <div className="rounded-lg bg-white/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      What to do next
                    </p>
                    <span className="text-[10px] font-semibold text-blue">
                      Priority 1
                    </span>
                  </div>
                  <p className="text-sm text-text-primary mt-2">
                    Move social proof above pricing so visitors see trust cues
                    before decision friction.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Copy and takeaways */}
          <div
            className={`scroll-reveal lg:order-1 ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-blue text-[11px] font-semibold uppercase tracking-[0.18em] text-blue bg-blue/5">
                Your page
              </span>
            </div>
            <h2
              className="text-[clamp(1.8rem,3.6vw,2.6rem)] text-text-primary leading-[1.15] tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your page, through Loupe
            </h2>
            <p className="text-[1.05rem] text-text-secondary mt-4 leading-relaxed max-w-xl">
              Loupe shows what changed, why it matters, and what to fix next.
              Each suggestion includes predicted impact so you can prioritize fast.
            </p>

            <div className={`mt-6 space-y-4 scroll-reveal-stagger ${revealed ? "revealed" : ""}`}>
              <div className="flex items-start gap-3">
                <div className="mt-2 w-2 h-2 rounded-full bg-blue border border-blue-hover" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Exact change callouts
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Headline, CTA, layout, and trust signals in plain language.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-2 w-2 h-2 rounded-full bg-blue border border-blue-hover" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Predicted impact ranges
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Know what is likely to move signups before you ship.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-2 w-2 h-2 rounded-full bg-blue border border-blue-hover" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Clear next step
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Copy-paste-ready suggestions you can apply in minutes.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <a
                href="#hero-form"
                className="inline-flex items-center gap-2 text-sm font-medium text-blue hover:text-blue-hover transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  document
                    .getElementById("hero-form")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                See what changed on your page
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
