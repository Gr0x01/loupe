"use client";

import type { Change, ChronicleCorrelationMetric } from "@/lib/types/analysis";

function formatDate(dateStr: string) {
  if (dateStr === "this scan") return "Today";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // Fallback to raw string for invalid dates
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Get action verb based on scope
function getScopeLabel(scope?: "element" | "section" | "page"): { verb: string; badge?: string } {
  switch (scope) {
    case "page":
      return { verb: "redesigned", badge: "Major redesign" };
    case "section":
      return { verb: "overhauled", badge: "Section update" };
    default:
      return { verb: "updated" };
  }
}

// Determine bullet state based on correlation
function getBulletState(correlation?: ChronicleCorrelationMetric | null): "validated" | "watching" | "regressed" | "no-data" {
  if (!correlation) return "no-data";
  switch (correlation.assessment) {
    case "improved": return "validated";
    case "regressed": return "regressed";
    case "neutral": return "watching";
    default: return "no-data";
  }
}

interface TimelineEntryProps {
  change: Change;
  /** Single metric for element-level changes */
  correlation?: ChronicleCorrelationMetric | null;
  /** All metrics for aggregated (section/page) changes */
  allMetrics?: ChronicleCorrelationMetric[];
}

export function TimelineEntry({ change, correlation, allMetrics }: TimelineEntryProps) {
  const isAggregated = change.scope === "section" || change.scope === "page";

  // For aggregated changes, use allMetrics; for element-level, use single correlation
  const metricsToShow = isAggregated ? allMetrics : (correlation ? [correlation] : undefined);
  const hasMetrics = metricsToShow && metricsToShow.length > 0;

  // Determine overall assessment for bullet state
  const overallAssessment = hasMetrics
    ? metricsToShow.some(m => m.assessment === "regressed")
      ? "regressed"
      : metricsToShow.some(m => m.assessment === "improved")
        ? "improved"
        : "neutral"
    : null;

  const bulletState = getBulletState(overallAssessment ? { assessment: overallAssessment } as ChronicleCorrelationMetric : null);
  const { verb, badge } = getScopeLabel(change.scope);

  return (
    <div className="timeline-entry">
      {/* Left: bullet with connector line */}
      <div className="timeline-bullet-container">
        <div className={`timeline-bullet timeline-bullet-${bulletState}`} />
        <div className="timeline-connector" />
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0 pb-8">
        {/* Date + element + optional scope badge */}
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-sm font-semibold text-text-primary">
            {formatDate(change.detectedAt)}
          </span>
          <span className="text-text-muted">&mdash;</span>
          <span className="text-sm text-text-secondary">{change.element} {verb}</span>
          {badge && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 font-medium">
              {badge}
            </span>
          )}
        </div>

        {/* Before/after display - different layout for aggregated changes */}
        <div className="glass-card p-4">
          {isAggregated ? (
            // Aggregated: show description and state summary
            <div className="space-y-3">
              {change.description && (
                <p className="text-sm text-text-primary font-medium">{change.description}</p>
              )}
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-text-muted shrink-0">Before:</span>
                  <span className="text-text-secondary">{change.before}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-text-muted shrink-0">After:</span>
                  <span className="text-text-primary font-medium">{change.after}</span>
                </div>
              </div>
            </div>
          ) : (
            // Element-level: show inline before/after
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
              <span className="text-text-muted line-through">&ldquo;{change.before}&rdquo;</span>
              <span className="text-text-muted hidden sm:inline">&rarr;</span>
              <span className="text-text-primary font-medium">&ldquo;{change.after}&rdquo;</span>
            </div>
          )}

          {/* Correlation display */}
          {hasMetrics && (
            <div className="correlation-connector-wrapper mt-3 pt-3 border-t border-border-outer">
              <div className="correlation-connector">
                <svg className="correlation-connector-line" viewBox="0 0 24 24" fill="none">
                  <path d="M12 0 L12 16 M8 12 L12 16 L16 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {isAggregated ? (
                  // Aggregated: show all metrics inline
                  <div className="flex flex-wrap gap-2">
                    {metricsToShow.map((m, idx) => (
                      <span
                        key={idx}
                        className={`correlation-badge correlation-badge-${m.assessment}`}
                      >
                        {m.friendlyName} {m.change}
                        {m.assessment === "improved" && <span className="ml-1">✓</span>}
                        {m.assessment === "regressed" && <span className="ml-1">↓</span>}
                      </span>
                    ))}
                  </div>
                ) : (
                  // Element-level: show single metric
                  <span
                    className={`correlation-badge correlation-badge-${metricsToShow[0].assessment}`}
                  >
                    {metricsToShow[0].friendlyName} {metricsToShow[0].change}
                    {metricsToShow[0].assessment === "improved" && <span className="ml-1">✓</span>}
                    {metricsToShow[0].assessment === "regressed" && <span className="ml-1">↓</span>}
                  </span>
                )}
              </div>
              {/* Confirmation message */}
              {overallAssessment === "improved" && (
                <p className="text-xs text-score-high mt-2 font-medium">
                  {isAggregated ? "Your redesign helped." : "This change helped."}
                </p>
              )}
              {overallAssessment === "regressed" && (
                <p className="text-xs text-score-low mt-2 font-medium">
                  {isAggregated ? "Your redesign may have hurt." : "This change may have hurt."}
                </p>
              )}
            </div>
          )}

          {/* No correlation yet message - context-aware based on scope */}
          {!hasMetrics && (
            <div className="mt-3 pt-3 border-t border-border-outer">
              <p className="text-xs text-text-muted">
                {isAggregated
                  ? "Tracking overall impact of this redesign. Check back in a few days."
                  : "We're tracking this change. Check back in a few days to see if it helped."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
