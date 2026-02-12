"use client";

import { useState } from "react";
import type {
  ChangesSummary,
  DeployContextAPI,
  ValidatedItem,
} from "@/lib/types/analysis";
import { ChronicleHero } from "./ChronicleHero";
import { UnifiedTimeline } from "./UnifiedTimeline";
import { NextMoveSection } from "./NextMoveSection";
import { SnapshotCollapsible } from "./SnapshotCollapsible";

interface ChronicleLayoutProps {
  changesSummary: ChangesSummary;
  deployContext?: DeployContextAPI | null;
  baselineDate?: string;
  triggerType?: "manual" | "daily" | "weekly" | "deploy" | null;
  screenshotUrl?: string | null;
  mobileScreenshotUrl?: string | null;
  pageUrl?: string;
  createdAt?: string;
  onViewFullScreenshot?: () => void;
}

/* ---- Win detection helpers ---- */

const LOWER_IS_BETTER_METRICS = new Set([
  "bounce_rate",
  "exit_rate",
  "load_time",
  "error_rate",
]);

function parseChange(item: ValidatedItem): number {
  return parseFloat(item.change.replace(/[^-0-9.]/g, "")) || 0;
}

function isWin(item: ValidatedItem): boolean {
  const changeNum = parseChange(item);
  const lowerIsBetter = LOWER_IS_BETTER_METRICS.has(item.metric);
  return lowerIsBetter ? changeNum < 0 : changeNum > 0;
}

function getImprovementMagnitude(item: ValidatedItem): number {
  const changeNum = parseChange(item);
  const lowerIsBetter = LOWER_IS_BETTER_METRICS.has(item.metric);
  return lowerIsBetter ? -changeNum : changeNum;
}

function getBestWin(items: ValidatedItem[]): ValidatedItem | null {
  const wins = items.filter(isWin);
  if (wins.length === 0) return null;
  return wins.reduce((best, current) =>
    getImprovementMagnitude(current) > getImprovementMagnitude(best)
      ? current
      : best
  );
}

/* ---- Utility ---- */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function ChronicleLayout({
  changesSummary,
  deployContext,
  baselineDate,
  triggerType,
  screenshotUrl,
  mobileScreenshotUrl,
  pageUrl,
  createdAt,
  onViewFullScreenshot,
}: ChronicleLayoutProps) {
  const [copied, setCopied] = useState(false);

  const validatedItems = changesSummary.progress.validatedItems || [];
  const watchingItems = changesSummary.progress.watchingItems || [];

  // Derive verdict tone
  const bestWin = getBestWin(validatedItems);
  const hasRegressed = validatedItems.some((item) => !isWin(item));
  const verdictTone: "positive" | "concerning" | "neutral" =
    bestWin && !hasRegressed
      ? "positive"
      : hasRegressed
        ? "concerning"
        : "neutral";

  // Split suggestions: top one in Status Card, rest in details
  const sortedSuggestions = [...changesSummary.suggestions].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  });
  const topSuggestion = sortedSuggestions[0] || null;
  const remainingSuggestions = sortedSuggestions.slice(1);

  // Quiet scan = nothing to show in timeline
  const isQuietScan =
    changesSummary.changes.length === 0 &&
    validatedItems.length === 0 &&
    watchingItems.length === 0;


  const handleCopyFix = async () => {
    if (!topSuggestion) return;
    try {
      await navigator.clipboard.writeText(topSuggestion.suggestedFix);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard may not be available
    }
  };

  return (
    <div className="chronicle-layout">
      {/* ===== STATUS CARD — the complete check-in ===== */}
      <section className="chronicle-hero-section">
        <div
          className={`glass-card-elevated chronicle-hero-card chronicle-hero-card-${verdictTone}`}
        >
          <ChronicleHero
            verdict={changesSummary.verdict}
            baselineDate={baselineDate}
            triggerType={triggerType}
            progress={{
              validated: changesSummary.progress.validated,
              watching: changesSummary.progress.watching,
              open: changesSummary.progress.open,
            }}
            tone={verdictTone}
          />

          {/* Inline win callout */}
          {bestWin && (
            <div className="status-card-win">
              <svg
                className="status-card-win-icon"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="10" cy="10" r="4" />
                <path
                  d="M10 2v4M10 14v4M2 10h4M14 10h4"
                  strokeLinecap="round"
                />
              </svg>
              <span className="status-card-win-text">
                Your{" "}
                <strong>{bestWin.element.toLowerCase()}</strong> change
                helped: {bestWin.friendlyText}{" "}
                <span className="status-card-win-change">
                  {bestWin.change}
                </span>
              </span>
            </div>
          )}

          {/* Top suggestion with copy */}
          {topSuggestion && (
            <div className="status-card-next-move">
              <p className="status-card-next-move-label">Your next move</p>
              <p className="status-card-next-move-title">
                {topSuggestion.title}
              </p>
              <div className="status-card-fix-row">
                <p className="status-card-fix-text">
                  {topSuggestion.suggestedFix}
                </p>
                <button
                  onClick={handleCopyFix}
                  className="status-card-copy-btn"
                  type="button"
                >
                  {copied ? (
                    <svg
                      className="w-3.5 h-3.5 text-emerald"
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
                    "Copy"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Deploy context */}
          {deployContext && (
            <div className="chronicle-deploy-context">
              <div className="chronicle-deploy-context-row">
                <svg
                  className="w-4 h-4 text-text-muted flex-shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="8" cy="8" r="3" />
                  <path
                    d="M8 1v4M8 11v4M1 8h4M11 8h4"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="chronicle-deploy-context-label">
                  Triggered by deploy{" "}
                  <span className="chronicle-deploy-context-sha">
                    {deployContext.commit_sha.slice(0, 7)}
                  </span>{" "}
                  {timeAgo(deployContext.commit_timestamp)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== REMAINING SUGGESTIONS ===== */}
      {remainingSuggestions.length > 0 && (
        <NextMoveSection suggestions={remainingSuggestions} />
      )}

      {/* ===== CHANGES TIMELINE (skip on quiet scans) ===== */}
      {!isQuietScan && (
        <UnifiedTimeline
          changes={changesSummary.changes}
          validatedItems={validatedItems}
          watchingItems={watchingItems}
          hasError={!!changesSummary._error}
        />
      )}

      {/* ===== SNAPSHOT ===== */}
      {screenshotUrl && pageUrl && (
        <section className="chronicle-section">
          <SnapshotCollapsible
            screenshotUrl={screenshotUrl}
            mobileScreenshotUrl={mobileScreenshotUrl}
            pageUrl={pageUrl}
            createdAt={createdAt}
            onViewFull={onViewFullScreenshot}
          />
        </section>
      )}
    </div>
  );
}

export default ChronicleLayout;
