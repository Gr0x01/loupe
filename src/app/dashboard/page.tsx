"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import ShareModal from "@/components/ShareModal";
import { PageLoader } from "@/components/PageLoader";
import type { DashboardPageData, DetectedChange } from "@/lib/types/analysis";
import { getDomain, timeAgo } from "@/lib/utils/url";
import { usePages, useChanges, isUnauthorizedError } from "@/lib/hooks/use-data";
import { ToastProvider, useToast } from "@/components/Toast";
import {
  EmptyOnboardingState,
  HypothesisPrompt,
} from "@/components/dashboard";

// ─── Types ───────────────────────────────────────────────────

interface UserLimits {
  current: number;
  max: number;
  bonusPages: number;
}

type PageStatus = "stable" | "attention" | "watching" | "scanning";

// ─── Metric Focus Badge Colors ───────────────────────────────

const FOCUS_COLORS: Record<string, { bg: string; text: string }> = {
  signups: { bg: "var(--emerald-subtle)", text: "var(--emerald)" },
  conversions: { bg: "var(--violet-subtle)", text: "var(--violet)" },
  "bounce rate": { bg: "var(--amber-subtle)", text: "var(--amber)" },
  "time on page": { bg: "var(--blue-subtle)", text: "var(--blue)" },
  pageviews: { bg: "var(--blue-subtle)", text: "var(--blue)" },
};

// ─── Helpers ─────────────────────────────────────────────────

function getPageStatus(page: DashboardPageData): PageStatus {
  if (
    page.last_scan?.status === "processing" ||
    page.last_scan?.status === "pending"
  ) {
    return "scanning";
  }
  if (page.attention_status.needs_attention) {
    return page.attention_status.reason === "recent_change"
      ? "watching"
      : "attention";
  }
  return "stable";
}

function getStatusText(page: DashboardPageData, status: PageStatus): string {
  switch (status) {
    case "scanning":
      return "Scanning now";
    case "attention":
    case "watching":
      return page.attention_status.headline || "Needs attention";
    default:
      return page.last_scan?.created_at
        ? `Stable · ${timeAgo(page.last_scan.created_at)}`
        : "No scans yet";
  }
}

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

// ─── Modals ──────────────────────────────────────────────────

function AddPageModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, name: string) => void;
  loading: boolean;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onSubmit(url, name);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card-elevated p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Add a page
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              URL
            </label>
            <input
              type="text"
              inputMode="url"
              placeholder="https://yoursite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-glass w-full"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Name (optional)
            </label>
            <input
              type="text"
              placeholder="My homepage"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-glass w-full"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || !url}
            >
              {loading ? "Adding..." : "Add page"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─── Dashboard Components ────────────────────────────────────

function StatPill({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      className="text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

function StatsBar({
  pages,
  winCount,
  onAddClick,
  isAtLimit,
}: {
  pages: DashboardPageData[];
  winCount: number;
  onAddClick: () => void;
  isAtLimit: boolean;
}) {
  const attentionCount = pages.filter(
    (p) => getPageStatus(p) === "attention"
  ).length;
  const watchingCount = pages.filter(
    (p) => getPageStatus(p) === "watching"
  ).length;

  // Find most recent scan time
  const lastScanTime = pages.reduce<string | null>((latest, p) => {
    if (!p.last_scan?.created_at) return latest;
    if (!latest) return p.last_scan.created_at;
    return p.last_scan.created_at > latest ? p.last_scan.created_at : latest;
  }, null);

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1
          className="text-2xl sm:text-3xl font-bold text-[var(--ink-900)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your pages
        </h1>
        <p className="text-sm text-[var(--ink-500)] mt-1">
          {pages.length} page{pages.length !== 1 ? "s" : ""}
          {lastScanTime ? ` · Last scanned ${timeAgo(lastScanTime)}` : ""}
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
        {watchingCount > 0 && (
          <StatPill
            label={`${watchingCount} watching`}
            bg="var(--amber-subtle)"
            color="var(--amber)"
          />
        )}
        {winCount > 0 && (
          <StatPill
            label={`${winCount} win${winCount !== 1 ? "s" : ""}`}
            bg="var(--emerald-subtle)"
            color="var(--emerald)"
          />
        )}
        <button
          onClick={onAddClick}
          className="btn-primary text-sm px-4 py-2 ml-1"
        >
          {isAtLimit ? "Unlock more" : "Add page"}
        </button>
      </div>
    </div>
  );
}

function ProofBanner({
  changes,
  cumulativeImprovement,
  highlightId,
}: {
  changes: (DetectedChange & { domain?: string })[];
  cumulativeImprovement: number;
  highlightId?: string;
}) {
  if (changes.length === 0) return null;

  const improvementText =
    cumulativeImprovement >= 1
      ? `Your metrics are up ${Math.round(cumulativeImprovement)}%`
      : `${changes.length} validated win${changes.length !== 1 ? "s" : ""}`;

  return (
    <section className="v2-proof-banner mb-10">
      <div className="mb-5">
        <span
          className="text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full inline-block mb-3"
          style={{
            background: "var(--emerald-subtle)",
            color: "var(--emerald)",
          }}
        >
          Your results
        </span>
        <h2
          className="text-2xl sm:text-3xl font-bold text-[var(--ink-900)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {improvementText}
        </h2>
        {changes.length > 1 && cumulativeImprovement >= 1 && (
          <p className="text-sm text-[var(--ink-500)] mt-1">
            {changes.length} validated win{changes.length !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {changes.slice(0, 4).map((change) => (
          <WinCard
            key={change.id}
            change={change}
            highlight={change.id === highlightId}
          />
        ))}
      </div>

      {changes.length > 4 && (
        <p className="mt-4 text-center text-sm text-[var(--ink-500)]">
          + {changes.length - 4} more win{changes.length - 4 !== 1 ? "s" : ""}
        </p>
      )}
    </section>
  );
}

function WinCard({
  change,
  highlight,
}: {
  change: DetectedChange & { domain?: string };
  highlight?: boolean;
}) {
  const metric = getPrimaryMetric(change);
  const linkHref = change.first_detected_analysis_id
    ? `/analysis/${change.first_detected_analysis_id}?highlight=correlation`
    : "/dashboard";

  return (
    <Link
      href={linkHref}
      className={`v2-win-card block ${highlight ? "result-card-highlight" : ""}`}
    >
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
        <span className="mx-2 text-[var(--ink-300)]">→</span>
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
    </Link>
  );
}

function StatusDot({ status }: { status: PageStatus }) {
  const colors: Record<PageStatus, string> = {
    stable: "bg-[var(--emerald)]",
    attention: "bg-[var(--coral)]",
    watching: "bg-[var(--amber)]",
    scanning: "bg-[var(--amber)]",
  };
  return (
    <span
      className={`v2-row-dot ${colors[status]} ${status === "scanning" ? "v2-row-dot-pulse" : ""}`}
    />
  );
}

function PageRow({
  page,
}: {
  page: DashboardPageData;
}) {
  const status = getPageStatus(page);
  const statusText = getStatusText(page, status);
  const displayName = page.name || getDomain(page.url);
  const domain = getDomain(page.url);
  const focusColor = page.metric_focus
    ? FOCUS_COLORS[page.metric_focus] || {
        bg: "var(--blue-subtle)",
        text: "var(--blue)",
      }
    : null;

  const href = page.last_scan?.id
    ? `/analysis/${page.last_scan.id}`
    : `/pages/${page.id}`;

  const statusColorClass: Record<PageStatus, string> = {
    stable: "v2-row-status-stable",
    attention: "v2-row-status-attention",
    watching: "v2-row-status-watching",
    scanning: "v2-row-status-scanning",
  };

  return (
    <Link
      href={href}
      className={`v2-page-row group ${status === "attention" ? "v2-page-row-attention" : ""}`}
    >
      <StatusDot status={status} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--ink-900)] truncate">
            {displayName}
          </span>
          {focusColor && (
            <span
              className="text-[0.625rem] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 hidden sm:inline"
              style={{ background: focusColor.bg, color: focusColor.text }}
            >
              {page.metric_focus}
            </span>
          )}
        </div>
        <span
          className="text-xs text-[var(--ink-300)] truncate block"
          style={{ fontFamily: "var(--font-geist-mono, monospace)" }}
        >
          {domain}
        </span>
      </div>

      <span className={`v2-row-status ${statusColorClass[status]}`}>
        {statusText}
      </span>

      <svg
        className="w-4 h-4 text-[var(--ink-300)] flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5l7 7-7 7"
        />
      </svg>
    </Link>
  );
}

function PageList({
  pages,
  onAddClick,
  isAtLimit,
}: {
  pages: DashboardPageData[];
  onAddClick: () => void;
  isAtLimit: boolean;
}) {
  // Sort: attention first, then watching, then scanning, then stable
  const sortOrder: Record<PageStatus, number> = {
    attention: 0,
    watching: 1,
    scanning: 2,
    stable: 3,
  };
  const sorted = [...pages].sort(
    (a, b) => sortOrder[getPageStatus(a)] - sortOrder[getPageStatus(b)]
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2
          className="zone-header"
          style={{ textTransform: "none" }}
        >
          All pages
        </h2>
        <span className="zone-count">
          {pages.length} page{pages.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="v2-page-list">
        {sorted.map((page) => (
          <PageRow key={page.id} page={page} />
        ))}
      </div>

      <button onClick={onAddClick} className="v2-add-page-row">
        <svg
          className="w-4 h-4 text-[var(--ink-300)]"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        <span>
          {isAtLimit ? "Share to unlock more pages" : "Watch another page"}
        </span>
      </button>
    </section>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // SWR hooks
  const {
    data: pagesData,
    error: pagesError,
    isLoading: pagesLoading,
    mutate: mutatePages,
  } = usePages();
  const { data: changesData } = useChanges();

  // Derived state
  const pages = pagesData?.pages || [];
  const allChanges = changesData?.changes || [];
  const results = allChanges.filter((c) => c.status === "validated");
  const resultsStats = changesData?.stats || {
    totalValidated: 0,
    totalRegressed: 0,
    cumulativeImprovement: 0,
  };

  const { toastError } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [userLimits, setUserLimits] = useState<UserLimits>({
    current: 0,
    max: 1,
    bonusPages: 0,
  });
  const highlightWinId = searchParams.get("win") || undefined;
  const rawHypothesisId = searchParams.get("hypothesis");
  const hypothesisChangeId =
    rawHypothesisId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      rawHypothesisId
    )
      ? rawHypothesisId
      : undefined;
  const [hypothesisDismissed, setHypothesisDismissed] = useState(false);
  const autoLinkAttempted = useRef(false);
  const pendingAnalysisRef = useRef<string | null>(null);

  // Auto-link a pending anonymous audit from localStorage
  useEffect(() => {
    if (pagesLoading || autoLinkAttempted.current) return;
    if (pages.length > 0) return;

    autoLinkAttempted.current = true;
    try {
      const raw = localStorage.getItem("loupe_pending_audit");
      if (!raw) return;
      const {
        analysisId: pendingId,
        url,
        ts,
      } = JSON.parse(raw) as {
        analysisId: string;
        url: string;
        ts?: number;
      };
      if (!url || (ts && Date.now() - ts > 30 * 60 * 1000)) {
        localStorage.removeItem("loupe_pending_audit");
        return;
      }
      localStorage.removeItem("loupe_pending_audit");
      handleAddPage(url, "", pendingId);
    } catch {
      /* ignore parse errors */
    }
  }, [pagesLoading, pages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect on auth error
  useEffect(() => {
    if (isUnauthorizedError(pagesError)) {
      router.push("/login?redirect=/dashboard");
    }
  }, [pagesError, router]);

  // Update limits when pages change
  useEffect(() => {
    setUserLimits((prev) => ({ ...prev, current: pages.length }));
  }, [pages.length]);

  const handleAddPage = async (
    url: string,
    name: string,
    existingAnalysisId?: string
  ): Promise<string | void> => {
    setAddLoading(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          name: name || undefined,
          existingAnalysisId: existingAnalysisId || undefined,
        }),
      });

      const data = await res.json();

      if (res.status === 403 && data.error === "page_limit_reached") {
        setUserLimits({
          current: data.current,
          max: data.max,
          bonusPages: 0,
        });
        setShowAddModal(false);
        setShowShareModal(true);
        return;
      }

      if (res.status === 409) {
        router.push(`/pages/${data.id}`);
        return;
      }

      if (!res.ok) {
        toastError("Failed to add page");
        return;
      }

      setShowAddModal(false);

      if (pages.length === 0 && data.page?.id && data.analysisId) {
        pendingAnalysisRef.current = data.analysisId;
        return data.page.id;
      }

      await mutatePages();

      if (data.analysisId) {
        router.push(`/analysis/${data.analysisId}`);
        return;
      }
    } catch {
      toastError("Failed to add page");
    } finally {
      setAddLoading(false);
    }
  };

  const handleShareSuccess = () => {
    setUserLimits((prev) => ({
      ...prev,
      max: prev.max + 1,
      bonusPages: prev.bonusPages + 1,
    }));
  };

  const handleAddClick = () => {
    if (pages.length >= userLimits.max && userLimits.max > 0) {
      setShowShareModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  const isAtLimit = pages.length >= userLimits.max && userLimits.max > 0;

  const fetchError =
    pagesError && !isUnauthorizedError(pagesError) ? "Failed to load pages" : "";

  if (pagesLoading) {
    return <PageLoader />;
  }

  if (fetchError && pages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-text-secondary text-lg">{fetchError}</p>
          <button onClick={() => mutatePages()} className="btn-primary mt-4">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Empty state: onboarding */}
        {pages.length === 0 ? (
          <EmptyOnboardingState
            onAddPage={handleAddPage}
            loading={addLoading}
            onMetricFocusDone={() => {
              if (pendingAnalysisRef.current) {
                router.push(`/analysis/${pendingAnalysisRef.current}`);
              } else {
                mutatePages();
              }
            }}
          />
        ) : (
          <>
            <StatsBar
              pages={pages}
              winCount={resultsStats.totalValidated}
              onAddClick={handleAddClick}
              isAtLimit={isAtLimit}
            />

            {/* Hypothesis prompt (from email link) */}
            {hypothesisChangeId &&
              !hypothesisDismissed && (
                <div className="mb-8">
                  <HypothesisPrompt
                    changeId={hypothesisChangeId}
                    elementName="an element"
                    onSubmit={() => {
                      setHypothesisDismissed(true);
                      const url = new URL(window.location.href);
                      url.searchParams.delete("hypothesis");
                      router.replace(url.pathname + url.search, {
                        scroll: false,
                      });
                    }}
                    onDismiss={() => {
                      setHypothesisDismissed(true);
                      const url = new URL(window.location.href);
                      url.searchParams.delete("hypothesis");
                      router.replace(url.pathname + url.search, {
                        scroll: false,
                      });
                    }}
                  />
                </div>
              )}

            {/* Proof banner — validated wins */}
            <ProofBanner
              changes={results}
              cumulativeImprovement={resultsStats.cumulativeImprovement}
              highlightId={highlightWinId}
            />

            {/* Page list */}
            <PageList
              pages={pages}
              onAddClick={handleAddClick}
              isAtLimit={isAtLimit}
            />
          </>
        )}
      </div>

      <AddPageModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddPage}
        loading={addLoading}
      />

      <ShareModal
        key={showShareModal ? "open" : "closed"}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSuccess={handleShareSuccess}
      />

    </>
  );
}

export default function DashboardPage() {
  return (
    <ToastProvider>
      <Suspense fallback={<PageLoader />}>
        <DashboardContent />
      </Suspense>
    </ToastProvider>
  );
}
