"use client";

import type { Change, ChronicleCorrelationMetric } from "@/lib/types/analysis";

function formatDate(dateStr: string) {
  if (dateStr === "this scan") return "Today";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr; // Fallback to raw string for invalid dates
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
  correlation?: ChronicleCorrelationMetric | null;
}

export function TimelineEntry({ change, correlation }: TimelineEntryProps) {
  const bulletState = getBulletState(correlation);

  return (
    <div className="timeline-entry">
      {/* Left: bullet with connector line */}
      <div className="timeline-bullet-container">
        <div className={`timeline-bullet timeline-bullet-${bulletState}`} />
        <div className="timeline-connector" />
      </div>

      {/* Right: content */}
      <div className="flex-1 min-w-0 pb-8">
        {/* Date + element */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-text-primary">
            {formatDate(change.detectedAt)}
          </span>
          <span className="text-text-muted">&mdash;</span>
          <span className="text-sm text-text-secondary">{change.element} updated</span>
        </div>

        {/* Before/after display */}
        <div className="glass-card p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
            <span className="text-text-muted line-through">&ldquo;{change.before}&rdquo;</span>
            <span className="text-text-muted hidden sm:inline">&rarr;</span>
            <span className="text-text-primary font-medium">&ldquo;{change.after}&rdquo;</span>
          </div>

          {/* Correlation display with connector */}
          {correlation && (
            <div className="correlation-connector-wrapper mt-3 pt-3 border-t border-border-outer">
              <div className="correlation-connector">
                <svg className="correlation-connector-line" viewBox="0 0 24 24" fill="none">
                  <path d="M12 0 L12 16 M8 12 L12 16 L16 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span
                  className={`correlation-badge correlation-badge-${correlation.assessment}`}
                >
                  {correlation.friendlyName} {correlation.change}
                  {correlation.assessment === "improved" && <span className="ml-1">✓</span>}
                  {correlation.assessment === "regressed" && <span className="ml-1">↓</span>}
                </span>
              </div>
              {/* Confirmation message for validated changes */}
              {correlation.assessment === "improved" && (
                <p className="text-xs text-score-high mt-2 font-medium">This change helped.</p>
              )}
              {correlation.assessment === "regressed" && (
                <p className="text-xs text-score-low mt-2 font-medium">This change may have hurt.</p>
              )}
            </div>
          )}

          {/* No correlation yet message */}
          {!correlation && (
            <div className="mt-3 pt-3 border-t border-border-outer">
              <p className="text-xs text-text-muted">We&apos;re tracking this change. Check back in a few days to see if it helped.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
