import type { DetectedChange, DashboardPageData } from "@/lib/types/analysis";
import {
  ResultsZone,
  AttentionZone,
  WatchingZone,
} from "@/components/dashboard";

// ============================================
// Mock Data for xyz.io Demo
// ============================================

const mockChanges: (DetectedChange & { domain?: string })[] = [
  {
    id: "demo-1",
    page_id: "demo-page-1",
    user_id: "demo-user",
    element: "Your Headline",
    element_type: "headline",
    scope: "element",
    before_value: "We help you grow",
    after_value: "Ship faster. Convert more.",
    first_detected_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    status: "validated",
    correlation_metrics: {
      metrics: [
        { name: "conversions", before: 2.1, after: 2.6, change_percent: 23, assessment: "improved" },
      ],
      overall_assessment: "improved",
    },
    correlation_unlocked_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    domain: "xyz.io",
  },
  {
    id: "demo-2",
    page_id: "demo-page-2",
    user_id: "demo-user",
    element: "CTA Button",
    element_type: "cta",
    scope: "element",
    before_value: "Learn More",
    after_value: "Start Free Trial →",
    first_detected_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    status: "validated",
    correlation_metrics: {
      metrics: [
        { name: "bounce_rate", before: 58, after: 51, change_percent: -12, assessment: "improved" },
      ],
      overall_assessment: "improved",
    },
    correlation_unlocked_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    domain: "xyz.io",
  },
  {
    id: "demo-3",
    page_id: "demo-page-1",
    user_id: "demo-user",
    element: "Social Proof Section",
    element_type: "social-proof",
    scope: "section",
    before_value: "No testimonials",
    after_value: "3 customer logos + quote",
    first_detected_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    status: "validated",
    correlation_metrics: {
      metrics: [
        { name: "time_on_page", before: 45, after: 62, change_percent: 38, assessment: "improved" },
      ],
      overall_assessment: "improved",
    },
    correlation_unlocked_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    domain: "xyz.io",
  },
];

const mockStats = {
  totalValidated: 3,
  totalRegressed: 0,
  cumulativeImprovement: 31,
};

const mockAttentionPages: DashboardPageData[] = [
  {
    id: "demo-attn-1",
    url: "https://xyz.io/pricing",
    name: "Pricing",
    scan_frequency: "daily",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    last_scan: {
      id: "demo-scan-1",
      status: "completed",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    attention_status: {
      needs_attention: true,
      reason: "high_impact_suggestions",
      severity: "low",
      headline: "1 suggestion worth checking",
      subheadline: "Your pricing page could use a clearer CTA",
    },
  },
];

const mockWatchingPages: DashboardPageData[] = [
  {
    id: "demo-watch-1",
    url: "https://xyz.io",
    name: "Homepage",
    scan_frequency: "daily",
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    last_scan: {
      id: "demo-scan-2",
      status: "completed",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    attention_status: {
      needs_attention: false,
      reason: null,
      severity: null,
      headline: null,
      subheadline: null,
    },
  },
  {
    id: "demo-watch-2",
    url: "https://xyz.io/features",
    name: "Features",
    scan_frequency: "daily",
    created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
    last_scan: {
      id: "demo-scan-3",
      status: "completed",
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    attention_status: {
      needs_attention: false,
      reason: null,
      severity: null,
      headline: null,
      subheadline: null,
    },
  },
  {
    id: "demo-watch-3",
    url: "https://xyz.io/about",
    name: "About",
    scan_frequency: "weekly",
    created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
    last_scan: {
      id: "demo-scan-4",
      status: "completed",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    attention_status: {
      needs_attention: false,
      reason: null,
      severity: null,
      headline: null,
      subheadline: null,
    },
  },
];

// ============================================
// Demo Page
// ============================================

export default function DemoPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Demo Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1
              className="text-3xl sm:text-4xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Demo Dashboard
            </h1>
            <span className="px-2 py-0.5 text-xs font-medium bg-accent/10 text-accent rounded-full">
              xyz.io
            </span>
          </div>
          <p className="text-text-secondary">
            See what Loupe looks like with real wins tracked
          </p>
        </div>
        <a
          href="/"
          className="btn-primary w-full sm:w-auto text-center"
        >
          Try it free
        </a>
      </div>

      {/* Results Zone - Validated Wins */}
      <ResultsZone changes={mockChanges} stats={mockStats} demo />

      {/* Attention Zone - Low severity item */}
      <AttentionZone pages={mockAttentionPages} demo />

      {/* Watching Zone - Stable pages */}
      <WatchingZone pages={mockWatchingPages} demo />

      {/* Link to see a scan */}
      <div className="mt-8 pt-8 border-t border-border-subtle text-center">
        <p className="text-text-muted text-sm mb-3">
          Want to see what a scan looks like?
        </p>
        <a
          href="/demo/analysis"
          className="text-accent font-medium hover:underline"
        >
          View demo scan report →
        </a>
      </div>
    </div>
  );
}
