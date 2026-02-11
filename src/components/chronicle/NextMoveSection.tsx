"use client";

import { useState } from "react";
import type { ChronicleSuggestion } from "@/lib/types/analysis";
import { SuggestionCard } from "./SuggestionCard";

interface NextMoveSectionProps {
  suggestions: ChronicleSuggestion[];
  /** Maximum suggestions to show before "See all" link */
  maxVisible?: number;
}

export function NextMoveSection({
  suggestions,
  maxVisible = 3,
}: NextMoveSectionProps) {
  const [showAll, setShowAll] = useState(false);

  if (suggestions.length === 0) {
    return (
      <section className="chronicle-section">
        <div className="chronicle-section-header">
          <h2
            className="text-2xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your next move
          </h2>
        </div>
        <div className="glass-card p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(16,185,129,0.1)] mb-4">
            <svg
              className="w-6 h-6 text-emerald"
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

  const visibleSuggestions = showAll
    ? sortedSuggestions
    : sortedSuggestions.slice(0, maxVisible);
  const hasMore = sortedSuggestions.length > maxVisible;

  return (
    <section className="chronicle-section">
      <div className="chronicle-section-header">
        <h2
          className="text-2xl font-bold text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Your next move
        </h2>
        {suggestions.length > 0 && (
          <p className="text-sm text-text-muted mt-1">
            Prioritized by expected impact
          </p>
        )}
      </div>

      <div className="space-y-2">
        {visibleSuggestions.map((suggestion, index) => (
          <div key={`${suggestion.element}-${suggestion.title}`} className="relative">
            {/* Priority dot - only for high/medium */}
            {(suggestion.impact === "high" || suggestion.impact === "medium") && (
              <span
                className={`priority-dot priority-dot-${suggestion.impact}`}
                title={`${suggestion.impact} impact`}
              />
            )}
            <SuggestionCard
              suggestion={suggestion}
              defaultExpanded={index === 0}
            />
          </div>
        ))}
      </div>

      {/* See all link */}
      {hasMore && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="next-move-see-all"
        >
          See all {sortedSuggestions.length} suggestions
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}
    </section>
  );
}
