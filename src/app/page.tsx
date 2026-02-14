import type { Metadata } from "next";
import FreeAuditForm from "@/components/seo/FreeAuditForm";
import SitePreviewCard from "@/components/landing/SitePreviewCard";
import TribeSignal from "@/components/landing/TribeSignal";
import WorksWithStrip from "@/components/landing/WorksWithStrip";
import YourPage from "@/components/landing/YourPage";
import YourResults from "@/components/landing/YourResults";
import YourIntegrations from "@/components/landing/YourIntegrations";
import UrgencyCloser from "@/components/landing/UrgencyCloser";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Loupe — See what your last deploy actually did",
  description:
    "You make the change, hit deploy, move on. A week later, Loupe tells you if it helped or hurt. Free audit in 30 seconds.",
};

export default async function Home() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero -- Two-column layout with visual card on right */}
      <section className="landing-hero px-4">
        <div className="landing-hero-bg" />
        <div className="landing-hero-dots" />

        <div className="w-full max-w-6xl mx-auto landing-hero-content">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] lg:grid-cols-2 gap-8 md:gap-6 lg:gap-16 items-start">
            {/* Left column -- Copy + CTA */}
            <div className="max-w-xl md:max-w-lg lg:max-w-xl md:text-left">
              {/* Headline */}
              <h1
                className="text-[clamp(2rem,4.5vw,2.85rem)] leading-[1.15] tracking-[-0.02em] landing-hero-headline-depth"
                style={{ fontFamily: "var(--font-display)" }}
              >
                <span className="landing-hero-headline-1 block text-text-primary">
                  You made the change.
                </span>
                <span className="landing-hero-headline-2 block text-accent">
                  See what it did.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-[1.15rem] text-text-primary mt-5 leading-[1.7] max-w-[38ch] landing-hero-subhead">
                You write the headline, hit deploy, move on. A week later, Loupe
                tells you if it helped or{"\u00A0"}hurt.
              </p>

              {/* Form */}
              <div
                className="mt-8 max-w-lg landing-hero-form"
                id="hero-form"
              >
                <FreeAuditForm ctaText="Audit my page" />
              </div>

              {/* Trust line */}
              <p className="text-base font-medium text-text-secondary mt-5 landing-hero-trust">
                Free forever for 1 page. Results in 30 seconds.
              </p>

              {/* Tribe signal — tool logos above the fold */}
              <TribeSignal />
            </div>

            {/* Right column -- Site mockup with Loupe notifications */}
            <div className="hidden md:flex md:justify-end landing-hero-card lg:pt-8 landing-hero-card-peek lg:landing-hero-card-peek-off">
              <SitePreviewCard />
            </div>
          </div>
        </div>
      </section>

      {/* Works With -- Confidence strip */}
      <WorksWithStrip />

      {/* Your Page -- What Loupe sees */}
      <YourPage />

      {/* Your Results -- Did that change work? */}
      <YourResults />

      {/* Your Integrations -- Why connect your tools */}
      <YourIntegrations />

      {/* Urgency Closer -- Final push with dark treatment */}
      <UrgencyCloser />
    </div>
  );
}
