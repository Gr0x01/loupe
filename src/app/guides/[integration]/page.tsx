import { notFound } from "next/navigation";
import { Metadata } from "next";
import SEOHero from "@/components/seo/SEOHero";
import BenefitGrid from "@/components/seo/BenefitGrid";
import CTASection from "@/components/seo/CTASection";
import {
  INTEGRATIONS,
  type Integration,
  integrationGuideData,
  ChartUpIcon,
  AlertIcon,
  GitBranchIcon,
} from "@/lib/seo/page-data";

interface PageProps {
  params: Promise<{ integration: string }>;
}

export async function generateStaticParams() {
  return INTEGRATIONS.map((integration) => ({ integration }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { integration } = await params;
  if (!INTEGRATIONS.includes(integration as Integration)) {
    return { title: "Not Found" };
  }
  const data = integrationGuideData[integration as Integration];
  return data.metadata;
}

// Step number component
function StepNumber({ num }: { num: number }) {
  return (
    <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
      {num}
    </div>
  );
}

// Integration-specific icons
const PostHogLogo = () => (
  <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="8" fill="#1D4AFF" />
    <path d="M12 36V12h6v24h-6zM21 36V18h6v18h-6zM30 36V24h6v12h-6z" fill="white" />
  </svg>
);

const GA4Logo = () => (
  <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="8" fill="#F9AB00" />
    <path d="M24 12c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm0 18a6 6 0 110-12 6 6 0 010 12z" fill="white" />
    <circle cx="24" cy="24" r="3" fill="white" />
  </svg>
);

const GitHubLogo = () => (
  <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
    <rect width="48" height="48" rx="8" fill="#24292E" />
    <path fillRule="evenodd" clipRule="evenodd" d="M24 12c-6.627 0-12 5.373-12 12 0 5.302 3.438 9.8 8.205 11.385.6.111.82-.261.82-.579 0-.287-.011-1.049-.017-2.059-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.085 1.84 1.237 1.84 1.237 1.07 1.835 2.807 1.305 3.492.998.109-.776.419-1.305.762-1.605-2.665-.304-5.467-1.333-5.467-5.932 0-1.31.469-2.381 1.236-3.221-.124-.303-.536-1.524.118-3.176 0 0 1.008-.323 3.301 1.23A11.51 11.51 0 0124 18.16c1.02.005 2.047.138 3.006.404 2.291-1.553 3.297-1.23 3.297-1.23.656 1.652.244 2.873.12 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.625-5.479 5.922.431.372.815 1.103.815 2.222 0 1.606-.015 2.898-.015 3.293 0 .321.216.696.825.578C36.565 33.797 40 29.3 40 24c0-6.627-5.373-12-12-12z" fill="white" />
  </svg>
);

function getIntegrationLogo(integration: Integration) {
  switch (integration) {
    case "posthog":
      return <PostHogLogo />;
    case "ga4":
      return <GA4Logo />;
    case "github":
      return <GitHubLogo />;
  }
}

// Connection flow diagram
function ConnectionDiagram({ integration }: { integration: Integration }) {
  return (
    <div className="glass-card-elevated p-6 max-w-md w-full">
      <div className="flex items-center justify-center gap-4 mb-6">
        {getIntegrationLogo(integration)}
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          <div className="w-8 h-0.5 bg-accent/30" />
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.2s" }} />
          <div className="w-8 h-0.5 bg-accent/30" />
          <div className="w-2 h-2 rounded-full bg-accent animate-pulse" style={{ animationDelay: "0.4s" }} />
        </div>
        <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 bg-bg-inset rounded-lg">
          <div className="w-6 h-6 rounded-full bg-score-high/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-score-high" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={2.5}>
              <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
            </svg>
          </div>
          <span className="text-sm text-text-primary">Connected &amp; syncing</span>
        </div>

        <div className="flex items-center gap-3 p-3 bg-bg-inset rounded-lg">
          <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-accent">3</span>
          </div>
          <span className="text-sm text-text-secondary">Changes tracked this week</span>
        </div>

        <div className="flex items-center gap-3 p-3 bg-bg-inset rounded-lg">
          <div className="w-6 h-6 rounded-full bg-score-high/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-3.5 h-3.5 text-score-high" fill="none" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.5}>
              <polyline points="2 12 6 8 9 11 14 4" />
            </svg>
          </div>
          <span className="text-sm text-text-secondary">+12% conversions after CTA fix</span>
        </div>
      </div>
    </div>
  );
}

export default async function IntegrationGuidePage({ params }: PageProps) {
  const { integration } = await params;

  if (!INTEGRATIONS.includes(integration as Integration)) {
    notFound();
  }

  const data = integrationGuideData[integration as Integration];

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <SEOHero
        eyebrow={data.tagline}
        headline={data.headline}
        subheadline={data.subheadline}
        ctaText="Get started free"
        visual={<ConnectionDiagram integration={integration as Integration} />}
      />

      {/* Steps Section */}
      <section className="px-4 py-20">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              How it works
            </h2>
          </div>

          <div className="space-y-6">
            {data.steps.map((step, i) => (
              <div key={i} className="glass-card p-6 flex items-start gap-5">
                <StepNumber num={i + 1} />
                <div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <BenefitGrid
        headline={`Why connect ${data.name}?`}
        benefits={data.benefits.map((b, i) => ({
          title: b.title,
          description: b.description,
          icon: i === 0 ? <ChartUpIcon /> : i === 1 ? <AlertIcon /> : <GitBranchIcon />,
        }))}
        dark
      />

      {/* CTA */}
      <CTASection
        headline={`Connect ${data.name} today`}
        subheadline="Free audit first. Integrations available after signup."
        ctaText="Get your free audit"
        trustSignals={["Free forever", "One-click connect", "Read-only access"]}
      />
    </div>
  );
}
