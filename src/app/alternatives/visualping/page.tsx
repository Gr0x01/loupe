import { Metadata } from "next";
import SEOHero from "@/components/seo/SEOHero";
import BenefitGrid from "@/components/seo/BenefitGrid";
import CTASection from "@/components/seo/CTASection";
import MockComparisonCard from "@/components/MockComparisonCard";
import {
  visualpingAlternativeData,
  CompareIcon,
  ChartUpIcon,
  AlertIcon,
} from "@/lib/seo/page-data";

export const metadata: Metadata = visualpingAlternativeData.metadata;

// Problem icons
const NoiseIcon = () => (
  <svg
    className="w-8 h-8 text-score-low"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path d="M4 16h4l2-6 4 12 4-8 2 4h8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NoContextIcon = () => (
  <svg
    className="w-8 h-8 text-score-mid"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <circle cx="16" cy="16" r="10" />
    <path d="M16 12v4M16 20h.01" strokeLinecap="round" />
  </svg>
);

const ManualIcon = () => (
  <svg
    className="w-8 h-8 text-text-muted"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path d="M12 8h8M8 14h16M10 20h12M14 26h4" strokeLinecap="round" />
    <circle cx="6" cy="8" r="2" />
    <circle cx="6" cy="14" r="2" />
    <circle cx="6" cy="20" r="2" />
  </svg>
);

const problemIcons = [<NoiseIcon key="noise" />, <NoContextIcon key="context" />, <ManualIcon key="manual" />];

// Check and X icons for comparison table
const CheckMark = () => (
  <svg className="w-5 h-5 text-score-high inline-block" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2.5}>
    <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XMark = () => (
  <svg className="w-5 h-5 text-text-muted inline-block" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2}>
    <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
  </svg>
);

export default function VisualpingAlternativePage() {
  const data = visualpingAlternativeData;

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <SEOHero
        eyebrow="Visualping Alternative"
        headline={
          <>
            Change detection that
            <br />
            <span className="text-accent">understands your site</span>
          </>
        }
        subheadline={data.subheadline}
        ctaText="Try Loupe free"
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

      {/* Comparison Table */}
      <section className="px-4 py-20 bg-bg-inset border-y border-border-subtle">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-[clamp(1.5rem,3vw,2rem)] text-text-primary"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Loupe vs Visualping
            </h2>
          </div>

          <div className="glass-card-elevated overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-text-muted uppercase tracking-wide">
                    Feature
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-bold text-accent">
                    Loupe
                  </th>
                  <th className="text-center px-6 py-4 text-sm font-semibold text-text-muted">
                    Visualping
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.comparisonTable.map((row, i) => (
                  <tr key={i} className={i < data.comparisonTable.length - 1 ? "border-b border-border-subtle/50" : ""}>
                    <td className="px-6 py-4 text-text-primary font-medium">
                      {row.feature}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <CheckMark />
                        <span className="text-sm text-text-secondary">{row.loupe}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {row.visualping === "None" ? <XMark /> : null}
                        <span className="text-sm text-text-muted">{row.visualping}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <BenefitGrid
        headline="Why founders switch to Loupe"
        benefits={data.benefits.map((b, i) => ({
          title: b.title,
          description: b.description,
          icon: i === 0 ? <CompareIcon /> : i === 1 ? <ChartUpIcon /> : <AlertIcon />,
        }))}
        dark
      />

      {/* CTA */}
      <CTASection
        headline="Try Loupe — no commitment"
        subheadline="Free audit. See the difference yourself."
        ctaText="Get your free audit"
        trustSignals={["Free forever", "No credit card", "Instant results"]}
      />
    </div>
  );
}
