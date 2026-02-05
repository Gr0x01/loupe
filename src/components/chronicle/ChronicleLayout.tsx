"use client";

import type { ChangesSummary, DeployContextAPI } from "@/lib/types/analysis";
import { ChronicleHero } from "./ChronicleHero";
import { WhatChangedSection } from "./WhatChangedSection";
import { WhatToDoNextSection } from "./WhatToDoNextSection";
import { ProgressTracker } from "./ProgressTracker";

interface ChronicleLayoutProps {
  url: string;
  changesSummary: ChangesSummary;
  deployContext?: DeployContextAPI | null;
  baselineDate?: string;
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
}: ChronicleLayoutProps) {
  return (
    <div>
      {/* Hero section */}
      <section className="py-8 lg:py-12">
        <div className="glass-card-elevated p-8 lg:p-10">
          <ChronicleHero
            verdict={changesSummary.verdict}
            url={url}
            baselineDate={baselineDate}
          />

          {/* Progress tracker at bottom of hero (summary only) */}
          <div className="mt-8 pt-6 border-t border-border-outer">
            <ProgressTracker
              validated={changesSummary.progress.validated}
              watching={changesSummary.progress.watching}
              open={changesSummary.progress.open}
              summaryOnly
            />
          </div>

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
      </section>

      <hr className="section-divider" />

      {/* What changed */}
      <WhatChangedSection
        changes={changesSummary.changes}
        correlation={changesSummary.correlation}
      />

      <hr className="section-divider" />

      {/* What to do next */}
      <WhatToDoNextSection suggestions={changesSummary.suggestions} />

      <hr className="section-divider" />

      {/* Progress section (detailed) */}
      <section className="chronicle-section">
        <div className="chronicle-section-header">
          <h2
            className="text-2xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Progress
          </h2>
        </div>

        <div className="glass-card p-6">
          {/* Expandable progress tracker */}
          <ProgressTracker
            validated={changesSummary.progress.validated}
            watching={changesSummary.progress.watching}
            open={changesSummary.progress.open}
            validatedItems={changesSummary.progress.validatedItems}
            watchingItems={changesSummary.progress.watchingItems}
            openItems={changesSummary.progress.openItems}
          />

          {/* Running summary */}
          {changesSummary.running_summary && (
            <div className="mt-6 pt-6 border-t border-border-outer">
              <p className="text-sm text-text-secondary leading-relaxed">
                {changesSummary.running_summary}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default ChronicleLayout;
