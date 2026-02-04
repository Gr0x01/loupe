import { Metadata } from "next";
import SEOHero from "@/components/seo/SEOHero";
import BenefitGrid from "@/components/seo/BenefitGrid";
import CTASection from "@/components/seo/CTASection";
import MockComparisonCard from "@/components/MockComparisonCard";
import {
  monitorWebsiteChangesData,
  ScreenshotIcon,
  CompareIcon,
  AlertIcon,
} from "@/lib/seo/page-data";

export const metadata: Metadata = monitorWebsiteChangesData.metadata;

// Problem icons
const DeployIcon = () => (
  <svg
    className="w-8 h-8 text-score-low"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path d="M16 4v16M10 14l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6 24h20" strokeLinecap="round" />
  </svg>
);

const WidgetIcon = () => (
  <svg
    className="w-8 h-8 text-score-mid"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <rect x="4" y="8" width="10" height="10" rx="2" />
    <rect x="18" y="8" width="10" height="10" rx="2" />
    <rect x="4" y="22" width="24" height="6" rx="2" opacity={0.5} />
  </svg>
);

const AIIcon = () => (
  <svg
    className="w-8 h-8 text-accent"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <circle cx="16" cy="16" r="10" />
    <path d="M12 12h8M12 16h8M12 20h4" strokeLinecap="round" />
  </svg>
);

const problemIcons = [<DeployIcon key="deploy" />, <WidgetIcon key="widget" />, <AIIcon key="ai" />];

export default function MonitorWebsiteChangesPage() {
  const data = monitorWebsiteChangesData;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <SEOHero
        headline={data.headline}
        subheadline={data.subheadline}
        supportingText={data.supportingText}
        ctaText="Start monitoring"
        visual={<MockComparisonCard />}
      />

      {/* Problem Section */}
      <section className="px-4 py-20">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {data.problemSection.headline}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.problemSection.points.map((point, i) => (
              <div key={i} className="glass-card p-6">
                <div className="mb-4">{problemIcons[i]}</div>
                <h3 className="text-lg font-bold text-text-primary mb-2">
                  {point.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <BenefitGrid
        headline="Smart monitoring for pages that convert"
        benefits={data.benefits.map((b, i) => ({
          title: b.title,
          description: b.description,
          icon: i === 0 ? <ScreenshotIcon /> : i === 1 ? <CompareIcon /> : <AlertIcon />,
        }))}
        dark
      />

      {/* CTA */}
      <CTASection
        headline="Start monitoring your site today"
        subheadline="Free audit first. Then ongoing monitoring."
        ctaText="Get your free audit"
        trustSignals={["Free audit", "No signup", "Instant results"]}
      />
    </div>
  );
}
