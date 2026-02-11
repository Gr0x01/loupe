"use client";

import { useState } from "react";

interface SnapshotCollapsibleProps {
  screenshotUrl: string;
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
  pageUrl,
  createdAt,
  onViewFull,
}: SnapshotCollapsibleProps) {
  const [expanded, setExpanded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formattedDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="snapshot-collapsible">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="snapshot-collapsible-toggle"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-text-muted transition-transform ${expanded ? "rotate-90" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-sm text-text-secondary">
            Latest snapshot{formattedDate ? ` \u00b7 ${formattedDate}` : ""}
          </span>
        </div>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div className="snapshot-collapsible-content">
          <div className="snapshot-collapsible-image-wrapper">
            {/* Browser chrome */}
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
            {/* Screenshot */}
            <div className="relative overflow-hidden rounded-b-lg">
              {imageError ? (
                <div className="w-full h-[200px] bg-bg-inset flex items-center justify-center">
                  <span className="text-sm text-text-muted">Screenshot unavailable</span>
                </div>
              ) : (
                <img
                  src={screenshotUrl}
                  alt={`Screenshot of ${pageUrl}`}
                  className="w-full h-auto max-h-[300px] object-cover object-top"
                  onError={() => setImageError(true)}
                />
              )}
              {/* View full overlay */}
              {onViewFull && !imageError && (
                <button
                  onClick={onViewFull}
                  className="absolute inset-0 bg-transparent hover:bg-accent/5 transition-colors flex items-center justify-center group"
                >
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-accent bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded shadow-sm">
                    View full screenshot
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
