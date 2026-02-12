"use client";

import type {
  ChangesSummary,
  DeployContextAPI,
  ValidatedItem,
} from "@/lib/types/analysis";
import { ProofScreenshot } from "./ProofScreenshot";
import { WinCard } from "./WinCard";
import { WatchingStrip } from "./WatchingStrip";
import { UnifiedTimeline } from "./UnifiedTimeline";
import { NextMoveSection } from "./NextMoveSection";

interface ChronicleLayoutProps {
  changesSummary: ChangesSummary;
  deployContext?: DeployContextAPI | null;
  baselineDate?: string;
  triggerType?: "manual" | "daily" | "weekly" | "deploy" | null;
  screenshotUrl?: string | null;
  mobileScreenshotUrl?: string | null;
  pageUrl?: string;
  createdAt?: string;
  onViewFullScreenshot?: (view?: "desktop" | "mobile") => void;
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

  // All suggestions sorted by impact (top suggestion no longer split out)
  const sortedSuggestions = [...changesSummary.suggestions].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.impact] - order[b.impact];
  });

  // Mode detection
  const hasWins = bestWin !== null;
  const isQuietScan =
    changesSummary.changes.length === 0 &&
    validatedItems.length === 0 &&
    watchingItems.length === 0;

  // Other validated results (excluding the best win)
  const otherResults = bestWin
    ? validatedItems.filter((item) => item !== bestWin)
    : [];



  // Accent class for verdict text
  const verdictAccentClass =
    verdictTone === "positive"
      ? "chronicle-verdict-positive"
      : verdictTone === "concerning"
        ? "chronicle-verdict-concerning"
        : "";

  return (
    <div className="chronicle-layout">
      {/* ===== VERDICT — bare text, no card ===== */}
      <section className="chronicle-verdict">
        <h1 className={`chronicle-verdict-headline ${verdictAccentClass}`}>
          {changesSummary.verdict}
        </h1>


        {/* Deploy context as small footer */}
        {deployContext && (
          <p className="chronicle-verdict-deploy">
            Triggered by deploy{" "}
            <span className="font-mono">{deployContext.commit_sha.slice(0, 7)}</span>
            {" "}{timeAgo(deployContext.commit_timestamp)}
          </p>
        )}
      </section>

      {/* ===== PROOF ZONE — two-column grid when changes exist ===== */}
      {!isQuietScan && (
        <section className="chronicle-proof-zone">
          {screenshotUrl && pageUrl && (
            <div className="chronicle-proof-left">
              <ProofScreenshot
                screenshotUrl={screenshotUrl}
                mobileScreenshotUrl={mobileScreenshotUrl}
                pageUrl={pageUrl}
                onViewFull={onViewFullScreenshot}
              />
            </div>
          )}
          <div className="chronicle-proof-right">
            {hasWins ? (
              <WinCard bestWin={bestWin} otherResults={otherResults} />
            ) : (
              <UnifiedTimeline
                changes={changesSummary.changes}
                validatedItems={validatedItems}
                watchingItems={watchingItems}
                hasError={!!changesSummary._error}
                compact
              />
            )}
          </div>
        </section>
      )}

      {/* ===== STANDALONE SCREENSHOT — quiet scans still show proof ===== */}
      {isQuietScan && screenshotUrl && pageUrl && (
        <section className="chronicle-proof-standalone">
          <ProofScreenshot
            screenshotUrl={screenshotUrl}
            mobileScreenshotUrl={mobileScreenshotUrl}
            pageUrl={pageUrl}
            onViewFull={onViewFullScreenshot}
          />
        </section>
      )}

      {/* ===== WATCHING STRIP — only in win mode ===== */}
      {hasWins && watchingItems.length > 0 && (
        <WatchingStrip items={watchingItems} />
      )}

      {/* ===== FULL TIMELINE — only in win mode (watching mode already shows it in proof zone) ===== */}
      {hasWins && !isQuietScan && (
        <UnifiedTimeline
          changes={changesSummary.changes}
          validatedItems={validatedItems}
          watchingItems={watchingItems}
          hasError={!!changesSummary._error}
        />
      )}

      {/* ===== YOUR NEXT MOVE ===== */}
      {sortedSuggestions.length > 0 && (
        <NextMoveSection suggestions={sortedSuggestions} />
      )}

      {/* ===== QUIET SCAN empty state ===== */}
      {isQuietScan && sortedSuggestions.length === 0 && (
        <section className="chronicle-section">
          <div className="chronicle-empty-card text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(16,185,129,0.1)] mb-4">
              <svg
                className="w-6 h-6 text-emerald"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="4 12 9 17 20 6" />
              </svg>
            </div>
            <p className="text-text-secondary">
              Nothing changed. If metrics shift, it&apos;s not your page.
            </p>
          </div>
        </section>
      )}
    </div>
  );
}

export default ChronicleLayout;
