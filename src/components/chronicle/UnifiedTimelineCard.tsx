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
  const formattedDate = formatDate(detectedAt);

  return (
    <div
      id={id}
      className={`unified-timeline-card unified-timeline-card-${type}`}
    >
      {/* Left border is handled by CSS class */}

      {/* Header: Element name + change badge (if validated/regressed) */}
      <div className="unified-timeline-card-header">
        <span className="unified-timeline-card-element">{element}</span>
        {change && (
          <span
            className={`unified-timeline-card-change ${
              type === "validated"
                ? "unified-timeline-card-change-positive"
                : "unified-timeline-card-change-negative"
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

      {/* Before/After (for changes with text diff) */}
      {before && after && (
        <div className="unified-timeline-card-diff">
          <span className="unified-timeline-card-before">&ldquo;{before}&rdquo;</span>
          <span className="unified-timeline-card-arrow">&rarr;</span>
          <span className="unified-timeline-card-after">&ldquo;{after}&rdquo;</span>
        </div>
      )}

      {/* Title (description of change) */}
      {title && !before && !after && (
        <p className="unified-timeline-card-title">{title}</p>
      )}

      {/* Friendly text for validated items */}
      {friendlyText && (
        <p className="unified-timeline-card-friendly">{friendlyText}</p>
      )}

      {/* Footer: Date + status */}
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
    </div>
  );
}
