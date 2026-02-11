"use client";

import { useEffect, useRef, useState } from "react";
import FreeAuditForm from "@/components/seo/FreeAuditForm";
import SitePreviewCard from "@/components/landing/SitePreviewCard";
import WorksWithStrip from "@/components/landing/WorksWithStrip";
import YourPage from "@/components/landing/YourPage";
import YourResults from "@/components/landing/YourResults";
import YourIntegrations from "@/components/landing/YourIntegrations";
import UrgencyCloser from "@/components/landing/UrgencyCloser";

export default function Home() {
  const foundingFillRef = useRef<HTMLDivElement>(null);
  const [foundingData, setFoundingData] = useState<{
    claimed: number;
    total: number;
    remaining: number;
    isFull: boolean;
  } | null>(null);

  useEffect(() => {
    fetch("/api/founding-status")
      .then((res) => res.json())
      .then((data) => setFoundingData(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!foundingData || !foundingFillRef.current) return;
    const pct = Math.round((foundingData.claimed / foundingData.total) * 100);
    const raf = requestAnimationFrame(() => {
      if (foundingFillRef.current) {
        foundingFillRef.current.style.width = `${pct}%`;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [foundingData]);

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
              {/* Qualifier */}
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted mb-5 landing-hero-qualifier">
                For founders who ship fast
              </p>

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
                You write the headline, hit deploy, move on. Loupe watches what
                happens next and tells you if it{"\u00A0"}worked.
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
                Free. No signup. Results in 30 seconds.
              </p>

              {/* Founding 50 counter — pill with progress bar, real data */}
              {/* Hide until 10+ claimed for better social proof */}
              {foundingData && !foundingData.isFull && foundingData.claimed >= 10 && (
                <div className="mt-3 landing-hero-founding">
                  <div className="founding-counter-pill">
                    <div className="founding-counter-track">
                      <div
                        ref={foundingFillRef}
                        className="founding-counter-fill"
                        style={{ width: "0%" }}
                      />
                    </div>
                    <span className="text-[12px] font-medium text-coral">
                      {foundingData.claimed} of {foundingData.total} founding
                      spots claimed
                    </span>
                  </div>
                </div>
              )}
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
      <UrgencyCloser foundingData={foundingData} />
    </div>
  );
}
