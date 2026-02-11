"use client";

import { ProgressGauges } from "./ProgressGauges";

function formatDateRange(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ChronicleHeroProps {
  verdict: string;
  baselineDate?: string;
  triggerType?: "manual" | "daily" | "weekly" | "deploy" | null;
  progress: {
    validated: number;
    watching: number;
    open: number;
  };
}

export function ChronicleHero({
  verdict,
  baselineDate,
  triggerType,
  progress,
}: ChronicleHeroProps) {
  const sinceDate = baselineDate ? formatDateRange(baselineDate) : "first scan";

  // Get trigger label
  const triggerLabel = triggerType
    ? {
        daily: "Daily scan",
        weekly: "Weekly scan",
        deploy: "Deploy scan",
        manual: "Manual scan",
      }[triggerType]
    : null;

  return (
    <div className="chronicle-hero-new">
      <div className="chronicle-hero-content">
        {/* Verdict - the star (now a true headline) */}
        <h1
          className="chronicle-hero-verdict-new"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {verdict}
        </h1>

        {/* Date context */}
        <p className="chronicle-hero-context">
          Since {sinceDate}
          {triggerLabel && (
            <>
              <span className="chronicle-hero-separator">&middot;</span>
              {triggerLabel}
            </>
          )}
        </p>
      </div>

      {/* Progress gauges on the right */}
      <div className="chronicle-hero-gauges">
        <ProgressGauges
          validated={progress.validated}
          watching={progress.watching}
          open={progress.open}
        />
      </div>
    </div>
  );
}
