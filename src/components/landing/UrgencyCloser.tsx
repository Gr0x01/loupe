"use client";

import { useScrollReveal } from "@/hooks/useScrollReveal";
import FreeAuditForm from "@/components/seo/FreeAuditForm";

/**
 * UrgencyCloser — Section 4: "Your next change is coming"
 * Forward-looking, not fear-based. About YOUR future.
 */

export default function UrgencyCloser() {
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
        <div className="mb-5">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-coral bg-coral/5 text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">
            You ship. Loupe watches.
          </span>
        </div>

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
          This time, you won&apos;t have to babysit.
        </h2>

        {/* Subhead */}
        <p className="text-[1.05rem] md:text-[1.12rem] text-text-secondary mb-8 max-w-lg mx-auto leading-relaxed">
          Start with a free audit. Keep tracking 1 page forever — Loupe watches
          for changes and tells you what to do next.
        </p>

        {/* Form */}
        <div className="max-w-lg mx-auto">
          <FreeAuditForm ctaText="Audit my page" placeholder="yourapp.com" />
        </div>

        <p className="mt-5 text-sm text-text-muted">
          Track 1 page free forever • No credit card required
        </p>

        <p className="mt-3 text-xs text-text-secondary uppercase tracking-[0.08em]">
          Built for Lovable/Bolt builders and GitHub/Vercel teams.
        </p>
      </div>
    </section>
  );
}
