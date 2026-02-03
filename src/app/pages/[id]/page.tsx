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

interface ConnectedRepo {
  id: string;
  full_name: string;
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

  if (completedScans.length < 2) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-text-muted">Run at least 2 scans to see the trend.</p>
      </div>
    );
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
    <div className="glass-card p-6">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-4">
        Score trend
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[400px]">
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

function ScanCard({ scan, pageUrl }: { scan: ScanHistory; pageUrl: string }) {
  const isComplete = scan.status === "complete";
  const isPending = scan.status === "pending" || scan.status === "processing";

  return (
    <Link
      href={`/analysis/${scan.id}`}
      className={`glass-card p-5 block transition-all duration-150 ${
        isComplete ? "hover:border-[rgba(91,46,145,0.15)]" : "opacity-70"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-semibold text-text-primary">
              {formatDate(scan.created_at)}
            </span>
            <span className="text-sm text-text-muted">
              {timeAgo(scan.created_at)}
            </span>
            {scan.is_baseline && (
              <span className="text-xs font-medium text-accent bg-accent-subtle px-2 py-0.5 rounded-full">
                Baseline
              </span>
            )}
          </div>

          {/* Progress info */}
          {scan.progress && (
            <div className="mt-2 flex items-center gap-3 text-sm">
              {scan.progress.resolved > 0 && (
                <span className="text-score-high">
                  {scan.progress.resolved} resolved
                </span>
              )}
              {scan.progress.new_issues > 0 && (
                <span className="text-score-low">
                  {scan.progress.new_issues} new
                </span>
              )}
              {scan.progress.persisting > 0 && (
                <span className="text-text-muted">
                  {scan.progress.persisting} persisting
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

        {/* Score */}
        {isComplete && scan.score !== null && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-2xl font-bold ${scoreColor(scan.score)}`}
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {scan.score}
            </span>
            {scan.score_delta !== null && scan.score_delta !== 0 && (
              <span
                className={`text-sm font-semibold ${
                  scan.score_delta > 0 ? "text-score-high" : "text-score-low"
                }`}
              >
                {scan.score_delta > 0 ? "+" : ""}
                {scan.score_delta}
              </span>
            )}
          </div>
        )}

        {/* Arrow */}
        <svg
          className="w-5 h-5 text-text-muted flex-shrink-0"
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

function FrequencySelector({
  current,
  onChange,
  loading,
}: {
  current: string;
  onChange: (freq: string) => void;
  loading: boolean;
}) {
  const options = [
    { value: "weekly", label: "Weekly" },
    { value: "daily", label: "Daily" },
    { value: "manual", label: "Manual" },
  ];

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-muted">Scan frequency:</span>
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="input-glass text-sm py-1.5 px-3 pr-8 appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%238E8EA0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundPosition: "right 8px center",
          backgroundSize: "16px 16px",
          backgroundRepeat: "no-repeat",
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function RepoSelector({
  currentRepoId,
  repos,
  onChange,
  loading,
}: {
  currentRepoId: string | null;
  repos: ConnectedRepo[];
  onChange: (repoId: string | null) => void;
  loading: boolean;
}) {
  if (repos.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-text-muted">Auto-scan:</span>
        <Link
          href="/settings/integrations"
          className="text-sm text-accent hover:text-accent-hover transition-colors"
        >
          Connect GitHub
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-text-muted">Auto-scan:</span>
      <select
        value={currentRepoId || ""}
        onChange={(e) => onChange(e.target.value || null)}
        disabled={loading}
        className="input-glass text-sm py-1.5 px-3 pr-8 appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%238E8EA0' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E")`,
          backgroundPosition: "right 8px center",
          backgroundSize: "16px 16px",
          backgroundRepeat: "no-repeat",
        }}
      >
        <option value="">Not linked</option>
        {repos.map((repo) => (
          <option key={repo.id} value={repo.id}>
            {repo.full_name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function PageTimelinePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rescanLoading, setRescanLoading] = useState(false);
  const [freqLoading, setFreqLoading] = useState(false);
  const [repoLoading, setRepoLoading] = useState(false);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [connectedRepos, setConnectedRepos] = useState<ConnectedRepo[]>([]);

  // Fetch connected repos
  useEffect(() => {
    const fetchRepos = async () => {
      try {
        const res = await fetch("/api/integrations");
        if (res.ok) {
          const data = await res.json();
          if (data.github?.repos) {
            setConnectedRepos(data.github.repos);
          }
        }
      } catch {
        // Ignore - repos just won't show
      }
    };
    fetchRepos();
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
      if (result.id) {
        // Refresh to show new scan
        await fetchData();
      }
    } catch {
      setError("Failed to start re-scan");
    } finally {
      setRescanLoading(false);
    }
  };

  const handleFrequencyChange = async (freq: string) => {
    if (!data) return;

    setFreqLoading(true);
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scan_frequency: freq }),
      });

      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                page: { ...prev.page, scan_frequency: freq },
              }
            : null
        );
      }
    } catch {
      // Ignore
    } finally {
      setFreqLoading(false);
    }
  };

  const handleRepoChange = async (repoId: string | null) => {
    if (!data) return;

    setRepoLoading(true);
    try {
      const res = await fetch(`/api/pages/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo_id: repoId }),
      });

      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                page: { ...prev.page, repo_id: repoId },
              }
            : null
        );
      }
    } catch {
      // Ignore
    } finally {
      setRepoLoading(false);
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
    } catch {
      // Ignore
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

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1
            className="text-4xl font-bold text-text-primary mb-2"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {displayName}
          </h1>
          <p className="text-text-muted font-mono text-sm">{page.url}</p>
          <p className="text-text-secondary mt-2">
            {total_scans} scan{total_scans !== 1 ? "s" : ""} since{" "}
            {formatDate(page.created_at)}
          </p>
        </div>

        {/* Score trend chart */}
        <div className="mb-8">
          <ScoreTrendChart history={history} />
        </div>

        {/* Settings bar */}
        <div className="glass-card p-5 mb-8">
          <div className="flex flex-col gap-4">
            {/* Row 1: Scan settings and rescan button */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <FrequencySelector
                  current={page.scan_frequency}
                  onChange={handleFrequencyChange}
                  loading={freqLoading}
                />
                <RepoSelector
                  currentRepoId={page.repo_id}
                  repos={connectedRepos}
                  onChange={handleRepoChange}
                  loading={repoLoading}
                />
              </div>
              <button
                onClick={handleRescan}
                disabled={rescanLoading || hasPendingScan}
                className="btn-primary"
              >
                {rescanLoading
                  ? "Starting scan..."
                  : hasPendingScan
                    ? "Scan in progress..."
                    : "Re-scan now"}
              </button>
            </div>

            {/* Divider */}
            <div className="border-t border-[rgba(0,0,0,0.06)]" />

            {/* Row 2: Leaderboard toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Show on leaderboard</span>
                <Link
                  href="/leaderboard"
                  className="text-xs text-text-muted hover:text-accent transition-colors"
                >
                  View leaderboard
                </Link>
              </div>
              <button
                onClick={() => handleLeaderboardToggle(!page.hide_from_leaderboard)}
                disabled={leaderboardLoading}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                  page.hide_from_leaderboard
                    ? "bg-[rgba(0,0,0,0.1)]"
                    : "bg-accent"
                }`}
                aria-label={page.hide_from_leaderboard ? "Enable leaderboard" : "Disable leaderboard"}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${
                    page.hide_from_leaderboard ? "translate-x-0" : "translate-x-5"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Scan history */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-4">
            Scan history
          </p>
          {history.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <p className="text-text-muted">No scans yet. Click Re-scan to start.</p>
            </div>
          ) : (
            history.map((scan) => (
              <ScanCard key={scan.id} scan={scan} pageUrl={page.url} />
            ))
          )}
        </div>
    </div>
  );
}
