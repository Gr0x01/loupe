"use client";

import type { ValidatedItem } from "@/lib/types/analysis";

interface WinBannerProps {
  validatedItems: ValidatedItem[];
}

/**
 * Get the best win to highlight (highest percentage change)
 */
function getBestWin(items: ValidatedItem[]): ValidatedItem | null {
  if (items.length === 0) return null;

  // Filter to only positive changes first
  const positiveItems = items.filter((item) => {
    const changeNum = parseFloat(item.change.replace(/[^-0-9.]/g, "")) || 0;
    return changeNum > 0;
  });

  if (positiveItems.length === 0) return null;

  return positiveItems.reduce((best, current) => {
    const bestChange = parseFloat(best.change.replace(/[^-0-9.]/g, "")) || 0;
    const currentChange = parseFloat(current.change.replace(/[^-0-9.]/g, "")) || 0;
    return currentChange > bestChange ? current : best;
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
