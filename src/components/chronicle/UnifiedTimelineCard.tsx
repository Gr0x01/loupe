"use client";

import type { TimelineItemType } from "@/lib/types/analysis";

interface UnifiedTimelineCardProps {
  id: string;
  type: TimelineItemType;
  element: string;
  title: string;
  description?: string;
  before?: string;
  after?: string;
  change?: string;
  friendlyText?: string;
  daysRemaining?: number;
  detectedAt?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStatusLabel(type: TimelineItemType, daysRemaining?: number): string {
  switch (type) {
    case "validated":
      return "Correlation confirmed";
    case "regressed":
      return "Metrics declined";
    case "watching":
      return daysRemaining
        ? `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left`
        : "Collecting data";
    default:
      return "";
  }
}

function getTypeLabel(type: TimelineItemType): string {
  switch (type) {
    case "validated":
      return "Validated";
    case "regressed":
      return "Regressed";
    case "watching":
      return "Watching";
    default:
      return "Changed";
  }
}

export function UnifiedTimelineCard({
  id,
  type,
  element,
  title,
  before,
  after,
  change,
  friendlyText,
  daysRemaining,
  detectedAt,
}: UnifiedTimelineCardProps) {
  const statusLabel = getStatusLabel(type, daysRemaining);
  const typeLabel = getTypeLabel(type);
  const formattedDate = formatDate(detectedAt);
  const hasDiff = Boolean(before && after);

  return (
    <article
      id={id}
      className={`unified-timeline-card unified-timeline-card-${type}`}
    >
      <div className="unified-timeline-card-header">
        <div className="unified-timeline-card-heading">
          <span className="unified-timeline-card-element">{element}</span>
          {title && (
            <p className="unified-timeline-card-title">{title}</p>
          )}
        </div>
        <div className="unified-timeline-card-meta">
          <span className={`unified-timeline-card-state unified-timeline-card-state-${type}`}>
            {typeLabel}
          </span>
          {change && (
            <span
              className={`unified-timeline-card-delta ${
                type === "validated"
                  ? "unified-timeline-card-delta-positive"
                  : "unified-timeline-card-delta-negative"
              }`}
            >
              {type === "validated" ? "\u2191" : "\u2193"}
              {change.replace(/[+-]/, "")}
            </span>
          )}
          {type === "watching" && (
            <span className="unified-timeline-card-watching-indicator">
              <span className="unified-timeline-card-pulse" />
            </span>
          )}
        </div>
      </div>

      {hasDiff && (
        <div className="unified-timeline-card-diff">
          <span className="unified-timeline-card-before">&ldquo;{before}&rdquo;</span>
          <span className="unified-timeline-card-arrow">&rarr;</span>
          <span className="unified-timeline-card-after">&ldquo;{after}&rdquo;</span>
        </div>
      )}

      {friendlyText && (
        <p className="unified-timeline-card-friendly">{friendlyText}</p>
      )}

      <div className="unified-timeline-card-footer">
        {formattedDate && (
          <span className="unified-timeline-card-date">Changed {formattedDate}</span>
        )}
        {statusLabel && (
          <>
            {formattedDate && <span className="unified-timeline-card-separator">&middot;</span>}
            <span className="unified-timeline-card-status">{statusLabel}</span>
          </>
        )}
      </div>
    </article>
  );
}
