"use client";

import type { ValidatedItem } from "@/lib/types/analysis";

interface WinBannerProps {
  validatedItems: ValidatedItem[];
}

/**
 * Metrics where lower values are better (e.g., bounce_rate down = good)
 */
const LOWER_IS_BETTER_METRICS = new Set([
  "bounce_rate",
  "exit_rate",
  "load_time",
  "error_rate",
]);

/**
 * Parse the numeric change value from a string like "-12%" or "+8.5%"
 * Assumes the number appears at the start of the string.
 */
function parseChange(item: ValidatedItem): number {
  return parseFloat(item.change.replace(/[^-0-9.]/g, "")) || 0;
}

/**
 * Determine if a metric change represents a win
 * For most metrics, positive change = win
 * For "lower is better" metrics, negative change = win
 */
function isWin(item: ValidatedItem): boolean {
  const changeNum = parseChange(item);
  const lowerIsBetter = LOWER_IS_BETTER_METRICS.has(item.metric);
  return lowerIsBetter ? changeNum < 0 : changeNum > 0;
}

/**
 * Get the magnitude of improvement (absolute value, sign-normalized)
 */
function getImprovementMagnitude(item: ValidatedItem): number {
  const changeNum = parseChange(item);
  const lowerIsBetter = LOWER_IS_BETTER_METRICS.has(item.metric);
  // For lower-is-better, a negative change is positive improvement
  return lowerIsBetter ? -changeNum : changeNum;
}

/**
 * Get the best win to highlight (highest improvement magnitude)
 */
function getBestWin(items: ValidatedItem[]): ValidatedItem | null {
  if (items.length === 0) return null;

  // Filter to only actual wins (considering metric direction)
  const wins = items.filter(isWin);

  if (wins.length === 0) return null;

  return wins.reduce((best, current) => {
    const bestMagnitude = getImprovementMagnitude(best);
    const currentMagnitude = getImprovementMagnitude(current);
    return currentMagnitude > bestMagnitude ? current : best;
  });
}

/**
 * Generate the timeline card ID for a validated item
 * Must match the ID format used in UnifiedTimeline
 */
function getTimelineCardId(item: ValidatedItem): string {
  return `timeline-validated-${item.id}`;
}

export function WinBanner({ validatedItems }: WinBannerProps) {
  const bestWin = getBestWin(validatedItems);

  if (!bestWin) return null;

  const targetId = getTimelineCardId(bestWin);

  const handleClick = () => {
    const element = document.getElementById(targetId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      // Add highlight effect
      element.classList.add("timeline-card-highlighted");
      setTimeout(() => element.classList.remove("timeline-card-highlighted"), 2000);
    }
  };

  return (
    <div className="win-banner">
      <button
        onClick={handleClick}
        className="win-banner-content"
        type="button"
      >
        <div className="win-banner-icon">
          <svg
            className="w-5 h-5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="10" cy="10" r="4" />
            <path d="M10 2v4M10 14v4M2 10h4M14 10h4" strokeLinecap="round" />
          </svg>
        </div>
        <span className="win-banner-text">
          Your <span className="win-banner-element">{bestWin.element.toLowerCase()}</span> change helped:{" "}
          <span className="win-banner-metric">{bestWin.friendlyText}</span>
          {" "}
          <span className="win-banner-change">{bestWin.change}</span>
        </span>
        <svg
          className="win-banner-arrow"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}
