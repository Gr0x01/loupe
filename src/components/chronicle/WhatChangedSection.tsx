"use client";

import type { Change, Correlation } from "@/lib/types/analysis";
import { TimelineEntry } from "./TimelineEntry";

interface WhatChangedSectionProps {
  changes: Change[];
  correlation: Correlation | null;
  /** Internal: set when post-analysis failed */
  hasError?: boolean;
}

export function WhatChangedSection({ changes, correlation, hasError }: WhatChangedSectionProps) {
  if (changes.length === 0) {
    return (
      <section className="chronicle-section">
        <div className="chronicle-section-header">
          <h2
            className="text-2xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What changed
          </h2>
        </div>
        <div className="glass-card p-6 text-center">
          {hasError ? (
            <p className="text-text-secondary">
              Change detection unavailable for this scan. Your primary audit is still available above.
            </p>
          ) : (
            <p className="text-text-secondary">
              No changes detected since your last scan. Your page is stable.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="chronicle-section">
      <div className="chronicle-section-header">
        <h2
          className="text-2xl font-bold text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What changed
        </h2>
      </div>

      {/* Timeline */}
      <div className="timeline">
        {changes.map((change, i) => {
          const isAggregated = change.scope === "section" || change.scope === "page";

          // For element-level changes, try to match a specific metric
          const matchingMetric = !isAggregated
            ? correlation?.metrics.find((m) => {
                return change.element.toLowerCase().includes(m.name.toLowerCase());
              })
            : undefined;

          return (
            <TimelineEntry
              key={`${i}-${change.element}-${change.detectedAt}`}
              change={change}
              correlation={matchingMetric}
              // For aggregated changes, pass all metrics since we can't isolate impact
              allMetrics={isAggregated && correlation?.hasEnoughData ? correlation.metrics : undefined}
            />
          );
        })}
      </div>

      {/* Correlation insights (if available) */}
      {correlation?.hasEnoughData && correlation.insights && (
        <div className="analytics-insight-card mt-6">
          <div className="flex items-start gap-4">
            <div className="evaluation-icon evaluation-icon-improved flex-shrink-0">
              <svg
                className="w-4 h-4"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="2 12 6 8 9 11 14 4" />
                <polyline points="10 4 14 4 14 8" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
                Correlation
              </p>
              <p
                className="text-lg text-text-primary leading-relaxed"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {correlation.insights}
              </p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
