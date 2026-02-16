"use client";

import Link from "next/link";
import type {
  ChangesSummary,
  ChangeCheckpointSummary,
  DeployContextAPI,
  Change,
  WatchingItem,
  ValidatedItem,
  ChronicleSuggestion,
  Correlation,
} from "@/lib/types/analysis";
import { ChronicleLayout } from "@/components/chronicle";

// ============================================
// Mock Data for xyz.io Demo Analysis
// ============================================

const mockBaselineDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
const mockCreatedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2h ago

const mockDeployContext: DeployContextAPI = {
  commit_sha: "a3f82b1c9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a",
  commit_message: "Update hero section and add customer logos",
  commit_author: "Sarah",
  commit_timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  changed_files: ["src/components/Hero.tsx", "src/components/SocialProof.tsx"],
};

const mockChanges: Change[] = [
  {
    element: "Integration Strip",
    description: "Added Bolt, Lovable to integration list",
    before: "Vercel, Netlify, Cloudflare, Railway",
    after: "Vercel, Netlify, Cloudflare, Railway, Bolt, Lovable",
    detectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "element",
  },
  {
    element: "Timeline Section",
    description: "Updated Chronicle UI with polished entry design",
    before: "Standard timeline view",
    after: "Updated Chronicle UI with polished entry design",
    detectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    scope: "section",
  },
];

const mockWatchingItems: WatchingItem[] = [
  {
    id: "watch-1",
    element: "Timeline Visual",
    title: "Buried 'Aha' Moment",
    daysOfData: 0,
    daysNeeded: 30,
    firstDetectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockCheckpointsCTA: ChangeCheckpointSummary[] = [
  {
    id: "cp-1a",
    horizon_days: 7,
    assessment: "improved",
    confidence: 0.88,
    reasoning: "Conversion rate up 14% in first week. Strong early signal — CTA copy resonated immediately with returning visitors.",
    data_sources: ["posthog"],
    computed_at: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cp-1b",
    horizon_days: 14,
    assessment: "improved",
    confidence: 0.93,
    reasoning: "Lift held at +17% through week two. New visitors converting at similar rate to returning — not a novelty effect.",
    data_sources: ["posthog"],
    computed_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cp-1c",
    horizon_days: 30,
    assessment: "improved",
    confidence: 0.87,
    reasoning: "Sustained +18.4% after 30 days. Slight regression in mobile but desktop holds strong. Durable improvement.",
    data_sources: ["posthog"],
    computed_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockCheckpointsHeadline: ChangeCheckpointSummary[] = [
  {
    id: "cp-2a",
    horizon_days: 7,
    assessment: "improved",
    confidence: 0.76,
    reasoning: "Bounce rate dropped 4% in week one. Promising but sample size limited.",
    data_sources: ["posthog"],
    computed_at: new Date(Date.now() - 23 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "cp-2b",
    horizon_days: 14,
    assessment: "inconclusive",
    confidence: 0.52,
    reasoning: "Bounce rate fluctuated between -3% and -8% — traffic mix shifted mid-period. Need more data.",
    data_sources: ["posthog"],
    computed_at: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const mockValidatedItems: ValidatedItem[] = [
  {
    id: "val-1",
    element: "Primary CTA",
    title: "CTA copy change improved click-through",
    metric: "conversion_rate",
    change: "+18.4%",
    friendlyText: "More visitors clicking your CTA",
    checkpoints: mockCheckpointsCTA,
  },
  {
    id: "val-2",
    element: "Hero Headline",
    title: "New headline reduced bounce",
    metric: "bounce_rate",
    change: "-6.2%",
    friendlyText: "Fewer visitors leaving immediately",
    checkpoints: mockCheckpointsHeadline,
  },
];

const mockSuggestions: ChronicleSuggestion[] = [
  {
    title: "Headline is hiding your value",
    element: "Your Hero Headline",
    observation: "Your headline says what you do, not why it matters. Visitors don't know what makes you different.",
    prediction: {
      metric: "bounce_rate",
      direction: "down",
      range: "8-15%",
      friendlyText: "More visitors stick around",
    },
    suggestedFix: "Ship faster. Know when your copy breaks.",
    impact: "high",
  },
  {
    title: "CTA lacks urgency",
    element: "Primary CTA Button",
    observation: "\"Get Started\" is generic. No indication of what happens next or why to act now.",
    prediction: {
      metric: "conversion_rate",
      direction: "up",
      range: "5-10%",
      friendlyText: "More signups",
    },
    suggestedFix: "Try it free — takes 30 seconds",
    impact: "medium",
  },
  {
    title: "Social proof below fold",
    element: "Customer Logos Section",
    observation: "Customer logos are buried 3 screens down. Most visitors never see them.",
    prediction: {
      metric: "time_on_page",
      direction: "up",
      range: "10-20%",
      friendlyText: "More engagement",
    },
    suggestedFix: "Move logos directly below the hero",
    impact: "medium",
  },
];

const mockCorrelation: Correlation = {
  hasEnoughData: true,
  insights: "The CTA copy change correlates strongly with improved conversion rates. The headline change likely contributed to reduced bounce rate.",
  metrics: [
    {
      name: "conversion_rate",
      friendlyName: "Conversion Rate",
      before: 3.2,
      after: 3.79,
      change: "+18.4%",
      assessment: "improved",
    },
    {
      name: "bounce_rate",
      friendlyName: "Bounce Rate",
      before: 42.1,
      after: 39.5,
      change: "-6.2%",
      assessment: "improved",
    },
    {
      name: "time_on_page",
      friendlyName: "Time on Page",
      before: 47,
      after: 49,
      change: "+4.3%",
      assessment: "neutral",
    },
  ],
};

const mockObservations = [
  {
    changeId: "val-1",
    text: "The CTA copy shift from 'Get Started' to 'Try it free' removed the biggest friction point. Visitors now see a clear, low-commitment next step. The 18.4% lift is consistent with what we see when generic CTAs get specific.",
  },
  {
    changeId: "val-2",
    text: "The headline change moved from describing the product to describing the outcome. Bounce rate dropped because visitors immediately understand the value proposition. This is a durable improvement.",
  },
];

const mockChangesSummary: ChangesSummary = {
  verdict: "Your CTA is converting better. The headline change helped too.",
  changes: mockChanges,
  suggestions: mockSuggestions,
  correlation: mockCorrelation,
  progress: {
    validated: 2,
    watching: 1,
    open: 3,
    validatedItems: mockValidatedItems,
    watchingItems: mockWatchingItems,
    openItems: mockSuggestions.map((s, i) => ({
      id: `open-${i}`,
      element: s.element,
      title: s.title,
      impact: s.impact,
    })),
  },
  running_summary:
    "xyz.io has been tracked for 30 days across 20 scans. Two changes have paid off: the CTA copy update drove an 18% conversion lift, and the headline rewrite reduced bounce by 6%. The integration strip expansion is still being measured. Overall, the page is trending in the right direction with clear wins from copy improvements.",
  observations: mockObservations,
};

const mockHypothesisMap: Record<string, string> = {
  "val-1": "Testing action-oriented CTA with lower commitment",
  "val-2": "Testing outcome-focused language instead of generic growth copy",
};

const mockCheckpointMap: Record<string, { checkpoint_id: string; horizon_days: number }> = {
  "val-1": { checkpoint_id: "cp-1c", horizon_days: 30 },
  "val-2": { checkpoint_id: "cp-2b", horizon_days: 14 },
};

// ============================================
// Demo Page
// ============================================

export default function DemoAnalysisPage() {
  return (
    <main className="min-h-screen text-text-primary">
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10">
        {/* Breadcrumb — matches real analysis page */}
        <div className="pt-6 pb-3 flex items-center gap-2 text-sm text-text-muted">
          <Link href="/demo" className="hover:text-text-primary transition-colors">
            Your pages
          </Link>
          <span>/</span>
          <span className="text-text-primary">xyz.io</span>
          <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
            Demo
          </span>
        </div>

        <ChronicleLayout
          changesSummary={mockChangesSummary}
          deployContext={mockDeployContext}
          baselineDate={mockBaselineDate}
          triggerType="deploy"
          screenshotUrl="/demo-screenshot.jpg"
          mobileScreenshotUrl="/demo-screenshot-mobile.jpg"
          pageUrl="https://xyz.io"
          createdAt={mockCreatedAt}
          scanNumber={16}
          totalScans={20}
          pageId="demo"
          currentAnalysisId="demo"
          metricFocus="conversions"
          hypothesisMap={mockHypothesisMap}
          checkpointMap={mockCheckpointMap}
        />

        {/* CTA Section */}
        <section className="py-10">
          <div className="glass-card-elevated p-6 md:p-8 max-w-[540px] mx-auto text-center">
            <h2
              className="text-2xl md:text-3xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Want this for your site?
            </h2>
            <p className="text-base text-text-secondary mt-2 mb-6">
              Track your pages, see what changes, and know if your updates actually helped.
            </p>
            <Link href="/" className="btn-primary inline-block">
              Try it free
            </Link>
            <p className="text-sm text-text-muted mt-4">
              Free for one page. No credit card.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
