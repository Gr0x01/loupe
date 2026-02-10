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
  screenshotUrl?: string | null;
  createdAt?: string;
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

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function ChronicleScreenshot({
  screenshotUrl,
  pageUrl,
  createdAt,
  onClick,
}: {
  screenshotUrl: string;
  pageUrl: string;
  createdAt?: string;
  onClick?: () => void;
}) {
  const captionDate = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="chronicle-hero-shot hidden lg:block text-left"
      aria-label="Open full page screenshot"
    >
      <div className="hero-screenshot-wrapper group">
        <div className="hero-screenshot">
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
          <div className="relative overflow-hidden rounded-b-lg">
            <img
              src={screenshotUrl}
              alt={`Screenshot of ${pageUrl}`}
              className="w-full h-auto max-h-[188px] object-cover object-top"
            />
            <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-accent bg-white/90 backdrop-blur-sm px-2 py-1 rounded shadow-sm">
                View full
              </span>
            </div>
          </div>
        </div>
      </div>
      <p className="chronicle-hero-shot-meta">
        {getDomain(pageUrl)}{captionDate ? ` · ${captionDate}` : ""}
      </p>
    </button>
  );
}

export function ChronicleLayout({
  url,
  changesSummary,
  deployContext,
  baselineDate,
  screenshotUrl,
  createdAt,
  onScreenshotClick,
}: ChronicleLayoutProps) {
  return (
    <div>
      {/* Hero section */}
      <section className="py-6 lg:py-8">
        <div className="glass-card-elevated p-6 lg:p-8">
          <div className="chronicle-hero-grid">
            <ChronicleHero
              verdict={changesSummary.verdict}
              url={url}
              baselineDate={baselineDate}
            />
            {screenshotUrl && (
              <ChronicleScreenshot
                screenshotUrl={screenshotUrl}
                pageUrl={url}
                createdAt={createdAt}
                onClick={onScreenshotClick}
              />
            )}
          </div>

          {/* Progress tracker at bottom of hero (summary only) */}
          <div className="mt-6 pt-5 border-t border-border-outer">
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
        hasError={!!changesSummary._error}
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
