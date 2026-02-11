"use client";

import Link from "next/link";
import type { DetectedChange } from "@/lib/types/analysis";
import { formatDistanceToNow } from "@/lib/utils/date";
import { track } from "@/lib/analytics/track";

interface ResultCardProps {
  change: DetectedChange & { domain?: string };
  highlight?: boolean;
}

/**
 * Truncate text with ellipsis
 */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "...";
}

/**
 * Get the primary metric from correlation data
 */
function getPrimaryMetric(change: DetectedChange): {
  change: string;
  name: string;
  isPositive: boolean;
} | null {
  const metrics = change.correlation_metrics?.metrics;
  if (!metrics || metrics.length === 0) return null;

  // Find the most significant metric (by change %)
  const sorted = [...metrics].sort(
    (a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent)
  );
  const primary = sorted[0];
  if (!primary) return null;

  // Format percentage
  const sign = primary.change_percent > 0 ? "+" : "";
  const pct = `${sign}${Math.round(primary.change_percent)}%`;

  // Friendly metric name
  const nameMap: Record<string, string> = {
    bounce_rate: "bounce rate",
    pageviews: "pageviews",
    unique_visitors: "visitors",
    conversions: "conversions",
    time_on_page: "time on page",
  };
  const name = nameMap[primary.name] || primary.name;

  // Is this a positive outcome?
  // For bounce_rate, lower is better
  const isPositive =
    primary.name === "bounce_rate"
      ? primary.change_percent < 0
      : primary.change_percent > 0;

  return { change: pct, name, isPositive };
}

export function ResultCard({ change, highlight = false }: ResultCardProps) {
  const isValidated = change.status === "validated";
  const metric = getPrimaryMetric(change);

  // Time since correlation was unlocked
  const timeAgo = change.correlation_unlocked_at
    ? formatDistanceToNow(new Date(change.correlation_unlocked_at))
    : "";

  // Link to the analysis that first detected the change
  const linkHref = change.first_detected_analysis_id
    ? `/analysis/${change.first_detected_analysis_id}?highlight=correlation`
    : `/dashboard`;

  const handleClick = () => {
    track("correlation_viewed", {
      domain: change.domain || "unknown",
      status: isValidated ? "validated" : "regressed",
    });
  };

  return (
    <Link
      href={linkHref}
      onClick={handleClick}
      className={`result-card ${isValidated ? "result-card-validated" : "result-card-regressed"} ${highlight ? "result-card-highlight" : ""}`}
    >
      {/* Element label */}
      <p className="result-card-element">{change.element}</p>

      {/* Before/after change */}
      <p className="result-card-change">
        <span className="before">{truncate(change.before_value, 30)}</span>
        <span className="arrow">→</span>
        <span>{truncate(change.after_value, 30)}</span>
      </p>

      {/* Metric result */}
      {metric && (
        <div className="result-card-metric">
          <span
            className={`result-card-percent ${metric.isPositive ? "result-card-percent-up" : "result-card-percent-down"}`}
          >
            {metric.isPositive ? "▲" : "▼"} {metric.change}
          </span>
          <span className="result-card-detail">
            {metric.name}
            {timeAgo && ` · ${timeAgo}`}
          </span>
        </div>
      )}
    </Link>
  );
}
