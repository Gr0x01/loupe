import Link from "next/link";
import type { DetectedChange, ChangeCheckpointSummary } from "@/lib/types/analysis";

// ============================================
// Mock Data for xyz.io Demo
// ============================================

const demoCheckpoints1: ChangeCheckpointSummary[] = [
  { id: "dcp-1a", horizon_days: 7, assessment: "improved", confidence: 0.82, reasoning: "Conversions up 18% in first week.", data_sources: ["posthog"], computed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "dcp-1b", horizon_days: 14, assessment: "improved", confidence: 0.91, reasoning: "Lift sustained at +23% through week two.", data_sources: ["posthog"], computed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
];

const demoCheckpoints2: ChangeCheckpointSummary[] = [
  { id: "dcp-2a", horizon_days: 7, assessment: "improved", confidence: 0.79, reasoning: "Bounce rate down 8% in first week.", data_sources: ["posthog"], computed_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "dcp-2b", horizon_days: 14, assessment: "improved", confidence: 0.85, reasoning: "Sustained -12% bounce rate.", data_sources: ["posthog"], computed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  { id: "dcp-2c", horizon_days: 30, assessment: "improved", confidence: 0.88, reasoning: "Durable improvement at 30 days.", data_sources: ["posthog"], computed_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
];

const demoCheckpoints3: ChangeCheckpointSummary[] = [
  { id: "dcp-3a", horizon_days: 7, assessment: "improved", confidence: 0.74, reasoning: "Time on page up 25% in first week.", data_sources: ["posthog"], computed_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() },
];

const mockChanges: (DetectedChange & { domain?: string; checkpoints?: ChangeCheckpointSummary[] })[] = [
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
    hypothesis: "Testing outcome-focused language instead of generic growth copy",
    observation_text: "The new headline directly addresses curiosity about impact, which aligns with your signups focus.",
    checkpoints: demoCheckpoints1,
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
    hypothesis: "Testing action-oriented CTA with lower commitment",
    observation_text: "Lower commitment CTA reduced friction for first-time visitors.",
    checkpoints: demoCheckpoints2,
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
    observation_text: "Adding social proof increased trust signals, keeping visitors engaged longer.",
    checkpoints: demoCheckpoints3,
  },
];

type PageStatus = "stable" | "attention" | "watching" | "scanning";

interface DemoPage {
  id: string;
  name: string;
  path: string;
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
    path: "/",
    metricFocus: "signups",
    lastScan: "2h ago",
    lastScanId: "demo-scan-2",
    status: "stable",
  },
  {
    id: "p2",
    name: "Pricing",
    path: "/pricing",
    metricFocus: "conversions",
    lastScan: "2h ago",
    lastScanId: "demo-scan-1",
    status: "attention",
    statusDetail: "1 suggestion worth checking",
  },
  {
    id: "p3",
    name: "Features",
    path: "/features",
    metricFocus: "signups",
    lastScan: "2h ago",
    lastScanId: "demo-scan-3",
    status: "stable",
  },
  {
    id: "p4",
    name: "About",
    path: "/about",
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
  direction: "up" | "down";
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

  const pct = `${Math.round(Math.abs(primary.change_percent))}%`;
  const direction: "up" | "down" = primary.change_percent >= 0 ? "up" : "down";

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

  return { change: pct, direction, name, isPositive };
}

// ─── Components ──────────────────────────────────────────────

function StatsBar() {
  const attentionCount = DEMO_PAGES.filter((p) => p.status === "attention").length;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-[var(--ink-900)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Demo Dashboard
        </h1>
        <p className="text-sm text-[var(--ink-500)] mt-1">
          xyz.io · {DEMO_PAGES.length} pages · Last scanned 2 hours ago
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
        <Link href="/" className="btn-primary text-sm px-4 py-2 ml-1">
          Try it free
        </Link>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mockChanges.map((change) => (
          <WinCard key={change.id} change={change} />
        ))}
      </div>
    </section>
  );
}

const DEMO_HORIZONS = [7, 14, 30, 60, 90] as const;

function DemoChips({
  checkpoints,
  compact = false,
}: {
  checkpoints: ChangeCheckpointSummary[];
  compact?: boolean;
}) {
  const sortedCheckpoints = [...checkpoints].sort(
    (a, b) => a.horizon_days - b.horizon_days
  );
  const completedHorizons = new Set(sortedCheckpoints.map((cp) => cp.horizon_days));
  const upcomingCount = DEMO_HORIZONS.filter((h) => !completedHorizons.has(h)).length;
  const chipColor = (a: string) =>
    a === "improved" ? "v2-checkpoint-chip-improved"
    : a === "regressed" ? "v2-checkpoint-chip-regressed"
    : a === "inconclusive" ? "v2-checkpoint-chip-inconclusive"
    : "v2-checkpoint-chip-neutral";
  return (
    <div className={`v2-checkpoint-chips-wrap ${compact ? "v2-checkpoint-chips-wrap-compact" : ""}`}>
      <div className="v2-checkpoint-chips">
        {sortedCheckpoints.map((cp) => (
          <span
            key={`${cp.id}-${cp.horizon_days}`}
            className={`v2-checkpoint-chip ${chipColor(cp.assessment)}`}
            title={cp.reasoning || `${cp.assessment} at ${cp.horizon_days}d`}
          >
            {cp.horizon_days}d
          </span>
        ))}
      </div>
      {upcomingCount > 0 && (
        <span className="v2-checkpoint-upcoming" title={`${upcomingCount} upcoming checkpoints`}>
          +{upcomingCount}
        </span>
      )}
    </div>
  );
}

function WinCard({ change }: { change: DetectedChange & { domain?: string; checkpoints?: ChangeCheckpointSummary[] } }) {
  const metric = getPrimaryMetric(change);

  return (
    <div className="v2-win-card">
      <div className="v2-win-card-header">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
          {change.element}
        </p>
        {change.checkpoints && change.checkpoints.length > 0 && (
          <DemoChips checkpoints={change.checkpoints} compact />
        )}
      </div>

      <div className="v2-win-change mt-2.5 text-sm sm:text-base leading-snug">
        <span
          className="v2-win-change-old"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {truncate(change.before_value, 40)}
        </span>
        <span className="v2-win-change-arrow">&rarr;</span>
        <span
          className="v2-win-change-new"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {truncate(change.after_value, 40)}
        </span>
      </div>

      {metric && (
        <div className="v2-win-metric-row mt-3">
          <span
            className="v2-win-metric text-xl sm:text-2xl font-bold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <span className={`v2-win-metric-arrow ${metric.isPositive ? "v2-win-metric-arrow-good" : "v2-win-metric-arrow-bad"}`}>
              {metric.direction === "up" ? "▲" : "▼"}
            </span>{" "}
            {metric.change}
          </span>
          <span className="text-xs sm:text-sm text-[var(--ink-500)]">{metric.name}</span>
        </div>
      )}

      {change.hypothesis && (
        <p className="mt-2 text-xs text-[var(--ink-500)] line-clamp-1">
          <span className="font-semibold text-[var(--ink-400)]">Test:</span>{" "}
          &ldquo;{truncate(change.hypothesis, 72)}&rdquo;
        </p>
      )}

      {change.observation_text && (
        <p className="mt-1.5 text-sm text-[var(--ink-700)] leading-relaxed line-clamp-2">
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
