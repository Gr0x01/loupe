import Link from "next/link";
import type { DetectedChange } from "@/lib/types/analysis";
import { ResultCard } from "./ResultCard";

interface ResultsZoneProps {
  changes: (DetectedChange & { domain?: string })[];
  stats: {
    totalValidated: number;
    totalRegressed: number;
    cumulativeImprovement: number;
  };
  highlightId?: string;
}

export function ResultsZone({ changes, stats, highlightId }: ResultsZoneProps) {
  // Don't render if no results
  if (changes.length === 0) return null;

  const totalResults = stats.totalValidated + stats.totalRegressed;
  const showSeeAll = totalResults > 4;

  // Generate tally text
  let tallyText = "";
  if (stats.totalValidated > 0 && stats.cumulativeImprovement > 0) {
    tallyText = `${stats.totalValidated} validated win${stats.totalValidated > 1 ? "s" : ""}`;
    if (stats.cumulativeImprovement >= 1) {
      tallyText += ` · Your pages are ${Math.round(stats.cumulativeImprovement)}% better`;
    }
  }

  return (
    <section className="mb-8">
      {/* Zone header */}
      <div className="flex items-center justify-between mb-4">
        <span className="results-zone-header">
          Your Results
        </span>
        {tallyText && (
          <span className="text-sm text-text-muted">
            {tallyText}
          </span>
        )}
      </div>

      {/* Results grid */}
      <div className="results-grid">
        {changes.slice(0, 4).map((change) => (
          <ResultCard
            key={change.id}
            change={change}
            highlight={change.id === highlightId}
          />
        ))}
      </div>

      {/* See all link */}
      {showSeeAll && (
        <div className="mt-4 text-center">
          <Link
            href="/results"
            className="text-sm font-medium text-text-secondary hover:text-signal transition-colors"
          >
            See all {totalResults} results →
          </Link>
        </div>
      )}
    </section>
  );
}
