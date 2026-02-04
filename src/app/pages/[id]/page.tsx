"use client";

import { useEffect, useState, useCallback, useId } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface PageInfo {
  id: string;
  url: string;
  name: string | null;
  scan_frequency: string;
  repo_id: string | null;
  hide_from_leaderboard: boolean;
  created_at: string;
}

interface ScanHistory {
  id: string;
  scan_number: number;
  status: string;
  score: number | null;
  score_delta: number | null;
  progress: {
    total_original: number;
    resolved: number;
    persisting: number;
    new_issues: number;
  } | null;
  created_at: string;
  is_baseline: boolean;
}

interface PageData {
  page: PageInfo;
  history: ScanHistory[];
  total_scans: number;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-score-high";
  if (score >= 60) return "text-score-mid";
  return "text-score-low";
}

function scoreCssColor(score: number): string {
  if (score >= 80) return "var(--score-high)";
  if (score >= 60) return "var(--score-mid)";
  return "var(--score-low)";
}

// Simple SVG line chart for score trend
function ScoreTrendChart({ history }: { history: ScanHistory[] }) {
  const chartId = useId();
  const completedScans = history
    .filter((s) => s.status === "complete" && s.score !== null)
    .slice(0, 10) // Last 10 scans
    .reverse(); // Oldest first

  // Don't render anything if < 2 scans - parent will show inline text
  if (completedScans.length < 2) {
    return null;
  }

  const scores = completedScans.map((s) => s.score!);
  const minScore = Math.max(0, Math.min(...scores) - 10);
  const maxScore = Math.min(100, Math.max(...scores) + 10);
  const range = maxScore - minScore || 1;

  const width = 300;
  const height = 120;
  const padding = { top: 10, right: 20, bottom: 30, left: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const points = completedScans.map((scan, i) => {
    const x = padding.left + (i / (completedScans.length - 1)) * chartWidth;
    const y = padding.top + chartHeight - ((scan.score! - minScore) / range) * chartHeight;
    return { x, y, scan };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  // Gradient fill area
  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartHeight} L ${points[0].x} ${padding.top + chartHeight} Z`;

  const latestScore = scores[scores.length - 1];
  const color = scoreCssColor(latestScore);

  return (
    <div className="glass-card p-4">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
        Score trend
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[360px]">
        <defs>
          <linearGradient id={`${chartId}-gradient`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area fill */}
        <path d={areaD} fill={`url(#${chartId}-gradient)`} />

        {/* Line */}
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Dots */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="white"
            stroke={color}
            strokeWidth="2"
          />
        ))}

        {/* Date labels */}
        {points.map((p, i) => (
          <text
            key={`label-${i}`}
            x={p.x}
            y={height - 5}
            textAnchor="middle"
            className="text-[0.625rem] fill-text-muted"
          >
            {formatDate(p.scan.created_at)}
          </text>
        ))}
      </svg>
    </div>
  );
}

function ScanCard({ scan }: { scan: ScanHistory }) {
  const isComplete = scan.status === "complete";
  const isPending = scan.status === "pending" || scan.status === "processing";

  return (
    <Link
      href={`/analysis/${scan.id}`}
      className={`glass-card p-5 block transition-all duration-200 ${
        isComplete ? "hover:shadow-lg hover:-translate-y-0.5" : "opacity-70"
      } group`}
    >
      <div className="flex items-center gap-5">
        {/* Score block - the anchor */}
        {isComplete && scan.score !== null && (
          <>
            <div className="flex-shrink-0 w-14 text-center">
              <p
                className={`text-3xl font-normal ${scoreColor(scan.score)}`}
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                {scan.score}
              </p>
              {scan.score_delta !== null && scan.score_delta !== 0 && (
                <div className={`flex items-center justify-center gap-0.5 mt-0.5 ${
                  scan.score_delta > 0 ? "text-score-high" : "text-score-low"
                }`}>
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                    {scan.score_delta > 0 ? (
                      <path d="M6 2L10 7H2L6 2Z" />
                    ) : (
                      <path d="M6 10L2 5H10L6 10Z" />
                    )}
                  </svg>
                  <span className="text-sm font-semibold">{Math.abs(scan.score_delta)}</span>
                </div>
              )}
            </div>

            {/* Vertical divider */}
            <div className="w-px h-10 bg-border-subtle flex-shrink-0" />
          </>
        )}

        {/* Content block */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">
              {formatDate(scan.created_at)}
            </span>
            <span className="text-xs text-text-muted">
              {timeAgo(scan.created_at)}
            </span>
            {scan.is_baseline && (
              <span className="text-xs font-medium text-accent bg-accent-subtle px-2 py-0.5 rounded-full">
                First scan
              </span>
            )}
          </div>

          {/* Progress info */}
          {scan.progress && (scan.progress.resolved > 0 || scan.progress.new_issues > 0) && (
            <div className="mt-2 flex items-center gap-3 text-sm">
              {scan.progress.resolved > 0 && (
                <span className="text-score-high font-medium">
                  {scan.progress.resolved} fixed
                </span>
              )}
              {scan.progress.new_issues > 0 && (
                <span className="text-score-low font-medium">
                  {scan.progress.new_issues} new
                </span>
              )}
            </div>
          )}

          {isPending && (
            <div className="mt-2 flex items-center gap-2">
              <div className="glass-spinner w-4 h-4" />
              <span className="text-sm text-text-muted">
                {scan.status === "processing" ? "Analyzing..." : "Queued"}
              </span>
            </div>
          )}

          {scan.status === "failed" && (
            <p className="mt-2 text-sm text-score-low">Scan failed</p>
          )}
        </div>

        {/* Chevron */}
        <svg
          className="w-5 h-5 text-text-muted flex-shrink-0 group-hover:text-accent group-hover:translate-x-0.5 transition-all duration-200"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M7 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </Link>
  );
}

interface IntegrationsState {
  github: { connected: boolean };
  posthog: { connected: boolean };
}

export default function PageTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rescanLoading, setRescanLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [integrations, setIntegrations] = useState<IntegrationsState>({
    github: { connected: false },
    posthog: { connected: false },
  });

  // Fetch integrations status
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        const res = await fetch("/api/integrations");
        if (res.ok) {
          const data = await res.json();
          setIntegrations({
            github: { connected: data.github?.connected || false },
            posthog: { connected: data.posthog?.connected || false },
          });
        }
      } catch (err) {
        console.warn("Failed to fetch integrations:", err);
      }
    };
    fetchIntegrations();
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/pages/${id}/history`);
      if (res.status === 401) {
        router.push("/login?redirect=/pages/" + id);
        return;
      }
      if (res.status === 404) {
        setError("Page not found");
        return;
      }
      if (!res.ok) {
        setError("Failed to load page");
        return;
      }
      const result = await res.json();
      setData(result);
    } catch {
      setError("Failed to load page");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll if there's a pending/processing scan
  useEffect(() => {
    if (!data) return;
    const hasPending = data.history.some(
      (s) => s.status === "pending" || s.status === "processing"
    );
    if (!hasPending) return;

    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [data, fetchData]);

  const handleRescan = async () => {
    if (!data || data.history.length === 0) return;

    setError(""); // Clear previous errors
    setRescanLoading(true);
    try {
      // Get the latest complete scan as parent
      const latestComplete = data.history.find((s) => s.status === "complete");
      if (!latestComplete) {
        // No complete scan, trigger a fresh analysis
        setError("No complete scan to compare against");
        setRescanLoading(false);
        return;
      }

      const res = await fetch("/api/rescan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentAnalysisId: latestComplete.id }),
      });

      if (res.status === 401) {
        router.push("/login?redirect=/pages/" + id);
        return;
      }

      const result = await res.json();

      if (!res.ok) {
        console.error("Rescan failed:", result.error);
        setError(result.error || "Failed to start re-scan");
        return;
      }

      if (result.id) {
        // Refresh to show new scan
        await fetchData();
      }
    } catch (err) {
      console.error("Rescan error:", err);
      setError("Failed to start re-scan");
    } finally {
      setRescanLoading(false);
    }
  };

  const handleLeaderboardToggle = async (hideFromLeaderboard: boolean) => {
    if (!data) return;

    setLeaderboardLoading(true);
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hide_from_leaderboard: hideFromLeaderboard }),
      });

      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                page: { ...prev.page, hide_from_leaderboard: hideFromLeaderboard },
              }
            : null
        );
      }
    } catch (err) {
      console.error("Failed to toggle leaderboard:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="glass-spinner mx-auto" />
          <p className="text-text-secondary mt-4">Loading page history...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-text-secondary text-lg">{error || "Page not found"}</p>
          <Link href="/dashboard" className="btn-primary mt-4 inline-block">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const { page, history, total_scans } = data;
  const displayName = page.name || getDomain(page.url);
  const hasPendingScan = history.some(
    (s) => s.status === "pending" || s.status === "processing"
  );
  const latestComplete = history.find((s) => s.status === "complete" && s.score !== null);
  const completedScansCount = history.filter((s) => s.status === "complete" && s.score !== null).length;
  const showTrendChart = completedScansCount >= 2;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4 pb-8">
      {/* Breadcrumb */}
      <Link
        href="/dashboard"
        className="text-sm text-text-muted hover:text-accent transition-colors inline-flex items-center gap-1 mb-6"
      >
        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M13 5l-5 5 5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Dashboard
      </Link>

      {/* Page Info Card with Score */}
      <div className="glass-card p-5 mb-4">
        {/* Mobile: stacked layout, Desktop: horizontal */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          {/* Score + Page info row */}
          <div className="flex items-center gap-4 sm:gap-5 flex-1 min-w-0">
            {/* Score */}
            {latestComplete && (
              <>
                <div className="flex-shrink-0 text-center">
                  <span
                    className={`text-4xl font-normal ${scoreColor(latestComplete.score!)}`}
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    {latestComplete.score}
                  </span>
                  <p className="text-xs text-text-muted mt-0.5">
                    {timeAgo(latestComplete.created_at)}
                  </p>
                </div>

                {/* Divider */}
                <div className="w-px h-12 bg-border-subtle flex-shrink-0" />
              </>
            )}

            {/* Page info */}
            <div className="min-w-0 flex-1">
              <h1
                className="text-lg sm:text-xl font-semibold text-text-primary truncate"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                {displayName}
              </h1>
              <p className="text-xs text-text-muted font-mono mt-1 truncate">
                {page.url}
              </p>
            </div>
          </div>

          {/* Scan button - full width on mobile */}
          <button
            onClick={handleRescan}
            disabled={rescanLoading || hasPendingScan}
            className="btn-secondary text-sm py-2 px-4 whitespace-nowrap flex-shrink-0 w-full sm:w-auto"
          >
            {rescanLoading
              ? "On it..."
              : hasPendingScan
                ? "Scanning..."
                : "Scan again"}
          </button>
        </div>
      </div>

      {/* Integration Pills */}
      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-8">
        {/* PostHog status */}
        {integrations.posthog.connected ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-secondary border border-border-subtle">
            <svg className="w-3 h-3 text-score-high" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            PostHog
          </span>
        ) : (
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-muted border border-dashed border-border-subtle hover:border-accent hover:text-accent transition-colors"
          >
            <span className="text-xs leading-none">+</span>
            PostHog
          </Link>
        )}

        {/* GitHub status */}
        {integrations.github.connected ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-secondary border border-border-subtle">
            <svg className="w-3 h-3 text-score-high" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            GitHub
          </span>
        ) : (
          <Link
            href="/settings/integrations"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-muted border border-dashed border-border-subtle hover:border-accent hover:text-accent transition-colors"
          >
            <span className="text-xs leading-none">+</span>
            GitHub
          </Link>
        )}

        {/* Leaderboard toggle */}
        <button
          onClick={() => handleLeaderboardToggle(!page.hide_from_leaderboard)}
          disabled={leaderboardLoading}
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium bg-surface border border-border-subtle text-text-secondary sm:ml-auto hover:border-accent-border transition-colors"
        >
          Leaderboard
          <span
            className={`relative w-7 h-4 rounded-full transition-colors duration-200 ${
              page.hide_from_leaderboard ? "bg-[rgba(0,0,0,0.1)]" : "bg-accent"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                page.hide_from_leaderboard ? "translate-x-0" : "translate-x-3"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Score trend chart or inline prompt */}
      {showTrendChart ? (
        <div className="mb-8">
          <ScoreTrendChart history={history} />
        </div>
      ) : completedScansCount === 1 ? (
        <p className="text-sm text-text-muted mb-8 text-center">
          One more scan and you&apos;ll see the trend.
        </p>
      ) : null}

      {/* Scan history */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
          Past scans
        </p>
        {history.length === 0 ? (
          <div className="glass-card p-6 text-center">
            <p className="text-text-muted">Waiting on your first scan.</p>
          </div>
        ) : (
          history.map((scan) => (
            <ScanCard key={scan.id} scan={scan} />
            ))
          )}
        </div>
    </div>
  );
}
