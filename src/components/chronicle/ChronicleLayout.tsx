"use client";

import type { ChangesSummary, DeployContextAPI } from "@/lib/types/analysis";
import { ChronicleHero } from "./ChronicleHero";
import { WinBanner } from "./WinBanner";
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

  return (
    <div className="chronicle-layout">
      <section className="chronicle-hero-section">
        <div className="glass-card-elevated chronicle-hero-card">
          <ChronicleHero
            verdict={changesSummary.verdict}
            baselineDate={baselineDate}
            triggerType={triggerType}
            progress={{
              validated: changesSummary.progress.validated,
              watching: changesSummary.progress.watching,
              open: changesSummary.progress.open,
            }}
          />

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
                  <path d="M8 1v4M8 11v4M1 8h4M11 8h4" strokeLinecap="round" />
                </svg>
                <span className="chronicle-deploy-context-label">
                  Triggered by deploy
                  {" "}
                  <span className="chronicle-deploy-context-sha">
                    {deployContext.commit_sha.slice(0, 7)}
                  </span>
                  {" "}
                  {timeAgo(deployContext.commit_timestamp)}
                </span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Win banner (if validated items with positive correlation) */}
      {validatedItems.length > 0 && (
        <WinBanner validatedItems={validatedItems} />
      )}

      <hr className="section-divider chronicle-divider" />

      <UnifiedTimeline
        changes={changesSummary.changes}
        validatedItems={validatedItems}
        watchingItems={watchingItems}
        hasError={!!changesSummary._error}
      />

      <hr className="section-divider chronicle-divider" />

      <NextMoveSection suggestions={changesSummary.suggestions} />

      {changesSummary.running_summary && (
        <>
          <hr className="section-divider chronicle-divider" />
          <section className="chronicle-section">
            <div className="chronicle-summary-card">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                Summary
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                {changesSummary.running_summary}
              </p>
            </div>
          </section>
        </>
      )}

      {screenshotUrl && pageUrl && (
        <>
          <hr className="section-divider chronicle-divider" />
          <section className="chronicle-section">
            <SnapshotCollapsible
              screenshotUrl={screenshotUrl}
              mobileScreenshotUrl={mobileScreenshotUrl}
              pageUrl={pageUrl}
              createdAt={createdAt}
              onViewFull={onViewFullScreenshot}
            />
          </section>
        </>
      )}
    </div>
  );
}

export default ChronicleLayout;
