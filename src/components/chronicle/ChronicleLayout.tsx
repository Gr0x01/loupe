"use client";

import { useMemo } from "react";
import type {
  ChangesSummary,
  DeployContextAPI,
  ValidatedItem,
} from "@/lib/types/analysis";
import { DossierSidebar } from "./DossierSidebar";

import { MetricStrip } from "./MetricStrip";
import { ObservationCard } from "./ObservationCard";
import { UnifiedTimelineCard } from "./UnifiedTimelineCard";
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
  // New dossier props
  scanNumber?: number;
  totalScans?: number;
  pageId?: string;
  currentAnalysisId?: string;
  metricFocus?: string | null;
  hypothesisMap?: Record<string, string>;
  feedbackMap?: Record<string, { feedback_type: string; checkpoint_id: string }>;
  checkpointMap?: Record<string, { checkpoint_id: string; horizon_days: number }>;
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

function getTimelineItemId(element: string, type: string, id?: string): string {
  if (id) return `timeline-${type}-${id}`;
  return `timeline-${type}-${element.toLowerCase().replace(/\s+/g, "-")}`;
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
  scanNumber,
  totalScans,
  pageId,
  currentAnalysisId,
  metricFocus,
  hypothesisMap,
  feedbackMap,
  checkpointMap,
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

  // All suggestions sorted by impact
  const sortedSuggestions = useMemo(
    () =>
      [...changesSummary.suggestions].sort((a, b) => {
        const order = { high: 0, medium: 1, low: 2 };
        return order[a.impact] - order[b.impact];
      }),
    [changesSummary.suggestions]
  );

  // Mode detection
  const isQuietScan =
    changesSummary.changes.length === 0 &&
    validatedItems.length === 0 &&
    watchingItems.length === 0;

  // Group items by outcome
  const wins = useMemo(
    () => validatedItems.filter(isWin),
    [validatedItems]
  );
  const regressions = useMemo(
    () => validatedItems.filter((item) => !isWin(item)),
    [validatedItems]
  );

  // Ungrouped changes (not in validated or watching)
  const ungroupedChanges = useMemo(() => {
    const validatedElements = new Set(validatedItems.map((i) => i.element));
    const watchingElements = new Set(watchingItems.map((i) => i.element));
    return changesSummary.changes.filter(
      (c) => !validatedElements.has(c.element) && !watchingElements.has(c.element)
    );
  }, [changesSummary.changes, validatedItems, watchingItems]);

  // Verdict accent
  const verdictClass =
    verdictTone === "positive"
      ? "dossier-verdict-positive"
      : verdictTone === "concerning"
        ? "dossier-verdict-concerning"
        : "";

  // Sidebar props
  const sidebarProps = {
    screenshotUrl,
    mobileScreenshotUrl,
    pageUrl,
    baselineDate,
    metricFocus,
    scanNumber,
    totalScans,
    runningSummary: changesSummary.running_summary,
    progress: changesSummary.progress,
    onViewFullScreenshot,
    pageId,
    currentAnalysisId,
  };

  return (
    <div className="dossier-layout">
      {/* Mobile: sidebar as top card */}
      <div className="md:hidden">
        <DossierSidebar {...sidebarProps} mobile />
      </div>

      {/* Desktop: sticky sidebar */}
      <aside className="dossier-sidebar hidden md:block">
        <DossierSidebar {...sidebarProps} />
      </aside>

      {/* Right feed */}
      <div className="dossier-feed">
        {/* 1. Verdict */}
        <section className="dossier-verdict-section">
          <h1 className={`dossier-verdict ${verdictClass}`}>
            {changesSummary.verdict}
          </h1>
          {deployContext && (
            <p className="dossier-verdict-deploy">
              Triggered by deploy{" "}
              <span className="font-mono">{deployContext.commit_sha.slice(0, 7)}</span>
              {" "}{timeAgo(deployContext.commit_timestamp)}
            </p>
          )}
        </section>

        {/* 2. MetricStrip */}
        <MetricStrip correlation={changesSummary.correlation} />

        {/* 3. Outcome groups */}
        {!isQuietScan && (
          <div className="dossier-outcomes">
            {/* Paid off */}
            {wins.length > 0 && (
              <div className="dossier-outcome-group">
                <h3 className="dossier-outcome-group-label dossier-outcome-group-emerald">
                  Paid off
                  <span className="dossier-outcome-group-count">{wins.length}</span>
                </h3>
                <div className="unified-timeline">
                  {wins.map((item) => (
                    <UnifiedTimelineCard
                      key={item.id || item.element}
                      id={getTimelineItemId(item.element, "validated", item.id)}
                      type="validated"
                      element={item.element}
                      title={item.title}
                      change={item.change}
                      friendlyText={item.friendlyText}
                      hypothesis={hypothesisMap?.[item.id]}
                      changeId={item.id}
                      checkpoints={item.checkpoints}
                      checkpointId={checkpointMap?.[item.id]?.checkpoint_id}
                      horizonDays={checkpointMap?.[item.id]?.horizon_days}
                      existingFeedback={checkpointMap?.[item.id]?.checkpoint_id ? feedbackMap?.[checkpointMap[item.id].checkpoint_id] : null}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Backfired */}
            {regressions.length > 0 && (
              <div className="dossier-outcome-group">
                <h3 className="dossier-outcome-group-label dossier-outcome-group-coral">
                  Backfired
                  <span className="dossier-outcome-group-count">{regressions.length}</span>
                </h3>
                <div className="unified-timeline">
                  {regressions.map((item) => (
                    <UnifiedTimelineCard
                      key={item.id || item.element}
                      id={getTimelineItemId(item.element, "regressed", item.id)}
                      type="regressed"
                      element={item.element}
                      title={item.title}
                      change={item.change}
                      friendlyText={item.friendlyText}
                      hypothesis={hypothesisMap?.[item.id]}
                      changeId={item.id}
                      checkpoints={item.checkpoints}
                      checkpointId={checkpointMap?.[item.id]?.checkpoint_id}
                      horizonDays={checkpointMap?.[item.id]?.horizon_days}
                      existingFeedback={checkpointMap?.[item.id]?.checkpoint_id ? feedbackMap?.[checkpointMap[item.id].checkpoint_id] : null}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Still measuring */}
            {watchingItems.length > 0 && (
              <div className="dossier-outcome-group">
                <h3 className="dossier-outcome-group-label dossier-outcome-group-amber">
                  Still measuring
                  <span className="dossier-outcome-group-count">{watchingItems.length}</span>
                </h3>
                <div className="unified-timeline">
                  {watchingItems.map((item) => {
                    const daysRemaining = Math.max(0, item.daysNeeded - item.daysOfData);
                    return (
                      <UnifiedTimelineCard
                        key={item.id || item.element}
                        id={getTimelineItemId(item.element, "watching", item.id)}
                        type="watching"
                        element={item.element}
                        title={item.title}
                        daysRemaining={daysRemaining}
                        detectedAt={item.firstDetectedAt}
                        hypothesis={hypothesisMap?.[item.id]}
                        changeId={item.id}
                        checkpoints={item.checkpoints}
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ungrouped changes */}
            {ungroupedChanges.length > 0 && (
              <div className="dossier-outcome-group">
                <h3 className="dossier-outcome-group-label dossier-outcome-group-gray">
                  Other changes
                  <span className="dossier-outcome-group-count">{ungroupedChanges.length}</span>
                </h3>
                <div className="unified-timeline">
                  {ungroupedChanges.map((change) => (
                    <UnifiedTimelineCard
                      key={`change-${change.element}-${change.detectedAt}`}
                      id={getTimelineItemId(change.element, "change")}
                      type="change"
                      element={change.element}
                      title={change.description}
                      before={change.before}
                      after={change.after}
                      detectedAt={change.detectedAt}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 5. Observations */}
        {changesSummary.observations && changesSummary.observations.length > 0 && (
          <ObservationCard
            observations={changesSummary.observations}
            validatedItems={validatedItems}
          />
        )}

        {/* 6. Next Move */}
        {sortedSuggestions.length > 0 && (
          <NextMoveSection suggestions={sortedSuggestions} />
        )}

        {/* 7. Deploy context footer */}
        {deployContext && triggerType === "deploy" && (
          <div className="dossier-deploy-footer">
            <p>
              Deploy by {deployContext.commit_author}:{" "}
              <span className="font-mono text-xs">{deployContext.commit_message}</span>
            </p>
          </div>
        )}

        {/* 8. Quiet scan empty state */}
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
    </div>
  );
}

export default ChronicleLayout;
