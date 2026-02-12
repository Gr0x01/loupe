"use client";

import { useState } from "react";

interface ProofScreenshotProps {
  screenshotUrl: string;
  mobileScreenshotUrl?: string | null;
  pageUrl: string;
  onViewFull?: (view?: "desktop" | "mobile") => void;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function ProofScreenshot({
  screenshotUrl,
  mobileScreenshotUrl,
  pageUrl,
  onViewFull,
}: ProofScreenshotProps) {
  const [imageError, setImageError] = useState(false);
  const [mobileImageError, setMobileImageError] = useState(false);

  const handleClick = (view: "desktop" | "mobile") => {
    if (onViewFull) onViewFull(view);
  };

  return (
    <div className="proof-screenshot">
      <div className={mobileScreenshotUrl && !mobileImageError ? "proof-screenshot-pair" : ""}>
        {/* Desktop screenshot */}
        <div className="proof-screenshot-desktop">
          <div className="browser-chrome flex items-center gap-1.5 rounded-t-lg py-2 px-3">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
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
                alt={`Desktop screenshot of ${getDomain(pageUrl)}`}
                className="w-full h-auto max-h-[280px] object-cover object-top"
                onError={() => setImageError(true)}
              />
            )}
            {!imageError && (
              <button
                onClick={() => handleClick("desktop")}
                className="proof-screenshot-overlay group"
                type="button"
              >
                <span className="proof-screenshot-overlay-label">
                  View full screenshot
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile screenshot */}
        {mobileScreenshotUrl && !mobileImageError && (
          <div className="proof-screenshot-mobile">
            <button
              onClick={() => handleClick("mobile")}
              className="proof-screenshot-phone"
              type="button"
            >
              <div className="flex justify-center py-1">
                <div className="w-6 h-1 rounded-full bg-[rgba(0,0,0,0.08)]" />
              </div>
              <div className="relative overflow-hidden">
                <img
                  src={mobileScreenshotUrl}
                  alt={`Mobile screenshot of ${getDomain(pageUrl)}`}
                  className="w-full h-auto max-h-[300px] object-cover object-top"
                  onError={() => setMobileImageError(true)}
                />
              </div>
              <div className="flex justify-center py-1">
                <div className="w-5 h-0.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
