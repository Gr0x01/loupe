import type { Metadata } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { FOUNDING_50_CAP } from "@/lib/constants";
import FreeAuditForm from "@/components/seo/FreeAuditForm";
import SitePreviewCard from "@/components/landing/SitePreviewCard";
import WorksWithStrip from "@/components/landing/WorksWithStrip";
import YourPage from "@/components/landing/YourPage";
import YourResults from "@/components/landing/YourResults";
import YourIntegrations from "@/components/landing/YourIntegrations";
import UrgencyCloser from "@/components/landing/UrgencyCloser";
import FoundingCounter from "@/components/landing/FoundingCounter";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Loupe — See what your last deploy actually did",
  description:
    "You make the change, hit deploy, move on. Loupe watches what happens next and tells you if it worked. Free audit in 30 seconds.",
};

export default async function Home() {
  let foundingData: {
    claimed: number;
    total: number;
    remaining: number;
    isFull: boolean;
  } | null = null;

  try {
    // Service client needed: public count-only query (head: true, no row data).
    // Do NOT add column selections or remove head: true without switching to anon client.
    const supabase = createServiceClient();
    const { count, error } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_founding_50", true);

    if (!error) {
      const claimed = count ?? 0;
      foundingData = {
        claimed,
        total: FOUNDING_50_CAP,
        isFull: claimed >= FOUNDING_50_CAP,
        remaining: Math.max(0, FOUNDING_50_CAP - claimed),
      };
    }
  } catch {
    // Founding data is non-critical — render page without it
  }

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
              <div className="mb-5 landing-hero-qualifier">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border-2 border-coral bg-coral/5 text-[11px] font-semibold uppercase tracking-[0.18em] text-coral">
                  For founders who ship fast
                </span>
              </div>

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
                <FoundingCounter
                  claimed={foundingData.claimed}
                  total={foundingData.total}
                />
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
