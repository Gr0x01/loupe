import { notFound } from "next/navigation";
import { Metadata } from "next";
import SEOHero from "@/components/seo/SEOHero";
import BenefitGrid from "@/components/seo/BenefitGrid";
import CTASection from "@/components/seo/CTASection";
import ToolMockupCard from "@/components/seo/ToolMockupCard";
import {
  AI_TOOLS,
  type AITool,
  toolPageData,
  ScreenshotIcon,
  CompareIcon,
  AlertIcon,
} from "@/lib/seo/page-data";

interface PageProps {
  params: Promise<{ tool: string }>;
}

export async function generateStaticParams() {
  return AI_TOOLS.map((tool) => ({ tool }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { tool } = await params;
  if (!AI_TOOLS.includes(tool as AITool)) {
    return { title: "Not Found" };
  }
  const data = toolPageData[tool as AITool];
  return data.metadata;
}

// Pain point icons
const VanishIcon = () => (
  <svg
    className="w-8 h-8 text-score-low"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path d="M8 16h16M4 8h24M4 24h24" strokeLinecap="round" opacity={0.3} />
    <path d="M12 16h8" strokeLinecap="round" strokeWidth={2} />
  </svg>
);

const RewriteIcon = () => (
  <svg
    className="w-8 h-8 text-score-mid"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path d="M6 8h20M6 14h12M6 20h16M6 26h8" strokeLinecap="round" />
    <path d="M22 18l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const NoHistoryIcon = () => (
  <svg
    className="w-8 h-8 text-text-muted"
    fill="none"
    viewBox="0 0 32 32"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <circle cx="16" cy="16" r="10" />
    <path d="M16 10v6l4 2" strokeLinecap="round" />
    <path d="M6 6l20 20" strokeWidth={2} />
  </svg>
);

const painIcons = [<VanishIcon key="vanish" />, <RewriteIcon key="rewrite" />, <NoHistoryIcon key="nohistory" />];

export default async function ToolPage({ params }: PageProps) {
  const { tool } = await params;

  if (!AI_TOOLS.includes(tool as AITool)) {
    notFound();
  }

  const data = toolPageData[tool as AITool];

  // Format headline with line breaks
  const formattedHeadline = data.headline.split("\n").map((line, i, arr) => (
    <span key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </span>
  ));

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <SEOHero
        eyebrow={data.tagline}
        headline={formattedHeadline}
        subheadline={data.subheadline}
        supportingText={data.supportingText}
        ctaText="See what changed"
        visual={<ToolMockupCard tool={tool as AITool} />}
      />

      {/* Problem Section */}
      <section className="px-4 py-20">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              AI builds fast. But what did it break?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {data.painPoints.map((point, i) => (
              <div key={i} className="glass-card p-6">
                <div className="mb-4">{painIcons[i]}</div>
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
        headline="Loupe watches what your AI ships"
        benefits={data.benefits.map((b, i) => ({
          title: b.title,
          description: b.description,
          icon: i === 0 ? <ScreenshotIcon /> : i === 1 ? <CompareIcon /> : <AlertIcon />,
        }))}
        dark
      />

      {/* CTA */}
      <CTASection
        headline={`Ship with ${data.name}. We'll catch what it changes.`}
        ctaText="Get your free audit"
        trustSignals={["Free audit", "No signup", "See results instantly"]}
      />
    </div>
  );
}
