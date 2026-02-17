"use client";

import { useState } from "react";
import Image from "next/image";
import { ScanPicker } from "./ScanPicker";
import { getDomain, getPath } from "@/lib/utils/url";

interface FindingsCounts {
  high: number;
  medium: number;
  low: number;
}

interface ClaimCTAProps {
  email: string;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  sent: boolean;
  error: string;
}

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
    validatedItems?: Array<{ status?: "validated" | "regressed"; metric?: string; change?: string }>;
  };
  onViewFullScreenshot?: (view?: "desktop" | "mobile") => void;
  mobile?: boolean;
  pageId?: string;
  currentAnalysisId?: string;
  findingsCounts?: FindingsCounts;
  auditSummary?: string;
  /** Show cached-result nudge with relative time + track CTA */
  cachedAt?: string | null;
  /** Claim CTA for unclaimed audits */
  claimCTA?: ClaimCTAProps;
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTrackingSince(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Metrics where a negative change_percent is an improvement */
const LOWER_IS_BETTER = new Set(["bounce_rate"]);

function inferStatus(item: { status?: "validated" | "regressed"; metric?: string; change?: string }): "validated" | "regressed" {
  if (item.status) return item.status;
  // Legacy fallback: infer from metric polarity + change sign
  const num = parseFloat((item.change || "").replace(/[^-0-9.]/g, "")) || 0;
  const isLowerBetter = LOWER_IS_BETTER.has(item.metric || "");
  if (isLowerBetter) return num < 0 ? "validated" : "regressed";
  return num > 0 ? "validated" : "regressed";
}

function countRegressions(validatedItems?: Array<{ status?: "validated" | "regressed"; metric?: string; change?: string }>): number {
  if (!validatedItems) return 0;
  return validatedItems.filter((item) => inferStatus(item) === "regressed").length;
}

function countWins(validatedItems?: Array<{ status?: "validated" | "regressed"; metric?: string; change?: string }>): number {
  if (!validatedItems) return 0;
  return validatedItems.filter((item) => inferStatus(item) === "validated").length;
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
  findingsCounts,
  auditSummary,
  cachedAt,
  claimCTA,
}: DossierSidebarProps) {
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [mobileImgError, setMobileImgError] = useState(false);

  const wins = countWins(progress.validatedItems);
  const regressions = countRegressions(progress.validatedItems);
  const domain = pageUrl ? getDomain(pageUrl) : "";
  const pagePath = pageUrl ? getPath(pageUrl) : "";

  const isScan1 = !!findingsCounts;
  const summarySource = isScan1 ? auditSummary : runningSummary;
  const summaryText =
    summarySource && summarySource.trim()
      ? summarySource
      : isScan1
        ? "Your baseline audit is complete. Loupe will track changes from here."
        : "Loupe is building intelligence about this page. Insights appear after a few scans.";
  const isFallback = !summarySource || !summarySource.trim();

  const hasScanPicker = !isScan1 && !!(pageId && currentAnalysisId && scanNumber && totalScans);

  const scorecard = isScan1
    ? [
        { label: "High", count: findingsCounts.high, accent: "dossier-scorecard-coral" },
        { label: "Medium", count: findingsCounts.medium, accent: "dossier-scorecard-amber" },
        { label: "Low", count: findingsCounts.low, accent: "dossier-scorecard-gray" },
      ]
    : [
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
          {pagePath && (
            <p className="dossier-sidebar-domain">{pagePath}</p>
          )}
          <div className="dossier-mobile-meta">
            {isScan1 ? (
              <span className="dossier-sidebar-scan-label">Baseline Scan</span>
            ) : hasScanPicker ? (
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

        {/* Claim CTA for unclaimed audits (mobile) */}
        {claimCTA && !claimCTA.sent && (
          <div className="dossier-mobile-claim">
            <a
              href="#claim-cta"
              className="btn-primary w-full text-sm text-center block"
              style={{ boxShadow: "none", textDecoration: "none" }}
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("claim-cta")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Track this page
            </a>
          </div>
        )}

        {/* Running summary — truncated with expand (N+1 only) */}
        {!isScan1 && (
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
        )}

        {/* Cached result nudge (mobile) */}
        {cachedAt && (
          <div className="dossier-cached-nudge">
            <p className="dossier-cached-time">
              <svg className="dossier-cached-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="8" r="6" />
                <path d="M8 5v3l2 1.5" />
              </svg>
              Scanned {formatTimeAgo(cachedAt)}
            </p>
            <a href="#claim-cta" className="dossier-cached-cta" onClick={(e) => {
              e.preventDefault();
              document.getElementById("claim-cta")?.scrollIntoView({ behavior: "smooth" });
            }}>
              Track this page for fresh scans&thinsp;→
            </a>
          </div>
        )}
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
              <Image
                src={screenshotUrl}
                alt={`Desktop screenshot of ${domain}`}
                width={260}
                height={180}
                loading="lazy"
                onError={() => setImgError(true)}
                style={{ width: "100%", height: "auto" }}
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
                <Image
                  src={mobileScreenshotUrl}
                  alt={`Mobile screenshot of ${domain}`}
                  width={120}
                  height={200}
                  loading="lazy"
                  onError={() => setMobileImgError(true)}
                  style={{ width: "100%", height: "auto" }}
                />
              </div>
              <div className="dossier-sidebar-phone-bar" />
            </button>
          )}
        </div>
      )}

      {/* Page identity */}
      <div className="dossier-sidebar-identity">
        {pagePath && (
          <p className="dossier-sidebar-domain">{pagePath}</p>
        )}
        {baselineDate && (
          <p className="dossier-sidebar-tracking">
            Tracking since {formatTrackingSince(baselineDate)}
          </p>
        )}
        {isScan1 ? (
          <p className="dossier-sidebar-scan-label">Baseline Scan</p>
        ) : hasScanPicker ? (
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

      {/* Claim CTA for unclaimed audits */}
      {claimCTA && (
        <div className="dossier-sidebar-claim">
          {claimCTA.sent ? (
            <div className="dossier-sidebar-claim-sent">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
              </svg>
              <span>Check your inbox</span>
            </div>
          ) : (
            <>
              <p className="dossier-sidebar-claim-headline">
                {findingsCounts
                  ? `${findingsCounts.high + findingsCounts.medium + findingsCounts.low} predictions to verify.`
                  : "This page will change."}
              </p>
              <p className="dossier-sidebar-claim-sub">
                Track this page to see which ones hold up.
              </p>
              <form onSubmit={claimCTA.onSubmit} className="dossier-sidebar-claim-form">
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={claimCTA.email}
                  onChange={(e) => claimCTA.onEmailChange(e.target.value)}
                  className="input-glass w-full text-sm py-2"
                  aria-label="Email address"
                  required
                />
                <button
                  type="submit"
                  disabled={claimCTA.loading}
                  className="btn-primary w-full text-sm py-2"
                >
                  {claimCTA.loading ? "..." : "Start watching \u2014 free"}
                </button>
              </form>
              {claimCTA.error && (
                <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{claimCTA.error}</p>
              )}
              <p className="dossier-sidebar-claim-trust">
                Free for one page. We scan daily during your 14-day trial.{" "}
                <span className="dossier-sidebar-claim-trust-note">No credit card required.</span>
              </p>
            </>
          )}
        </div>
      )}

      {/* Running summary (N+1 only — scan 1 shows bottom-line in feed) */}
      {!isScan1 && (
        <div className="dossier-sidebar-summary">
          <p className="dossier-sidebar-summary-label">Intelligence</p>
          <div className="dossier-sidebar-summary-accent">
            <p
              className={`dossier-sidebar-summary-text ${isFallback ? "dossier-sidebar-summary-fallback" : ""}`}
            >
              {summaryText}
            </p>
          </div>
        </div>
      )}

      {/* Cached result nudge */}
      {cachedAt && (
        <div className="dossier-cached-nudge">
          <p className="dossier-cached-time">
            <svg className="dossier-cached-icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="8" r="6" />
              <path d="M8 5v3l2 1.5" />
            </svg>
            Scanned {formatTimeAgo(cachedAt)}
          </p>
          <a href="#claim-cta" className="dossier-cached-cta" onClick={(e) => {
            e.preventDefault();
            document.getElementById("claim-cta")?.scrollIntoView({ behavior: "smooth" });
          }}>
            Track this page for fresh scans&thinsp;→
          </a>
        </div>
      )}
    </div>
  );
}
