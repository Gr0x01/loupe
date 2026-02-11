"use client";

import { useState } from "react";

interface SnapshotCollapsibleProps {
  screenshotUrl: string;
  mobileScreenshotUrl?: string | null;
  pageUrl: string;
  createdAt?: string;
  onViewFull?: () => void;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function SnapshotCollapsible({
  screenshotUrl,
  mobileScreenshotUrl,
  pageUrl,
  createdAt,
  onViewFull,
}: SnapshotCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mobileImageError, setMobileImageError] = useState(false);

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="snapshot-collapsible">
      <button
        onClick={() => setExpanded(!expanded)}
        className="snapshot-collapsible-toggle"
        aria-expanded={expanded}
      >
        <span className="snapshot-collapsible-toggle-left">
          <svg
            className={`snapshot-collapsible-chevron ${expanded ? "rotate-90" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="snapshot-collapsible-label">Latest snapshot</span>
        </span>
        {formattedDate && (
          <span className="snapshot-collapsible-date">{formattedDate}</span>
        )}
      </button>

      {expanded && (
        <div className="snapshot-collapsible-content">
          <div className={mobileScreenshotUrl ? "flex gap-3 items-start" : ""}>
            {/* Desktop screenshot */}
            <div className={`snapshot-collapsible-image-wrapper ${mobileScreenshotUrl ? "flex-1" : ""}`}>
              <div className="browser-chrome flex items-center gap-1.5 rounded-t-lg py-2 px-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
                  <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
                  <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
                </div>
                <span className="text-[10px] text-text-muted font-mono ml-1.5 truncate">
                  {getDomain(pageUrl)}
                </span>
              </div>
              <div className="relative overflow-hidden rounded-b-lg">
                {imageError ? (
                  <div className="w-full h-[200px] bg-bg-inset flex items-center justify-center">
                    <span className="text-sm text-text-muted">Screenshot unavailable</span>
                  </div>
                ) : (
                  <img
                    src={screenshotUrl}
                    alt={`Desktop screenshot of ${pageUrl}`}
                    className="w-full h-auto max-h-[300px] object-cover object-top"
                    onError={() => setImageError(true)}
                  />
                )}
                {onViewFull && !imageError && (
                  <button
                    onClick={onViewFull}
                    className="snapshot-collapsible-overlay group"
                  >
                    <span className="snapshot-collapsible-overlay-label">
                      View full screenshot
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Mobile screenshot */}
            {mobileScreenshotUrl && !mobileImageError && (
              <div className="w-[100px] flex-shrink-0">
                <div className="border-[1.5px] border-[var(--line)] rounded-[10px] overflow-hidden bg-white">
                  <div className="flex justify-center py-1">
                    <div className="w-6 h-1 rounded-full bg-[rgba(0,0,0,0.08)]" />
                  </div>
                  <div className="relative overflow-hidden">
                    <img
                      src={mobileScreenshotUrl}
                      alt={`Mobile screenshot of ${pageUrl}`}
                      className="w-full h-auto max-h-[250px] object-cover object-top"
                      onError={() => setMobileImageError(true)}
                    />
                  </div>
                  <div className="flex justify-center py-1">
                    <div className="w-5 h-0.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
                  </div>
                </div>
                <p className="text-[10px] text-text-muted text-center mt-1">Mobile</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
