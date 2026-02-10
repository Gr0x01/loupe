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
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-accent mb-5">
          You&apos;ll ship again this week
        </p>

        {/* Headline */}
        <h2
          className="text-[clamp(1.85rem,4.5vw,2.75rem)] text-text-primary leading-[1.15] mb-4"
          style={{
            fontFamily: "var(--font-instrument-serif)",
            letterSpacing: "-0.02em",
          }}
        >
          Your next change is coming.
          <br />
          This time, you&apos;ll know.
        </h2>

        {/* Subhead */}
        <p className="text-[1.05rem] md:text-[1.12rem] text-text-secondary mb-8 max-w-lg mx-auto leading-relaxed">
          Start with a free audit. It becomes the baseline Loupe watches against.
        </p>

        {/* Form */}
        <div className="max-w-lg mx-auto">
          <FreeAuditForm />
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-4 mt-5 flex-wrap">
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="text-score-high"
            >
              <path
                d="M3 8.5l3.5 3.5 6.5-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            No signup
          </span>
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="text-score-high"
            >
              <path
                d="M3 8.5l3.5 3.5 6.5-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            No credit card
          </span>
          <span className="flex items-center gap-1.5 text-sm text-text-muted">
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              className="text-score-high"
            >
              <path
                d="M3 8.5l3.5 3.5 6.5-7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            Results in 30 seconds
          </span>
        </div>

        {/* Founding scarcity */}
        {foundingData && !foundingData.isFull && (
          <p className="text-sm text-text-muted mt-5">
            <span className="text-accent font-medium">
              {foundingData.remaining}
            </span>{" "}
            of {foundingData.total} founding spots remaining.
          </p>
        )}
      </div>
    </section>
  );
}
