"use client";

import { useState } from "react";
import { ScanPicker } from "./ScanPicker";

interface DossierSidebarProps {
  screenshotUrl?: string | null;
  mobileScreenshotUrl?: string | null;
  pageUrl?: string;
  baselineDate?: string;
  metricFocus?: string | null;
  scanNumber?: number;
  totalScans?: number;
  runningSummary?: string;
  progress: {
    validated: number;
    watching: number;
    open: number;
    validatedItems?: Array<{ change?: string }>;
  };
  onViewFullScreenshot?: (view?: "desktop" | "mobile") => void;
  mobile?: boolean;
  pageId?: string;
  currentAnalysisId?: string;
}

function getDomain(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    return path && path !== "" ? u.hostname + path : u.hostname;
  } catch {
    return url;
  }
}

function formatTrackingSince(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function countRegressions(validatedItems?: Array<{ change?: string }>): number {
  if (!validatedItems) return 0;
  return validatedItems.filter((item) => {
    const num = parseFloat((item.change || "").replace(/[^-0-9.]/g, "")) || 0;
    return num < 0;
  }).length;
}

function countWins(validatedItems?: Array<{ change?: string }>): number {
  if (!validatedItems) return 0;
  return validatedItems.filter((item) => {
    const num = parseFloat((item.change || "").replace(/[^-0-9.]/g, "")) || 0;
    return num > 0;
  }).length;
}

export function DossierSidebar({
  screenshotUrl,
  mobileScreenshotUrl,
  pageUrl,
  baselineDate,
  metricFocus,
  scanNumber,
  totalScans,
  runningSummary,
  progress,
  onViewFullScreenshot,
  mobile = false,
  pageId,
  currentAnalysisId,
}: DossierSidebarProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [mobileImgError, setMobileImgError] = useState(false);

  const wins = countWins(progress.validatedItems);
  const regressions = countRegressions(progress.validatedItems);
  const domain = pageUrl ? getDomain(pageUrl) : "";

  const summaryText =
    runningSummary && runningSummary.trim()
      ? runningSummary
      : "Loupe is building intelligence about this page. Insights appear after a few scans.";
  const isFallback = !runningSummary || !runningSummary.trim();

  const hasScanPicker = !!(pageId && currentAnalysisId && scanNumber && totalScans);

  const scorecard = [
    { label: "Wins", count: wins, accent: "dossier-scorecard-emerald" },
    { label: "Regressions", count: regressions, accent: "dossier-scorecard-coral" },
    { label: "Watching", count: progress.watching, accent: "dossier-scorecard-amber" },
    { label: "Suggestions", count: progress.open, accent: "dossier-scorecard-gray" },
  ];

  if (mobile) {
    return (
      <div className="dossier-mobile-header">
        {/* Page identity */}
        <div className="dossier-mobile-identity">
          {domain && (
            <p className="dossier-sidebar-domain">{domain}</p>
          )}
          <div className="dossier-mobile-meta">
            {hasScanPicker ? (
              <ScanPicker
                currentScanNumber={scanNumber}
                totalScans={totalScans}
                pageId={pageId}
                currentAnalysisId={currentAnalysisId}
              />
            ) : scanNumber && totalScans ? (
              <span className="dossier-sidebar-scan-label">
                Scan {scanNumber} of {totalScans}
              </span>
            ) : null}
            {metricFocus && (
              <span className="dossier-sidebar-focus-pill">{metricFocus}</span>
            )}
          </div>
        </div>

        {/* Inline scorecard */}
        <div className="dossier-mobile-scorecard">
          {scorecard.map((row) => (
            <div key={row.label} className={`dossier-scorecard-row ${row.accent}`}>
              <span className="dossier-scorecard-count">{row.count}</span>
              <span className="dossier-scorecard-label">{row.label}</span>
            </div>
          ))}
        </div>

        {/* Running summary — truncated with expand */}
        <div className="dossier-mobile-summary">
          <p
            className={`dossier-sidebar-summary-text ${isFallback ? "dossier-sidebar-summary-fallback" : ""} ${
              !summaryExpanded ? "dossier-mobile-summary-clamped" : ""
            }`}
          >
            {summaryText}
          </p>
          {!isFallback && summaryText.length > 140 && (
            <button
              onClick={() => setSummaryExpanded(!summaryExpanded)}
              className="dossier-mobile-summary-toggle"
            >
              {summaryExpanded ? "Show less" : "Read more"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div className="dossier-sidebar-inner">
      {/* Screenshot thumbnails — desktop + optional mobile */}
      {screenshotUrl && !imgError && (
        <div className="dossier-sidebar-screenshots">
          <button
            className="dossier-sidebar-screenshot"
            onClick={() => onViewFullScreenshot?.("desktop")}
          >
            <div className="dossier-sidebar-chrome">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
                <div className="w-1.5 h-1.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
              </div>
              <span className="dossier-sidebar-chrome-url">{domain}</span>
            </div>
            <div className="dossier-sidebar-screenshot-img">
              <img
                src={screenshotUrl}
                alt={`Desktop screenshot of ${domain}`}
                onError={() => setImgError(true)}
              />
            </div>
          </button>
          {mobileScreenshotUrl && !mobileImgError && (
            <button
              className="dossier-sidebar-mobile-screenshot"
              onClick={() => onViewFullScreenshot?.("mobile")}
            >
              <div className="dossier-sidebar-phone-notch" />
              <div className="dossier-sidebar-screenshot-img">
                <img
                  src={mobileScreenshotUrl}
                  alt={`Mobile screenshot of ${domain}`}
                  onError={() => setMobileImgError(true)}
                />
              </div>
              <div className="dossier-sidebar-phone-bar" />
            </button>
          )}
        </div>
      )}

      {/* Page identity */}
      <div className="dossier-sidebar-identity">
        {domain && (
          <p className="dossier-sidebar-domain">{domain}</p>
        )}
        {baselineDate && (
          <p className="dossier-sidebar-tracking">
            Tracking since {formatTrackingSince(baselineDate)}
          </p>
        )}
        {hasScanPicker ? (
          <ScanPicker
            currentScanNumber={scanNumber}
            totalScans={totalScans}
            pageId={pageId}
            currentAnalysisId={currentAnalysisId}
          />
        ) : scanNumber && totalScans ? (
          <p className="dossier-sidebar-scan-label">
            Scan {scanNumber} of {totalScans}
          </p>
        ) : null}
        {metricFocus && (
          <span className="dossier-sidebar-focus-pill">{metricFocus}</span>
        )}
      </div>

      {/* Scorecard */}
      <div className="dossier-scorecard">
        {scorecard.map((row) => (
          <div key={row.label} className={`dossier-scorecard-row ${row.accent}`}>
            <span className="dossier-scorecard-count">{row.count}</span>
            <span className="dossier-scorecard-label">{row.label}</span>
          </div>
        ))}
      </div>

      {/* Running summary */}
      <div className="dossier-sidebar-summary">
        <p className="dossier-sidebar-summary-label">Intelligence</p>
        <p
          className={`dossier-sidebar-summary-text ${isFallback ? "dossier-sidebar-summary-fallback" : ""}`}
        >
          {summaryText}
        </p>
      </div>
    </div>
  );
}
