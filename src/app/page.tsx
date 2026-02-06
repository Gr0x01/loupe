"use client";

import FreeAuditForm from "@/components/seo/FreeAuditForm";
import CorrelationCard from "@/components/landing/CorrelationCard";
import ScenarioCarousel from "@/components/landing/ScenarioCarousel";
import AudienceCards from "@/components/landing/AudienceCards";

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero -- Two-column layout with visual card on right */}
      <section className="landing-hero px-4 pt-16 pb-20 md:pt-20 md:pb-24">
        {/* Decorative background layers */}
        <div className="landing-hero-bg" aria-hidden="true" />
        <div className="landing-hero-dots" aria-hidden="true" />
        <div className="landing-hero-orb-1" aria-hidden="true" />
        <div className="landing-hero-orb-2" aria-hidden="true" />
        <div className="landing-hero-orb-3" aria-hidden="true" />

        {/* Content sits above decorative layers */}
        <div className="landing-hero-content w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left column -- Copy + CTA */}
            <div className="max-w-xl">
              {/* Headline */}
              <h1
                className="text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.1] tracking-tight text-text-primary font-semibold"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                <span className="landing-hero-headline-1 block">Your headline changed.</span>
                <span className="landing-hero-headline-2 block text-accent">Signups jumped 23%.</span>
              </h1>

              {/* Subheadline */}
              <p className="text-xl text-text-secondary mt-6 leading-relaxed landing-hero-subhead">
                You ship fast. Loupe watches what that does to your&nbsp;numbers.
              </p>

              {/* Form */}
              <div className="mt-10 max-w-lg landing-hero-form">
                <FreeAuditForm />
              </div>

              {/* Trust line */}
              <p className="text-sm text-text-muted mt-5 landing-hero-trust">
                Free. No signup. Results in 30 seconds.
              </p>
            </div>

            {/* Right column -- CorrelationCard "money shot" */}
            <div className="flex justify-center lg:justify-end landing-hero-card">
              <CorrelationCard />
            </div>
          </div>
        </div>
      </section>

      {/* Scenario Carousel -- "What Loupe Catches" */}
      <ScenarioCarousel />

      {/* Audience Cards -- "Built for how you ship" */}
      <AudienceCards />

      {/* Closing CTA */}
      <section className="bg-bg-inset px-4 py-20 md:py-24 border-t border-border-subtle">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h2
            className="text-[clamp(1.75rem,4vw,2.5rem)] text-text-primary mb-4"
            style={{
              fontFamily: "var(--font-instrument-serif)",
              letterSpacing: "-0.02em",
            }}
          >
            Ship fast. We&apos;ll catch what you miss.
          </h2>
          <p className="text-text-secondary mb-8">
            Free audit, no signup. See what Loupe finds in 30 seconds.
          </p>
          <FreeAuditForm />
        </div>
      </section>
    </div>
  );
}
