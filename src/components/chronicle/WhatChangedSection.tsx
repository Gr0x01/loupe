"use client";

import type { Change, Correlation } from "@/lib/types/analysis";
import { TimelineEntry } from "./TimelineEntry";

interface WhatChangedSectionProps {
  changes: Change[];
  correlation: Correlation | null;
}

export function WhatChangedSection({ changes, correlation }: WhatChangedSectionProps) {
  if (changes.length === 0) {
    return (
      <section className="chronicle-section">
        <div className="chronicle-section-header">
          <h2
            className="text-2xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            What changed
          </h2>
        </div>
        <div className="glass-card p-6 text-center">
          <p className="text-text-secondary">
            No changes detected since your last scan. Your page is stable.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="chronicle-section">
      <div className="chronicle-section-header">
        <h2
          className="text-2xl font-bold text-text-primary"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          What changed
        </h2>
      </div>

      {/* Timeline */}
      <div className="timeline">
        {changes.map((change, i) => {
          // Try to find a correlation metric for this change
          const matchingMetric = correlation?.metrics.find((m) => {
            // Simple heuristic: match by element name similarity
            return change.element.toLowerCase().includes(m.name.toLowerCase());
          });

          return (
            <TimelineEntry
              key={`${i}-${change.element}-${change.detectedAt}`}
              change={change}
              correlation={matchingMetric}
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
                style={{ fontFamily: "var(--font-instrument-serif)" }}
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
