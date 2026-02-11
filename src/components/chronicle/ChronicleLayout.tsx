"use client";

import type { ChangesSummary, DeployContextAPI } from "@/lib/types/analysis";
import { ChronicleHero } from "./ChronicleHero";
import { SnapshotCollapsible } from "./SnapshotCollapsible";
import { WinBanner } from "./WinBanner";
import { UnifiedTimeline } from "./UnifiedTimeline";
import { NextMoveSection } from "./NextMoveSection";

interface ChronicleLayoutProps {
  url: string;
  changesSummary: ChangesSummary;
  deployContext?: DeployContextAPI | null;
  baselineDate?: string;
  screenshotUrl?: string | null;
  createdAt?: string;
  triggerType?: "manual" | "daily" | "weekly" | "deploy" | null;
  onScreenshotClick?: () => void;
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
  url,
  changesSummary,
  deployContext,
  baselineDate,
  screenshotUrl,
  createdAt,
  triggerType,
  onScreenshotClick,
}: ChronicleLayoutProps) {
  const validatedItems = changesSummary.progress.validatedItems || [];
  const watchingItems = changesSummary.progress.watchingItems || [];

  return (
    <div>
      {/* Hero section - redesigned */}
      <section className="py-6 lg:py-8">
        <div className="glass-card-elevated p-6 lg:p-8">
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

          {/* Deploy context (if present) */}
          {deployContext && (
            <div className="mt-4 pt-4 border-t border-border-outer">
              <div className="flex items-center gap-3 text-sm">
                <svg
                  className="w-4 h-4 text-text-muted"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="8" cy="8" r="3" />
                  <path d="M8 1v4M8 11v4M1 8h4M11 8h4" strokeLinecap="round" />
                </svg>
                <span className="text-text-muted">
                  Triggered by deploy{" "}
                  <span className="font-mono text-text-secondary">
                    {deployContext.commit_sha.slice(0, 7)}
                  </span>
                  {" "}{timeAgo(deployContext.commit_timestamp)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Snapshot collapsible - tucked below hero */}
        {screenshotUrl && (
          <div className="mt-3">
            <SnapshotCollapsible
              screenshotUrl={screenshotUrl}
              pageUrl={url}
              createdAt={createdAt}
              onViewFull={onScreenshotClick}
            />
          </div>
        )}
      </section>

      {/* Win banner (if validated items with positive correlation) */}
      {validatedItems.length > 0 && (
        <WinBanner validatedItems={validatedItems} />
      )}

      <hr className="section-divider" />

      {/* Unified timeline - Changes + Validated + Watching */}
      <UnifiedTimeline
        changes={changesSummary.changes}
        validatedItems={validatedItems}
        watchingItems={watchingItems}
        hasError={!!changesSummary._error}
      />

      <hr className="section-divider" />

      {/* Your next move - Suggestions */}
      <NextMoveSection suggestions={changesSummary.suggestions} />

      {/* Running summary (if present) */}
      {changesSummary.running_summary && (
        <>
          <hr className="section-divider" />
          <section className="chronicle-section">
            <div className="glass-card p-6">
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
    </div>
  );
}

export default ChronicleLayout;
