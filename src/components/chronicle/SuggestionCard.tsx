"use client";

import { useState } from "react";
import type { ChronicleSuggestion } from "@/lib/types/analysis";

interface SuggestionCardProps {
  suggestion: ChronicleSuggestion;
  defaultExpanded?: boolean;
}

export function SuggestionCard({ suggestion, defaultExpanded = false }: SuggestionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const toggleExpanded = () => setExpanded(!expanded);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleExpanded();
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(suggestion.suggestedFix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail - clipboard may not be available
    }
  };

  const impactBadgeClass = `impact-badge impact-badge-${suggestion.impact}`;

  return (
    <div
      className="evaluation-card group"
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      {/* Header - always visible */}
      <div className="flex items-start gap-3 p-4">
        {/* Arrow indicator */}
        <span className="text-accent text-lg font-bold mt-0.5">&rarr;</span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[1.0625rem] font-semibold text-text-primary leading-snug"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {suggestion.title}
            </p>
            <span className={impactBadgeClass}>{suggestion.impact}</span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="element-badge">{suggestion.element}</span>
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-text-muted transition-transform duration-200 flex-shrink-0 ${
            expanded ? "rotate-180" : ""
          }`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5 8 10 13 15 8" />
        </svg>
      </div>

      {/* Expandable content */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          expanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-border-outer mt-2">
          {/* Observation */}
          {suggestion.observation && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
                What we noticed
              </p>
              <p className="text-[0.9375rem] text-text-secondary leading-relaxed">
                {suggestion.observation}
              </p>
            </div>
          )}

          {/* Prediction */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
              Expected impact
            </p>
            <p
              className="text-[0.9375rem] text-text-primary leading-relaxed"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {suggestion.prediction.friendlyText} ({suggestion.prediction.direction === "up" ? "+" : "-"}
              {suggestion.prediction.range})
            </p>
          </div>

          {/* Suggested fix */}
          <div className="fix-block">
            <div className="fix-block-header">
              <span className="fix-block-label">Try this</span>
              <button
                onClick={handleCopy}
                className="fix-block-copy"
                title={copied ? "Copied!" : "Copy"}
              >
                {copied ? (
                  <svg
                    className="w-4 h-4 text-score-high"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                    <path d="M10.5 5.5V3.5a1.5 1.5 0 00-1.5-1.5H3.5A1.5 1.5 0 002 3.5V9a1.5 1.5 0 001.5 1.5h2" />
                  </svg>
                )}
              </button>
            </div>
            <p className="fix-block-text">{suggestion.suggestedFix}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
