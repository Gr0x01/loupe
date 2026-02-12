"use client";

import type { ValidatedItem } from "@/lib/types/analysis";

interface WinCardProps {
  bestWin: ValidatedItem;
  otherResults?: ValidatedItem[];
}

function parseChange(item: ValidatedItem): string {
  // Extract the numeric part with sign for display
  const num = parseFloat(item.change.replace(/[^-0-9.]/g, "")) || 0;
  const abs = Math.abs(num);
  return `${num >= 0 ? "+" : "-"}${abs}%`;
}

export function WinCard({ bestWin, otherResults = [] }: WinCardProps) {
  const delta = parseChange(bestWin);

  return (
    <div className="chronicle-win-card">
      <p className="chronicle-win-card-label">Your biggest win</p>

      <span className="element-badge" style={{ alignSelf: "flex-start" }}>
        {bestWin.element}
      </span>

      <div className="chronicle-win-card-delta-block">
        <span className="chronicle-win-card-delta">{delta}</span>
        <span className="chronicle-win-card-metric">{bestWin.metric.replace(/_/g, " ")}</span>
      </div>

      {bestWin.friendlyText && (
        <p className="chronicle-win-card-friendly">{bestWin.friendlyText}</p>
      )}

      {bestWin.title && (
        <p className="chronicle-win-card-title">{bestWin.title}</p>
      )}

      {/* Other validated/regressed results */}
      {otherResults.length > 0 && (
        <div className="chronicle-win-card-others">
          {otherResults.map((item) => {
            const changeNum = parseFloat(item.change.replace(/[^-0-9.]/g, "")) || 0;
            const isPositive = changeNum > 0;
            return (
              <div key={item.id || item.element} className="chronicle-win-card-other-row">
                <span className="element-badge">{item.element}</span>
                <span className={`chronicle-win-card-other-change ${isPositive ? "text-emerald" : "text-coral"}`}>
                  {item.change}
                </span>
                <span className="text-sm text-text-secondary truncate">{item.friendlyText}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
