"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import FreeAuditForm from "@/components/seo/FreeAuditForm";

/**
 * UrgencyCloser — Section 4: "Your next change is coming"
 * Forward-looking, not fear-based. About YOUR future.
 */

export default function UrgencyCloser({
  foundingData,
}: {
  foundingData: {
    claimed: number;
    total: number;
    remaining: number;
    isFull: boolean;
  } | null;
}) {
  const { ref, revealed } = useScrollReveal(0.15);

  return (
    <section className="px-4 py-20 md:py-28 bg-bg-secondary">
      <div
        ref={ref}
        className={`w-full max-w-2xl mx-auto text-center scroll-reveal ${
          revealed ? "revealed" : ""
        }`}
      >
        {/* Eyebrow */}
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-emerald mb-5">
          You ship. Loupe watches.
        </p>

        {/* Headline */}
        <h2
          className="text-[clamp(1.85rem,4.5vw,2.75rem)] text-text-primary leading-[1.15] mb-4"
          style={{
            fontFamily: "var(--font-display)",
            letterSpacing: "-0.02em",
          }}
        >
          Your next change is coming.
          <br />
          This time, you won&apos;t have to babysit it.
        </h2>

        {/* Subhead */}
        <p className="text-[1.05rem] md:text-[1.12rem] text-text-secondary mb-8 max-w-lg mx-auto leading-relaxed">
          Start with a free audit. Loupe sets your baseline, watches for meaningful
          changes, and tells you what to do next.
        </p>

        {/* Form */}
        <div className="max-w-lg mx-auto">
          <FreeAuditForm ctaText="Start free audit" placeholder="yourapp.com" />
        </div>

        <p className="mt-5 text-sm text-text-muted">
          Free in beta • No signup • No credit card
        </p>

        <p className="mt-3 text-xs text-text-secondary uppercase tracking-[0.08em]">
          Built for Lovable/Bolt builders and GitHub/Vercel teams.
        </p>

        {/* Founding scarcity — hide until 10+ claimed for better social proof */}
        {foundingData && !foundingData.isFull && foundingData.claimed >= 10 && (
          <p className="text-sm text-text-muted mt-5">
            <span className="text-coral font-medium">
              {foundingData.remaining}
            </span>{" "}
            of {foundingData.total} founding spots remaining.
          </p>
        )}
      </div>
    </section>
  );
}
