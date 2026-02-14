"use client";

import type { Correlation } from "@/lib/types/analysis";

interface MetricStripProps {
  correlation: Correlation | null;
}

export function MetricStrip({ correlation }: MetricStripProps) {
  if (!correlation?.metrics?.length) return null;

  return (
    <div className="dossier-metric-strip">
      {correlation.metrics.map((metric) => {
        const colorClass =
          metric.assessment === "improved"
            ? "dossier-metric-badge-improved"
            : metric.assessment === "regressed"
              ? "dossier-metric-badge-regressed"
              : "dossier-metric-badge-neutral";

        const arrow =
          metric.assessment === "improved"
            ? "\u2191"
            : metric.assessment === "regressed"
              ? "\u2193"
              : "\u2022";

        return (
          <div key={metric.name} className={`dossier-metric-badge ${colorClass}`}>
            <span className="dossier-metric-badge-label">{metric.friendlyName}</span>
            <span className="dossier-metric-badge-value">
              {arrow} {metric.change}
            </span>
          </div>
        );
      })}
    </div>
  );
}
