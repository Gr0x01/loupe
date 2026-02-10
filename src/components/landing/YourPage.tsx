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
          className="grid lg:grid-cols-[1.1fr_0.9fr] gap-10 lg:gap-14 items-center"
        >
          {/* Left: Audit preview */}
          <div
            className={`relative scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "100ms" }}
          >
            <div className="absolute -inset-6 rounded-[28px] bg-gradient-to-br from-blue/10 via-white/40 to-amber/10 blur-2xl opacity-60" />
            <div className="relative glass-card-elevated p-6 md:p-7">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                  Audit preview
                </span>
                <span className="text-[10px] text-text-muted">Today</span>
              </div>

              <div className="mt-4 space-y-4">
                <div className="rounded-xl bg-bg-inset p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                    Your headline
                  </p>
                  <p
                    className="text-[1.05rem] text-text-primary leading-snug mt-2"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    Ship your idea in minutes
                  </p>
                  <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                    Benefit-led, but &ldquo;idea&rdquo; is vague. Specific outcomes
                    convert better.
                  </p>
                </div>

                <div className="rounded-xl border-2 border-amber bg-amber/5 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-amber">
                      Prediction
                    </span>
                    <span className="text-[11px] font-semibold text-amber">
                      +10–20% signups
                    </span>
                  </div>
                  <p className="text-sm text-text-primary mt-2">
                    Move your CTA above pricing.
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-paper-100 overflow-hidden">
                    <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-amber/60 to-amber" />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="rounded-xl border-2 border-line bg-white px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Finding
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      CTA below pricing
                    </p>
                  </div>
                  <div className="rounded-xl border-2 border-line bg-white px-3 py-2">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                      Finding
                    </p>
                    <p className="text-xs text-text-secondary mt-1">
                      Social proof hidden
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-6 -bottom-6 hidden md:block glass-card p-4 max-w-[220px]">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
                Loupe note
              </p>
              <p className="text-xs text-text-secondary mt-2 leading-relaxed">
                Most visitors never reach testimonials. Move social proof above
                pricing.
              </p>
            </div>
          </div>

          {/* Right: Copy and takeaways */}
          <div
            className={`scroll-reveal ${revealed ? "revealed" : ""}`}
            style={{ transitionDelay: "200ms" }}
          >
            <div className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-blue text-[11px] font-semibold uppercase tracking-[0.18em] text-blue bg-blue/5">
                Your page
              </span>
            </div>
            <h2
              className="text-[clamp(1.8rem,3.6vw,2.6rem)] text-text-primary leading-[1.15] tracking-[-0.01em]"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Your page, through Loupe
            </h2>
            <p className="text-[1.05rem] text-text-secondary mt-4 leading-relaxed max-w-xl">
              Loupe reads your headline, layout, and CTA. You get specific findings —
              not a generic checklist.
            </p>

            <div className={`mt-6 space-y-3 scroll-reveal-stagger ${revealed ? "revealed" : ""}`}>
              <div className="glass-card p-4 flex items-start gap-3">
                <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue border border-blue-hover" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Specific findings
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Concrete notes on what to fix — not vague advice.
                  </p>
                </div>
              </div>
              <div className="glass-card p-4 flex items-start gap-3">
                <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue border border-blue-hover" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Predictions attached
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Every suggestion comes with what it could change.
                  </p>
                </div>
              </div>
              <div className="glass-card p-4 flex items-start gap-3">
                <div className="mt-1 w-2.5 h-2.5 rounded-full bg-blue border border-blue-hover" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    Written for builders
                  </p>
                  <p className="text-sm text-text-secondary mt-1">
                    Plain language you can act on in minutes.
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
                See what Loupe finds on your page
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
