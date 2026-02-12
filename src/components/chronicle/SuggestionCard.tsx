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
  const impactHint = {
    high: "Biggest expected lift",
    medium: "Worth testing next",
    low: "Lower urgency",
  }[suggestion.impact];

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
      className="evaluation-card suggestion-card group"
      onClick={toggleExpanded}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
    >
      <div className="suggestion-card-header">
        <span
          className={`suggestion-card-accent suggestion-card-accent-${suggestion.impact}`}
          aria-hidden="true"
        />

        <div className="suggestion-card-main">
          <div className="suggestion-card-title-row">
            <p
              className="suggestion-card-title"

            >
              {suggestion.title}
            </p>
            <span className={impactBadgeClass}>{suggestion.impact}</span>
          </div>
          <div className="suggestion-card-meta">
            <span className="element-badge">{suggestion.element}</span>
            <span className="suggestion-card-meta-separator" />
            <span className="suggestion-card-meta-text">{impactHint}</span>
          </div>
        </div>

        <svg
          className={`suggestion-card-chevron ${expanded ? "rotate-180" : ""}`}
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

      <div className={`suggestion-card-content ${expanded ? "suggestion-card-content-open" : ""}`}>
        <div className="suggestion-card-content-inner">
          <div className="suggestion-card-details-grid">
            {suggestion.observation && (
              <div className="suggestion-detail">
                <p className="suggestion-detail-label">
                  What we noticed
                </p>
                <p className="suggestion-detail-text">
                  {suggestion.observation}
                </p>
              </div>
            )}

            <div className="suggestion-detail">
              <p className="suggestion-detail-label">
                Expected impact
              </p>
              <p className="suggestion-impact-line" style={{ fontFamily: "var(--font-display)" }}>
                {suggestion.prediction.friendlyText}
                <span className="suggestion-impact-range">
                  {" "}
                  ({suggestion.prediction.direction === "up" ? "+" : "-"}
                  {suggestion.prediction.range})
                </span>
              </p>
            </div>
          </div>

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
