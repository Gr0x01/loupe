"use client";

import Link from "next/link";
import type {
  ChangesSummary,
  DeployContextAPI,
  Change,
  WatchingItem,
  ValidatedItem,
  ChronicleSuggestion,
} from "@/lib/types/analysis";
import { ChronicleLayout } from "@/components/chronicle";

// ============================================
// Mock Data for xyz.io Demo Analysis
// ============================================

const mockBaselineDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

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
    daysNeeded: 7,
    firstDetectedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
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
  },
  {
    id: "val-2",
    element: "Hero Headline",
    title: "New headline reduced bounce",
    metric: "bounce_rate",
    change: "-6.2%",
    friendlyText: "Fewer visitors leaving immediately",
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

const mockChangesSummary: ChangesSummary = {
  verdict: "Your CTA is converting better. The headline change helped too.",
  changes: mockChanges,
  suggestions: mockSuggestions,
  correlation: null,
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
  running_summary: "",
};

// ============================================
// Demo Scan Picker (non-interactive)
// ============================================

function DemoScanPicker() {
  return (
    <div className="analysis-context-picker">
      <span>Scan 16 of 20</span>
      <svg
        className="w-3.5 h-3.5 text-text-muted"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ============================================
// Demo Page
// ============================================

export default function DemoAnalysisPage() {
  const domain = "xyz.io";

  return (
    <main className="min-h-screen text-text-primary">
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10">
        <div className="analysis-context-shell pt-6 pb-3">
          <div className="analysis-context-bar">
            <div className="analysis-context-main">
              <div className="analysis-context-domain-row">
                <p className="analysis-context-label">Tracked page</p>
              </div>
              <div className="analysis-context-domain-row">
                <h1
                  className="analysis-context-domain"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {domain}
                </h1>
                <span className="analysis-context-badge">Demo</span>
              </div>
              <div className="analysis-context-meta">
                <DemoScanPicker />
                <Link
                  href="/demo"
                  className="analysis-context-link"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>

            <div className="analysis-context-thumb-corner">
              <img
                src="/demo-screenshot.png"
                alt="Page screenshot"
                className="analysis-context-thumb-img"
              />
            </div>

            <span className="analysis-context-date">Feb 10</span>
          </div>
        </div>

        <ChronicleLayout
          changesSummary={mockChangesSummary}
          deployContext={mockDeployContext}
          baselineDate={mockBaselineDate}
          triggerType="deploy"
          screenshotUrl="/demo-screenshot.png"
          pageUrl="https://xyz.io"
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
              Free forever. No credit card.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
