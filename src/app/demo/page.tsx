import Link from "next/link";
import type { DetectedChange } from "@/lib/types/analysis";

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
    observation_text: "The new headline directly addresses curiosity about impact, which aligns with your signups focus.",
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
    observation_text: "Lower commitment CTA reduced friction for first-time visitors.",
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
    observation_text: "Adding social proof increased trust signals, keeping visitors engaged longer.",
  },
];

type PageStatus = "stable" | "attention" | "watching" | "scanning";

interface DemoPage {
  id: string;
  name: string;
  domain: string;
  metricFocus: string;
  lastScan: string;
  lastScanId: string;
  status: PageStatus;
  statusDetail?: string;
}

const DEMO_PAGES: DemoPage[] = [
  {
    id: "p1",
    name: "Homepage",
    domain: "xyz.io",
    metricFocus: "signups",
    lastScan: "2h ago",
    lastScanId: "demo-scan-2",
    status: "stable",
  },
  {
    id: "p2",
    name: "Pricing",
    domain: "xyz.io/pricing",
    metricFocus: "conversions",
    lastScan: "2h ago",
    lastScanId: "demo-scan-1",
    status: "attention",
    statusDetail: "1 suggestion worth checking",
  },
  {
    id: "p3",
    name: "Features",
    domain: "xyz.io/features",
    metricFocus: "signups",
    lastScan: "2h ago",
    lastScanId: "demo-scan-3",
    status: "stable",
  },
  {
    id: "p4",
    name: "About",
    domain: "xyz.io/about",
    metricFocus: "bounce rate",
    lastScan: "1d ago",
    lastScanId: "demo-scan-4",
    status: "stable",
  },
];

// ─── Metric Focus Badge Colors ───────────────────────────────

const FOCUS_COLORS: Record<string, { bg: string; text: string }> = {
  signups: { bg: "var(--emerald-subtle)", text: "var(--emerald)" },
  conversions: { bg: "var(--violet-subtle)", text: "var(--violet)" },
  "bounce rate": { bg: "var(--amber-subtle)", text: "var(--amber)" },
  "time on page": { bg: "var(--blue-subtle)", text: "var(--blue)" },
};

// ─── Helpers ─────────────────────────────────────────────────

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "...";
}

function getPrimaryMetric(change: DetectedChange): {
  change: string;
  name: string;
  isPositive: boolean;
} | null {
  const metrics = change.correlation_metrics?.metrics;
  if (!metrics || metrics.length === 0) return null;

  const sorted = [...metrics].sort(
    (a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent)
  );
  const primary = sorted[0];
  if (!primary) return null;

  const sign = primary.change_percent > 0 ? "+" : "";
  const pct = `${sign}${Math.round(primary.change_percent)}%`;

  const nameMap: Record<string, string> = {
    bounce_rate: "bounce rate",
    pageviews: "pageviews",
    unique_visitors: "visitors",
    conversions: "conversions",
    time_on_page: "time on page",
  };
  const name = nameMap[primary.name] || primary.name;

  const isPositive =
    primary.name === "bounce_rate"
      ? primary.change_percent < 0
      : primary.change_percent > 0;

  return { change: pct, name, isPositive };
}

// ─── Components ──────────────────────────────────────────────

function StatsBar() {
  const attentionCount = DEMO_PAGES.filter((p) => p.status === "attention").length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1
            className="text-2xl sm:text-3xl font-bold text-[var(--ink-900)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Demo Dashboard
          </h1>
          <span className="px-2 py-0.5 text-xs font-medium bg-[var(--coral-subtle)] text-[var(--coral)] rounded-full">
            xyz.io
          </span>
        </div>
        <p className="text-sm text-[var(--ink-500)] mt-1">
          {DEMO_PAGES.length} pages · Last scanned 2 hours ago
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {attentionCount > 0 && (
          <StatPill
            label={`${attentionCount} needs attention`}
            bg="var(--coral-subtle)"
            color="var(--coral)"
          />
        )}
        <StatPill
          label="3 wins"
          bg="var(--emerald-subtle)"
          color="var(--emerald)"
        />
        <a href="/" className="btn-primary text-sm px-4 py-2 ml-1">
          Try it free
        </a>
      </div>
    </div>
  );
}

function StatPill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

function ProofBanner() {
  return (
    <section className="v2-proof-banner mb-10">
      <div className="mb-5">
        <span
          className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3"
          style={{ background: "var(--emerald-subtle)", color: "var(--emerald)" }}
        >
          Your results
        </span>
        <h2
          className="text-2xl sm:text-3xl font-bold text-[var(--ink-900)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your metrics are up 31%
        </h2>
        <p className="text-sm text-[var(--ink-500)] mt-1">
          3 validated wins
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {mockChanges.map((change) => (
          <WinCard key={change.id} change={change} />
        ))}
      </div>
    </section>
  );
}

function WinCard({ change }: { change: DetectedChange & { domain?: string } }) {
  const metric = getPrimaryMetric(change);

  return (
    <div className="v2-win-card">
      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-500)]">
        {change.element}
      </p>
      {change.domain && (
        <p className="text-xs text-[var(--ink-300)] mt-0.5">{change.domain}</p>
      )}

      <div className="mt-3 text-sm sm:text-base leading-relaxed">
        <span
          className="text-[var(--ink-300)] line-through"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {truncate(change.before_value, 40)}
        </span>
        <span className="mx-2 text-[var(--ink-300)]">&rarr;</span>
        <span
          className="text-[var(--ink-900)] font-medium"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {truncate(change.after_value, 40)}
        </span>
      </div>

      {metric && (
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className="text-xl sm:text-2xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: metric.isPositive ? "var(--emerald)" : "var(--danger)",
            }}
          >
            {metric.isPositive ? "▲" : "▼"} {metric.change}
          </span>
          <span className="text-sm text-[var(--ink-500)]">{metric.name}</span>
        </div>
      )}

      {change.observation_text && (
        <p className="mt-2 text-sm text-[var(--ink-700)] italic leading-relaxed line-clamp-2">
          {change.observation_text}
        </p>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: PageStatus }) {
  const colors: Record<PageStatus, string> = {
    stable: "bg-[var(--emerald)]",
    attention: "bg-[var(--coral)]",
    watching: "bg-[var(--amber)]",
    scanning: "bg-[var(--amber)]",
  };
  return <span className={`v2-row-dot ${colors[status]}`} />;
}

function PageList() {
  const sortOrder: Record<PageStatus, number> = {
    attention: 0,
    watching: 1,
    scanning: 2,
    stable: 3,
  };
  const sorted = [...DEMO_PAGES].sort(
    (a, b) => sortOrder[a.status] - sortOrder[b.status]
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="zone-header" style={{ textTransform: "none" }}>All pages</h2>
        <span className="zone-count">
          {DEMO_PAGES.length} pages
        </span>
      </div>

      <div className="v2-page-list">
        {sorted.map((page) => (
          <PageRow key={page.id} page={page} />
        ))}
      </div>
    </section>
  );
}

function PageRow({ page }: { page: DemoPage }) {
  const focusColor = FOCUS_COLORS[page.metricFocus] || {
    bg: "var(--blue-subtle)",
    text: "var(--blue)",
  };

  const statusText =
    page.status === "attention"
      ? page.statusDetail || "Needs attention"
      : `Stable · ${page.lastScan}`;

  const statusColorClass: Record<PageStatus, string> = {
    stable: "v2-row-status-stable",
    attention: "v2-row-status-attention",
    watching: "v2-row-status-watching",
    scanning: "v2-row-status-scanning",
  };

  return (
    <div
      className={`v2-page-row ${page.status === "attention" ? "v2-page-row-attention" : ""}`}
    >
      <StatusDot status={page.status} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--ink-900)] truncate">
            {page.name}
          </span>
          <span
            className="text-[0.625rem] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:inline"
            style={{ background: focusColor.bg, color: focusColor.text }}
          >
            {page.metricFocus}
          </span>
        </div>
        <span
          className="text-xs text-[var(--ink-300)] truncate block"
          style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
        >
          {page.domain}
        </span>
      </div>

      <span className={`v2-row-status ${statusColorClass[page.status]}`}>
        {statusText}
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────

export default function DemoPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <StatsBar />
      <ProofBanner />
      <PageList />

      {/* Link to demo scan */}
      <div className="mt-8 pt-8 border-t border-[var(--line-subtle)] text-center">
        <p className="text-[var(--ink-500)] text-sm mb-3">
          Want to see what a scan looks like?
        </p>
        <Link
          href="/demo/analysis"
          className="text-[var(--signal)] font-medium hover:underline"
        >
          View demo scan report &rarr;
        </Link>
      </div>
    </div>
  );
}
