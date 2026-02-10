"use client";

import FreeAuditForm from "./FreeAuditForm";

interface SEOHeroProps {
  /** Small text above headline (e.g., "For Lovable users") */
  eyebrow?: string;
  /** Main headline - supports JSX for line breaks/spans */
  headline: React.ReactNode;
  /** Subheadline - the pain point or value prop */
  subheadline: string;
  /** Optional supporting text below subheadline */
  supportingText?: string;
  /** Optional custom CTA text for the form button */
  ctaText?: string;
  /** Visual component to show beside the form (e.g., ToolMockupCard) */
  visual?: React.ReactNode;
  /** Show the "Free audit. No signup needed." text */
  showFreeAuditNote?: boolean;
}

export default function SEOHero({
  eyebrow,
  headline,
  subheadline,
  supportingText,
  ctaText = "Audit my page",
  visual,
  showFreeAuditNote = true,
}: SEOHeroProps) {
  return (
    <section className="min-h-[70vh] flex items-start pt-16 lg:pt-24 px-4 pb-16">
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Column — Copy + Input */}
          <div className="text-center lg:text-left">
            {eyebrow && (
              <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-4">
                {eyebrow}
              </p>
            )}

            <h1
              className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-tight text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {headline}
            </h1>

            <p className="text-xl text-text-secondary mt-5 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              {subheadline}
            </p>

            {supportingText && (
              <p className="text-base text-text-muted mt-3 max-w-xl mx-auto lg:mx-0">
                {supportingText}
              </p>
            )}

            <div className="mt-10 max-w-xl mx-auto lg:mx-0">
              <FreeAuditForm ctaText={ctaText} />
              {showFreeAuditNote && (
                <p className="text-sm text-text-muted mt-4 text-center lg:text-left">
                  Free audit. No signup needed.
                </p>
              )}
            </div>
          </div>

          {/* Right Column — Visual */}
          {visual && (
            <div className="flex justify-center lg:justify-end">
              {visual}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
