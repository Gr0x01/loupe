"use client";

import Image from "next/image";
import { useScrollReveal } from "@/hooks/useScrollReveal";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export default function YourIntegrations() {
  const { ref, revealed } = useScrollReveal(0.15);

  return (
    <section className="px-4 py-16 md:py-24 bg-bg-primary">
      <div className="w-full max-w-5xl mx-auto">
        {/* Header */}
        <div
          ref={ref}
          className={`text-center mb-10 md:mb-12 scroll-reveal ${revealed ? "revealed" : ""}`}
        >
          <div className="mb-4">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-blue bg-blue/5 text-[11px] font-semibold uppercase tracking-[0.18em] text-blue">
              Your integrations
            </span>
          </div>

          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-display)" }}
          >
            From &ldquo;it changed&rdquo; to &ldquo;it&nbsp;worked.&rdquo;
          </h2>

          <p className="text-[1.02rem] md:text-[1.08rem] text-text-secondary max-w-2xl mx-auto mt-4 leading-relaxed">
            Loupe finds what&apos;s wrong on day one. Connect your tools and it
            tracks whether your fixes actually&nbsp;worked.
          </p>
        </div>

        {/* Two-card comparison */}
        <div className={`scroll-reveal ${revealed ? "revealed" : ""}`} style={{ transitionDelay: "150ms" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* Card 1 — Loupe alone (still great) */}
            <div
              className={`glass-card p-5 md:p-6 scroll-reveal-child ${revealed ? "revealed" : ""}`}
              style={{ transitionDelay: "200ms" }}
            >
              <p className="text-[10px] uppercase tracking-widest text-text-muted font-semibold mb-3">
                Loupe alone
              </p>

              <p className="text-lg md:text-xl font-semibold text-text-primary leading-snug">
                Spot issues. Get suggestions.
              </p>

              <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                Loupe audits your page, finds what&apos;s hurting conversions,
                and gives you specific fixes — no signup&nbsp;required.
              </p>

              {/* Mock findings — staggered reveal */}
              <div className="mt-5 space-y-2">
                <div
                  className={`rounded-lg bg-bg-inset px-4 py-3 border border-line-subtle scroll-reveal-child ${revealed ? "revealed" : ""}`}
                  style={{ transitionDelay: "500ms" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-text-primary">
                      CTA below the fold on mobile
                    </p>
                    <span className="rounded-md bg-coral/12 px-1.5 py-0.5 text-coral text-[10px] font-bold shrink-0">
                      High
                    </span>
                  </div>
                  <p className="text-[12px] text-text-secondary mt-1">
                    Move primary action above the first scroll.
                  </p>
                </div>
                <div
                  className={`rounded-lg bg-bg-inset px-4 py-3 border border-line-subtle scroll-reveal-child ${revealed ? "revealed" : ""}`}
                  style={{ transitionDelay: "650ms" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-semibold text-text-primary">
                      Headline lacks specificity
                    </p>
                    <span className="rounded-md bg-amber/12 px-1.5 py-0.5 text-amber text-[10px] font-bold shrink-0">
                      Med
                    </span>
                  </div>
                  <p className="text-[12px] text-text-secondary mt-1">
                    &ldquo;Get started&rdquo; → &ldquo;Start your free trial&rdquo;
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2 — With integrations (the unlock) */}
            <div
              className={`glass-card p-5 md:p-6 border-emerald/40 bg-gradient-to-br from-emerald/10 via-white to-blue/5 scroll-reveal-child ${revealed ? "revealed" : ""}`}
              style={{
                transitionDelay: "350ms",
                boxShadow: "4px 4px 0 rgba(16, 185, 129, 0.18)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <p className="text-[10px] uppercase tracking-widest text-emerald font-semibold">
                  + Your tools
                </p>
                <div className="flex items-center gap-1.5">
                  <GitHubIcon className="h-3.5 w-3.5 text-emerald/50" />
                  <Image src="/logos/posthog.svg" alt="PostHog" width={14} height={14} className="opacity-50" />
                  <Image src="/logos/ga4.svg" alt="Google Analytics" width={14} height={14} className="opacity-50" />
                  <Image src="/logos/supabase.svg" alt="Supabase" width={14} height={14} className="opacity-50" />
                </div>
              </div>

              <p className="text-lg md:text-xl font-bold text-text-primary leading-snug">
                Fix it. Ship it. Know if it&nbsp;worked.
              </p>

              <p className="mt-3 text-sm text-text-secondary leading-relaxed">
                GitHub tells Loupe <em>what you shipped and&nbsp;why</em>.
                Your analytics prove <em>whether it&nbsp;worked</em>.
                Now every deploy closes the&nbsp;loop.
              </p>

              {/* Mock correlation — delayed reveal */}
              <div
                className={`mt-5 rounded-lg bg-emerald/8 px-4 py-3 border border-emerald/20 scroll-reveal-child ${revealed ? "revealed" : ""}`}
                style={{ transitionDelay: "700ms" }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-emerald/70 font-medium">Deploy → Correlation</p>
                    <p className="text-[13px] font-semibold text-text-primary mt-1">
                      Headline: &ldquo;Get started&rdquo; → &ldquo;Start free trial&rdquo;
                    </p>
                  </div>
                  <span className="rounded-md bg-emerald/15 px-2 py-1 text-emerald text-sm font-bold shrink-0">
                    +23%
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-1.5">
                  <span className="font-mono text-[10px]">abc1234</span>
                  {" · "}signups over 14 days
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
