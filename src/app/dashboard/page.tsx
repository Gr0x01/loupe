"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { PageLoader } from "@/components/PageLoader";
import type { DashboardPageData, DetectedChange, ChangeCheckpointSummary } from "@/lib/types/analysis";
import { TIER_LIMITS, getEffectiveTier, type SubscriptionTier, type SubscriptionStatus } from "@/lib/permissions";
import { getPath, timeAgo } from "@/lib/utils/url";
import { formatOutcomeText } from "@/lib/utils/attribution";
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
}

type PageStatus = "stable" | "attention" | "watching" | "scanning";
type ClaimSuggestion = { label: string; url: string; reason?: string };

// ─── Metric Focus Badge Colors ───────────────────────────────

const FOCUS_COLORS: Record<string, { bg: string; text: string }> = {
  signups: { bg: "var(--emerald-subtle)", text: "var(--emerald)" },
  conversions: { bg: "var(--violet-subtle)", text: "var(--violet)" },
  "bounce rate": { bg: "var(--amber-subtle)", text: "var(--amber)" },
  "time on page": { bg: "var(--blue-subtle)", text: "var(--blue)" },
  pageviews: { bg: "var(--blue-subtle)", text: "var(--blue)" },
};

const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "pm.me",
  "hey.com",
  "yandex.com",
  "zoho.com",
]);

// ─── Helpers ─────────────────────────────────────────────────

function normalizeDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/^www\./, "");
}

function parseSuggestionUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProtocol);
    if (!["http:", "https:"].includes(parsed.protocol)) return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function parseSuggestionDomain(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const parsed = new URL(withProtocol);
    const normalized = normalizeDomain(parsed.hostname);
    if (!normalized || !normalized.includes(".")) return null;
    return normalized;
  } catch {
    return null;
  }
}

function getBusinessDomainFromEmail(email: string | null): string | null {
  if (!email) return null;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return null;
  const domain = normalizeDomain(parts[1]);
  if (!domain || !domain.includes(".")) return null;
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

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
  accountDomain,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, name: string) => void;
  loading: boolean;
  accountDomain: string | null;
}) {
  const [url, setUrl] = useState("");
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) { setUrl(""); setPath(""); setName(""); }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (accountDomain) {
      const trimmed = path.trim();
      const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
      onSubmit(`https://${accountDomain}${cleanPath}`, name);
    } else {
      if (!url) return;
      onSubmit(url, name);
    }
  };

  const isValid = accountDomain ? path.trim().length > 0 : url.trim().length > 0;

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
              {accountDomain ? "Path" : "URL"}
            </label>
            {accountDomain ? (
              <div className="flex items-stretch">
                <span className="inline-flex items-center px-3 text-sm text-[var(--ink-400)] bg-[var(--paper-1)] border border-r-0 border-[var(--line)] rounded-l-lg whitespace-nowrap">
                  https://{accountDomain}
                </span>
                <input
                  type="text"
                  placeholder="/pricing"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="input-glass w-full rounded-l-none"
                  required
                  autoFocus
                />
              </div>
            ) : (
              <input
                type="text"
                inputMode="url"
                placeholder="https://yoursite.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="input-glass w-full"
                required
              />
            )}
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
              disabled={loading || !isValid}
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
  accountDomain,
}: {
  pages: DashboardPageData[];
  winCount: number;
  onAddClick: () => void;
  isAtLimit: boolean;
  accountDomain: string | null;
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
          {accountDomain ? `${accountDomain} · ` : ""}
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

const V2_ALL_HORIZONS = [7, 14, 30, 60, 90] as const;

function V2CheckpointChips({
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
  const upcomingCount = V2_ALL_HORIZONS.filter((h) => !completedHorizons.has(h)).length;
  return (
    <div className={`v2-checkpoint-chips-wrap ${compact ? "v2-checkpoint-chips-wrap-compact" : ""}`}>
      <div className="v2-checkpoint-chips">
        {sortedCheckpoints.map((cp) => {
          const suffix = cp.assessment === "improved" ? "improved"
          : cp.assessment === "regressed" ? "regressed"
          : cp.assessment === "inconclusive" ? "inconclusive"
          : "neutral";
          return (
            <span
              key={`${cp.id}-${cp.horizon_days}`}
              className={`v2-checkpoint-chip v2-checkpoint-chip-${suffix}`}
              title={cp.reasoning || `${cp.assessment} at ${cp.horizon_days}d`}
            >
              {cp.horizon_days}d
            </span>
          );
        })}
      </div>
      {upcomingCount > 0 && (
        <span className="v2-checkpoint-upcoming" title={`${upcomingCount} upcoming checkpoints`}>
          +{upcomingCount}
        </span>
      )}
    </div>
  );
}

function WinCard({
  change,
  highlight,
}: {
  change: DetectedChange & { domain?: string; checkpoints?: ChangeCheckpointSummary[] };
  highlight?: boolean;
}) {
  const metric = getPrimaryMetric(change);
  const linkHref = change.first_detected_analysis_id
    ? `/analysis/${change.first_detected_analysis_id}?highlight=correlation`
    : "/dashboard";

  // Build confidence-banded attribution from checkpoint data
  const latestCp = change.checkpoints?.filter((cp) => cp.reasoning).pop();
  const cpMetrics = latestCp?.metrics_json?.metrics;
  // Filter metrics to those aligned with the overall status to avoid contradictions
  const winStatus = change.status === "regressed" ? "regressed" : "validated";
  const alignedAssessment = winStatus === "regressed" ? "regressed" : "improved";
  const aligned = cpMetrics?.filter((m) => m.assessment === alignedAssessment);
  const topCpMetric = aligned?.length
    ? aligned.reduce((best, m) => (Math.abs(m.change_percent) > Math.abs(best.change_percent) ? m : best), aligned[0])
    : undefined;
  const attributionText = latestCp ? formatOutcomeText({
    status: winStatus,
    confidence: latestCp.confidence,
    metricKey: topCpMetric?.name ?? null,
    direction: topCpMetric ? (topCpMetric.change_percent > 0 ? "up" : "down") : null,
    changePercent: topCpMetric ? Math.abs(topCpMetric.change_percent) : null,
  }) : null;
  const descriptionText = attributionText || change.observation_text || null;

  return (
    <Link
      href={linkHref}
      className={`v2-win-card block ${highlight ? "result-card-highlight" : ""}`}
    >
      <div className="v2-win-card-header">
        <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-[var(--ink-500)]">
          {change.element}
        </p>
        {change.checkpoints && change.checkpoints.length > 0 && (
          <V2CheckpointChips checkpoints={change.checkpoints} compact />
        )}
      </div>

      <div className="v2-win-change mt-2.5 text-sm sm:text-base leading-snug">
        <span
          className="v2-win-change-old"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {truncate(change.before_value, 40)}
        </span>
        <span className="v2-win-change-arrow">→</span>
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
            className="text-xl sm:text-2xl font-bold"
            style={{
              fontFamily: "var(--font-display)",
              color: metric.isPositive ? "var(--emerald)" : "var(--danger)",
            }}
          >
            {metric.isPositive ? "▲" : "▼"} {metric.change}
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

      {descriptionText && (
        <p className="mt-1.5 text-sm text-[var(--ink-700)] leading-relaxed line-clamp-2">
          {descriptionText}
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

const FOCUS_OPTIONS = [
  { label: "Signups", value: "signups" },
  { label: "Bounce Rate", value: "bounce rate" },
  { label: "Time on Page", value: "time on page" },
  { label: "Conversions", value: "conversions" },
];

function MetricFocusPopover({
  currentFocus,
  onSelect,
  onClose,
}: {
  currentFocus: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}) {
  const [customValue, setCustomValue] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="v2-focus-popover"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      {FOCUS_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          className={`v2-focus-popover-option ${currentFocus === opt.value ? "v2-focus-popover-option-active" : ""}`}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(opt.value); }}
        >
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: (FOCUS_COLORS[opt.value] || { text: "var(--blue)" }).text }}
          />
          {opt.label}
        </button>
      ))}
      {!showCustom ? (
        <button
          className="v2-focus-popover-option"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowCustom(true); }}
        >
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[var(--ink-300)]" />
          Custom...
        </button>
      ) : (
        <form
          className="flex gap-1.5 px-2 py-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const trimmed = customValue.trim();
            if (trimmed) onSelect(trimmed.toLowerCase());
          }}
        >
          <input
            autoFocus
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="e.g. downloads"
            className="text-xs px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper-0)] flex-1 min-w-0"
            maxLength={50}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="submit"
            className="text-xs font-semibold text-[var(--signal)] px-1.5"
            disabled={!customValue.trim()}
          >
            Save
          </button>
        </form>
      )}
      {currentFocus && (
        <>
          <div className="border-t border-[var(--line-subtle)] my-1" />
          <button
            className="v2-focus-popover-option text-[var(--ink-400)]"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelect(null); }}
          >
            Clear focus
          </button>
        </>
      )}
    </div>
  );
}

function PageRow({
  page,
  onMetricFocusChange,
}: {
  page: DashboardPageData;
  onMetricFocusChange?: (pageId: string, value: string | null) => void;
}) {
  const [showFocusPopover, setShowFocusPopover] = useState(false);
  const isOverLimit = page.over_limit;
  const status = isOverLimit ? "stable" as PageStatus : getPageStatus(page);
  const statusText = isOverLimit ? "Paused" : getStatusText(page, status);
  const displayName = page.name || getPath(page.url);
  const focusColor = page.metric_focus
    ? FOCUS_COLORS[page.metric_focus] || {
        bg: "var(--blue-subtle)",
        text: "var(--blue)",
      }
    : null;

  const href = isOverLimit
    ? "/pricing"
    : page.last_scan?.id
      ? `/analysis/${page.last_scan.id}`
      : `/pages/${page.id}`;

  const statusColorClass: Record<PageStatus, string> = {
    stable: "v2-row-status-stable",
    attention: "v2-row-status-attention",
    watching: "v2-row-status-watching",
    scanning: "v2-row-status-scanning",
  };

  const rowClass = `v2-page-row group ${status === "attention" ? "v2-page-row-attention" : ""} ${isOverLimit ? "opacity-50 cursor-default" : ""}`;

  const rowContent = (
    <>
      <StatusDot status={status} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--ink-900)] truncate">
            {displayName}
          </span>
          {!isOverLimit && (
            <span className="relative hidden sm:inline">
              {focusColor ? (
                <button
                  className="text-[0.625rem] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 hover:opacity-80 transition-opacity"
                  style={{ background: focusColor.bg, color: focusColor.text }}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFocusPopover(!showFocusPopover); }}
                >
                  {page.metric_focus}
                </button>
              ) : (
                <button
                  className="text-[0.625rem] font-medium px-1.5 py-0.5 rounded flex-shrink-0 text-[var(--ink-300)] opacity-0 group-hover:opacity-100 transition-opacity hover:text-[var(--signal)] hover:bg-[var(--signal-subtle)]"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowFocusPopover(!showFocusPopover); }}
                >
                  + focus
                </button>
              )}
              {showFocusPopover && onMetricFocusChange && (
                <MetricFocusPopover
                  currentFocus={page.metric_focus || null}
                  onSelect={(value) => {
                    onMetricFocusChange(page.id, value);
                    setShowFocusPopover(false);
                  }}
                  onClose={() => setShowFocusPopover(false)}
                />
              )}
            </span>
          )}
        </div>
      </div>

      {isOverLimit ? (
        <Link
          href="/pricing"
          className="text-xs font-semibold text-[var(--signal)] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          Upgrade
        </Link>
      ) : (
        <>
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
        </>
      )}
    </>
  );

  if (isOverLimit) {
    return <div className={rowClass} title="This page exceeds your plan's limit. Upgrade to resume scanning.">{rowContent}</div>;
  }

  return <Link href={href} className={rowClass}>{rowContent}</Link>;
}

function PageList({
  pages,
  onAddClick,
  isAtLimit,
  onMetricFocusChange,
}: {
  pages: DashboardPageData[];
  onAddClick: () => void;
  isAtLimit: boolean;
  onMetricFocusChange?: (pageId: string, value: string | null) => void;
}) {
  // Sort: attention first, then watching, then scanning, then stable
  const sortOrder: Record<PageStatus, number> = {
    attention: 0,
    watching: 1,
    scanning: 2,
    stable: 3,
  };
  const sorted = [...pages].sort((a, b) => {
    // Over-limit pages always sort to the bottom
    if (a.over_limit !== b.over_limit) return a.over_limit ? 1 : -1;
    return sortOrder[getPageStatus(a)] - sortOrder[getPageStatus(b)];
  });

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
          <PageRow key={page.id} page={page} onMetricFocusChange={onMetricFocusChange} />
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
          {isAtLimit ? "Upgrade to watch more pages" : "Watch another page"}
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

  const [accountDomain, setAccountDomain] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [pendingAuditUrl, setPendingAuditUrl] = useState<string | null>(null);
  const [pendingDomainUrl, setPendingDomainUrl] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [userLimits, setUserLimits] = useState<UserLimits>({
    current: 0,
    max: 1,
  });
  const highlightWinId = searchParams.get("win") || undefined;
  const suggestedDomainParam = searchParams.get("suggest_domain");
  const suggestedUrlParam = searchParams.get("suggest_url");
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

  const claimSuggestions = useMemo<ClaimSuggestion[]>(() => {
    const suggestions: ClaimSuggestion[] = [];
    const seen = new Set<string>();

    const addSuggestion = (url: string | null, label: string, reason?: string) => {
      const normalized = parseSuggestionUrl(url);
      if (!normalized || seen.has(normalized)) return;
      seen.add(normalized);
      suggestions.push({ url: normalized, label, reason });
    };

    if (pendingAuditUrl) {
      addSuggestion(
        pendingAuditUrl,
        "Recent audit page",
        "From the page you analyzed before signing in"
      );
    }

    if (pendingDomainUrl) {
      addSuggestion(
        pendingDomainUrl,
        "From your signup",
        "The site you entered when you signed up"
      );
    }

    if (suggestedUrlParam) {
      addSuggestion(
        suggestedUrlParam,
        "Picked from your signup flow",
        "Based on where you came from"
      );
    }

    const suggestedDomain = parseSuggestionDomain(suggestedDomainParam);
    if (suggestedDomain) {
      addSuggestion(
        `https://${suggestedDomain}`,
        `${suggestedDomain} homepage`,
        "From your signup email domain"
      );
      addSuggestion(`https://${suggestedDomain}/pricing`, `${suggestedDomain} pricing`);
    }

    const emailDomain = getBusinessDomainFromEmail(profileEmail);
    if (emailDomain && emailDomain !== suggestedDomain) {
      addSuggestion(
        `https://${emailDomain}`,
        `${emailDomain} homepage`,
        "From your account email"
      );
    }

    return suggestions.slice(0, 4);
  }, [pendingAuditUrl, pendingDomainUrl, profileEmail, suggestedDomainParam, suggestedUrlParam]);

  // Read pending domain from login page
  useEffect(() => {
    try {
      const raw = localStorage.getItem("loupe_pending_domain");
      if (!raw) return;
      localStorage.removeItem("loupe_pending_domain");
      setPendingDomainUrl(raw);
    } catch {
      /* ignore */
    }
  }, []);

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
      if (!url || (ts && Date.now() - ts > 24 * 60 * 60 * 1000)) {
        localStorage.removeItem("loupe_pending_audit");
        setPendingAuditUrl(null);
        return;
      }
      setPendingAuditUrl(url);
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

  // Fetch tier-based page limit on mount
  useEffect(() => {
    fetch("/api/profile")
      .then((res) => res.ok ? res.json() : null)
      .then((profile) => {
        if (!profile) return;
        const tier = getEffectiveTier(
          (profile.subscription_tier as SubscriptionTier) || "free",
          profile.subscription_status as SubscriptionStatus | null,
          profile.trial_ends_at
        );
        setUserLimits((prev) => ({ ...prev, max: TIER_LIMITS[tier].pages }));
        if (profile.email) setProfileEmail(profile.email);
        if (profile.account_domain) setAccountDomain(profile.account_domain);
      })
      .catch(() => {});
  }, []);

  // Update current count when pages change
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

      if (res.status === 403 && data.error === "domain_mismatch") {
        toastError(`All pages must be on ${data.account_domain}`);
        return;
      }

      if (res.status === 403 && data.error === "page_limit_reached") {
        setUserLimits({
          current: data.current,
          max: data.max,
        });
        setShowAddModal(false);
        router.push("/pricing");
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

      // Set accountDomain after first page creation (normalize www)
      if (!accountDomain && data.page?.url) {
        try { setAccountDomain(new URL(data.page.url).hostname.replace(/^www\./, "")); } catch {}
      }

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

  const handleAddClick = () => {
    if (pages.length >= userLimits.max && userLimits.max > 0) {
      router.push("/pricing");
    } else {
      setShowAddModal(true);
    }
  };

  const handleMetricFocusChange = async (pageId: string, value: string | null) => {
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric_focus: value }),
      });
      if (!res.ok) {
        toastError("Failed to update metric focus");
        return;
      }
      await mutatePages();
    } catch {
      toastError("Failed to update metric focus");
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
            claimSuggestions={claimSuggestions}
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
              accountDomain={accountDomain}
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
              onMetricFocusChange={handleMetricFocusChange}
            />
          </>
        )}
      </div>

      <AddPageModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddPage}
        loading={addLoading}
        accountDomain={accountDomain}
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
