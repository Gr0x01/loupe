"use client";

import type { ChronicleSuggestion } from "@/lib/types/analysis";
import { SuggestionCard } from "./SuggestionCard";

interface WhatToDoNextSectionProps {
  suggestions: ChronicleSuggestion[];
}

export function WhatToDoNextSection({ suggestions }: WhatToDoNextSectionProps) {
  if (suggestions.length === 0) {
    return (
      <section className="chronicle-section">
        <div className="chronicle-section-header">
          <h2
            className="text-2xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What to do next
          </h2>
        </div>
        <div className="glass-card p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(26,140,91,0.1)] mb-4">
            <svg
              className="w-6 h-6 text-score-high"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="4 12 9 17 20 6" />
            </svg>
          </div>
          <p className="text-text-secondary">
            No new suggestions. Your recent changes are working well.
          </p>
        </div>
      </section>
    );
  }

  // Sort by impact: high first
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impact] - impactOrder[b.impact];
  });

  return (
    <section className="chronicle-section">
      <div className="chronicle-section-header">
        <h2
          className="text-2xl font-bold text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          What to do next
        </h2>
        <p className="text-sm text-text-muted mt-1">
          Prioritized by expected impact
        </p>
      </div>

      <div className="space-y-2">
        {sortedSuggestions.map((suggestion) => (
          <SuggestionCard
            key={`${suggestion.element}-${suggestion.title}`}
            suggestion={suggestion}
          />
        ))}
      </div>
    </section>
  );
}
