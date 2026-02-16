"use client";

import { useState } from "react";
import type { ChronicleSuggestion, TrackedSuggestion } from "@/lib/types/analysis";
import { SuggestionCard } from "./SuggestionCard";

interface NextMoveSectionProps {
  suggestions: ChronicleSuggestion[];
  trackedSuggestions?: TrackedSuggestion[];
  onAddress?: (id: string) => Promise<void>;
  onDismiss?: (id: string) => Promise<void>;
  /** Maximum suggestions to show before "See all" link */
  maxVisible?: number;
}

export function NextMoveSection({
  suggestions,
  trackedSuggestions,
  onAddress,
  onDismiss,
  maxVisible = 3,
}: NextMoveSectionProps) {
  const [showAll, setShowAll] = useState(false);

  // When tracked suggestions were provided (even if empty), they are authoritative.
  // Only fall back to ephemeral when trackedSuggestions is undefined (initial audits).
  const useTracked = trackedSuggestions !== undefined;

  const totalCount = useTracked ? trackedSuggestions.length : suggestions.length;

  if (totalCount === 0) {
    return (
      <section className="chronicle-section">
        <div className="chronicle-section-header">
          <h2
            className="text-2xl font-bold text-text-primary"

          >
            Your next move
          </h2>
        </div>
        <div className="chronicle-empty-card">
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
            No recommendations right now. Recent changes haven&apos;t hurt your metrics.
          </p>
        </div>
      </section>
    );
  }

  if (trackedSuggestions !== undefined) {
    // Sort tracked by impact: high first, then by times_suggested desc
    const sorted = [...trackedSuggestions].sort((a, b) => {
      const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
      const impactDiff = (impactOrder[a.impact] ?? 3) - (impactOrder[b.impact] ?? 3);
      if (impactDiff !== 0) return impactDiff;
      return b.times_suggested - a.times_suggested;
    });

    const visible = showAll ? sorted : sorted.slice(0, maxVisible);
    const hasMore = sorted.length > maxVisible;

    return (
      <section className="chronicle-section">
        <div className="chronicle-section-header">
          <h2 className="text-2xl font-bold text-text-primary">
            Your next move
          </h2>
        </div>

        <div className="next-move-stack">
          {visible.map((tracked) => (
            <SuggestionCard
              key={tracked.id}
              suggestion={{
                title: tracked.title,
                element: tracked.element,
                observation: "",
                prediction: { metric: "conversion_rate", direction: "up", range: "", friendlyText: "" },
                suggestedFix: tracked.suggested_fix,
                impact: tracked.impact,
              }}
              suggestionId={tracked.id}
              timesSuggested={tracked.times_suggested}
              onAddress={onAddress}
              onDismiss={onDismiss}
              defaultExpanded={false}
            />
          ))}
        </div>

        {hasMore && !showAll && (
          <button
            onClick={() => setShowAll(true)}
            className="next-move-see-all"
          >
            See all {sorted.length} suggestions
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

  // Fallback: ephemeral suggestions (initial audits, backward compat)
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const impactOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return (impactOrder[a.impact] ?? 3) - (impactOrder[b.impact] ?? 3);
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
        >
          Your next move
        </h2>
      </div>

      <div className="next-move-stack">
        {visibleSuggestions.map((suggestion, index) => (
          <SuggestionCard
            key={`${suggestion.element}-${suggestion.title}`}
            suggestion={suggestion}
            defaultExpanded={index === 0}
          />
        ))}
      </div>

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
