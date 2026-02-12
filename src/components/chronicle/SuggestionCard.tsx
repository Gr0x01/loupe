"use client";

import { useState } from "react";
import type { ChronicleSuggestion } from "@/lib/types/analysis";

interface SuggestionCardProps {
  suggestion: ChronicleSuggestion;
  defaultExpanded?: boolean;
}

export function SuggestionCard({ suggestion }: SuggestionCardProps) {
  const [copied, setCopied] = useState(false);

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

  return (
    <div
      className="evaluation-card suggestion-card"
      aria-label={`${suggestion.impact} priority suggestion`}
    >
      <span
        className={`suggestion-card-accent suggestion-card-accent-${suggestion.impact}`}
        aria-hidden="true"
      />

      <div className="suggestion-card-columns">
        <div className="suggestion-card-details">
          {/* Zone 1: What — element label + title */}
          <div className="suggestion-card-what">
            <span className="suggestion-card-element">{suggestion.element}</span>
            <p className="suggestion-card-title">{suggestion.title}</p>
          </div>

          {/* Zone 2: Why — observation + predicted impact */}
          <div className="suggestion-card-why">
            {suggestion.observation && (
              <p className="suggestion-card-observation">{suggestion.observation}</p>
            )}

            <p className="suggestion-card-impact">
              {suggestion.prediction.friendlyText}
              <span className="suggestion-impact-range">
                {" "}({suggestion.prediction.direction === "up" ? "+" : "-"}
                {suggestion.prediction.range})
              </span>
            </p>
          </div>
        </div>

        <div className="suggestion-card-fix">
          <div className="fix-block">
            <div className="fix-block-header">
              <span className="fix-block-label">The fix</span>
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
