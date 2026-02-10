"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";

interface PageInfo {
  id: string;
  url: string;
  name: string | null;
  scan_frequency: string;
  repo_id: string | null;
  created_at: string;
}

interface ScanHistory {
  id: string;
  scan_number: number;
  status: string;
  progress: {
    validated?: number;
    watching?: number;
    open?: number;
    // Legacy fields for compatibility
    total_original?: number;
    resolved?: number;
    persisting?: number;
    new_issues?: number;
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


function ScanCard({ scan }: { scan: ScanHistory }) {
  const isComplete = scan.status === "complete";
  const isPending = scan.status === "pending" || scan.status === "processing";

  // Get progress values (support both new and legacy formats)
  const validated = scan.progress?.validated ?? scan.progress?.resolved ?? 0;
  const open = scan.progress?.open ?? scan.progress?.new_issues ?? 0;

  return (
    <Link
      href={`/analysis/${scan.id}`}
      className={`glass-card p-5 block transition-all duration-200 ${
        isComplete ? "hover:shadow-lg hover:-translate-y-0.5" : "opacity-70"
      } group`}
    >
      <div className="flex items-center gap-5">
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
          {scan.progress && (validated > 0 || open > 0) && (
            <div className="mt-2 flex items-center gap-3 text-sm">
              {validated > 0 && (
                <span className="text-score-high font-medium">
                  {validated} validated
                </span>
              )}
              {open > 0 && (
                <span className="text-score-low font-medium">
                  {open} open
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

  if (loading) {
    return <PageLoader />;
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
  const latestComplete = history.find((s) => s.status === "complete");

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

      {/* Page Info Card */}
      <div className="glass-card p-4 sm:p-5 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
          {/* Page info row */}
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Page info */}
            <div className="min-w-0 flex-1">
              <h1
                className="text-lg sm:text-xl font-semibold text-text-primary truncate"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {displayName}
              </h1>
              <p className="text-xs text-text-muted font-mono mt-1 truncate">
                {page.url}
              </p>
            </div>
          </div>

          {/* Scan button */}
          <button
            onClick={handleRescan}
            disabled={rescanLoading || hasPendingScan}
            className="btn-secondary text-sm py-2.5 px-4 whitespace-nowrap flex-shrink-0 w-full sm:w-auto flex items-center justify-center gap-2"
          >
            {rescanLoading || hasPendingScan ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {rescanLoading ? "Starting..." : "Scanning..."}
              </>
            ) : (
              "Scan again"
            )}
          </button>
        </div>

        {/* Status row - inside card */}
        <div className="mt-4 pt-4 border-t border-border-subtle flex items-center justify-between gap-4">
          {/* Integrations - dots on mobile, pills on desktop */}
          <div className="flex items-center gap-2 sm:gap-2">
            {/* PostHog */}
            {integrations.posthog.connected ? (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(26,140,91,0.08)] text-score-high border border-[rgba(26,140,91,0.15)]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">PostHog</span>
              </span>
            ) : (
              <Link href="/settings/integrations" className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-muted border border-dashed border-border-subtle hover:border-accent hover:text-accent transition-colors">
                <span>+</span>
                <span className="hidden sm:inline">PostHog</span>
              </Link>
            )}
            {/* GitHub */}
            {integrations.github.connected ? (
              <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(26,140,91,0.08)] text-score-high border border-[rgba(26,140,91,0.15)]">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="hidden sm:inline">GitHub</span>
              </span>
            ) : (
              <Link href="/settings/integrations" className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-surface text-text-muted border border-dashed border-border-subtle hover:border-accent hover:text-accent transition-colors">
                <span>+</span>
                <span className="hidden sm:inline">GitHub</span>
              </Link>
            )}
          </div>

        </div>
      </div>

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
