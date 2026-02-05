"use client";

import { useState } from "react";
import type { ValidatedItem, WatchingItem, OpenItem } from "@/lib/types/analysis";

interface ProgressTrackerProps {
  validated: number;
  watching: number;
  open: number;
  validatedItems?: ValidatedItem[];
  watchingItems?: WatchingItem[];
  openItems?: OpenItem[];
  /** If true, only show inline summary without expandable sections */
  summaryOnly?: boolean;
}

function ProgressSection({
  title,
  count,
  bulletClass,
  children,
  defaultExpanded = false,
}: {
  title: string;
  count: number;
  bulletClass: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const sectionId = `progress-section-${title.toLowerCase().replace(/\s/g, "-")}`;

  if (count === 0) return null;

  return (
    <div className="progress-section">
      <button
        className="progress-section-header"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        aria-controls={sectionId}
      >
        <div className="flex items-center gap-2">
          <span className={`progress-section-bullet ${bulletClass}`} />
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          <span className="text-sm text-text-muted">({count})</span>
        </div>
        <svg
          className={`w-4 h-4 text-text-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {expanded && <div id={sectionId} className="progress-section-content">{children}</div>}
    </div>
  );
}

function WatchingProgressBar({ daysOfData, daysNeeded }: { daysOfData: number; daysNeeded: number }) {
  const percent = daysNeeded > 0 ? Math.min((daysOfData / daysNeeded) * 100, 100) : 0;
  return (
    <div className="watching-progress-bar">
      <div className="watching-progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

export function ProgressTracker({
  validated,
  watching,
  open,
  validatedItems = [],
  watchingItems = [],
  openItems = [],
  summaryOnly = false,
}: ProgressTrackerProps) {
  const hasItems = validatedItems.length > 0 || watchingItems.length > 0 || openItems.length > 0;
  const showExpandable = hasItems && !summaryOnly;

  return (
    <div className="progress-tracker">
      {/* Inline summary (always shown) */}
      <div className="progress-summary">
        <span className="progress-summary-item">
          <span className="progress-summary-bullet progress-summary-bullet-validated" />
          <span className="progress-summary-count">{validated}</span> validated
        </span>
        <span className="progress-summary-separator">&middot;</span>
        <span className="progress-summary-item">
          <span className="progress-summary-bullet progress-summary-bullet-watching" />
          <span className="progress-summary-count">{watching}</span> watching
        </span>
        <span className="progress-summary-separator">&middot;</span>
        <span className="progress-summary-item">
          <span className="progress-summary-bullet progress-summary-bullet-open" />
          <span className="progress-summary-count">{open}</span> open
        </span>
      </div>

      {/* Expandable sections (shown if items available and not summary-only) */}
      {showExpandable && (
        <div className="progress-sections mt-4">
          {/* Validated section */}
          <ProgressSection
            title="Validated"
            count={validated}
            bulletClass="progress-section-bullet-validated"
            defaultExpanded={validated > 0}
          >
            {validatedItems.map((item) => (
              <div key={item.id} className="progress-item progress-item-validated">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-score-high flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 8 6 11 13 4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-sm font-medium text-text-primary">{item.element}</span>
                </div>
                <p className="text-sm text-text-secondary mt-1 ml-6">{item.title}</p>
                <p className="text-sm text-score-high mt-1 ml-6">
                  {item.friendlyText} ({item.change})
                </p>
              </div>
            ))}
          </ProgressSection>

          {/* Watching section */}
          <ProgressSection
            title="Watching"
            count={watching}
            bulletClass="progress-section-bullet-watching"
          >
            {watchingItems.map((item) => (
              <div key={item.id} className="progress-item progress-item-watching">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-score-mid bg-transparent relative">
                      <span className="absolute inset-0 rounded-full bg-score-mid opacity-50" style={{ clipPath: "inset(0 50% 0 0)" }} />
                    </span>
                  </span>
                  <span className="text-sm font-medium text-text-primary">{item.element}</span>
                </div>
                <p className="text-sm text-text-secondary mt-1 ml-6">{item.title}</p>
                <div className="mt-2 ml-6">
                  <WatchingProgressBar daysOfData={item.daysOfData} daysNeeded={item.daysNeeded} />
                  <p className="text-xs text-text-muted mt-1">
                    {item.daysNeeded - item.daysOfData} more day{item.daysNeeded - item.daysOfData !== 1 ? "s" : ""} until we know if this helped
                  </p>
                </div>
              </div>
            ))}
          </ProgressSection>

          {/* Open section */}
          <ProgressSection
            title="Open"
            count={open}
            bulletClass="progress-section-bullet-open"
          >
            {openItems.map((item) => (
              <div key={item.id} className="progress-item progress-item-open">
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                    <span className="w-2.5 h-2.5 rounded-full border-2 border-text-muted" />
                  </span>
                  <span className="text-sm font-medium text-text-primary">{item.element}</span>
                  {item.impact === "high" && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-score-low/10 text-score-low font-medium">
                      High impact
                    </span>
                  )}
                </div>
                <p className="text-sm text-text-secondary mt-1 ml-6">{item.title}</p>
              </div>
            ))}
          </ProgressSection>
        </div>
      )}
    </div>
  );
}
