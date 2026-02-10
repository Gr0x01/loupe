import FreeAuditForm from "./FreeAuditForm";

interface CTASectionProps {
  /** Headline for the CTA section */
  headline?: string;
  /** Optional subheadline/description */
  subheadline?: string;
  /** Custom CTA button text */
  ctaText?: string;
  /** Trust signals to show (array of strings) */
  trustSignals?: string[];
}

export default function CTASection({
  headline = "Ship fast. We'll catch what you miss.",
  subheadline,
  ctaText = "Audit my page",
  trustSignals = ["Free audit, no signup"],
}: CTASectionProps) {
  return (
    <section className="bg-bg-inset px-4 py-24 border-t border-border-subtle">
      <div className="w-full max-w-2xl mx-auto text-center">
        <h2
          className="text-[clamp(1.75rem,4vw,2.5rem)] text-text-primary mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {headline}
        </h2>

        {subheadline && (
          <p className="text-lg text-text-secondary mb-6">{subheadline}</p>
        )}

        {trustSignals.length > 0 && (
          <div className="flex items-center justify-center gap-4 mb-8 text-sm text-text-muted flex-wrap">
            {trustSignals.map((signal, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-text-muted/30">•</span>}
                <span className="w-1.5 h-1.5 rounded-full bg-score-high" />
                {signal}
              </span>
            ))}
          </div>
        )}

        <FreeAuditForm ctaText={ctaText} />
      </div>
    </section>
  );
}
