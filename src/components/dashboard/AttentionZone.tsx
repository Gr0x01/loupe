import type { DashboardPageData } from "@/lib/types/analysis";
import { AttentionCard } from "./AttentionCard";

interface AttentionZoneProps {
  pages: DashboardPageData[];
  onDelete: (id: string) => void;
}

export function AttentionZone({ pages, onDelete }: AttentionZoneProps) {
  if (pages.length === 0) return null;

  // Sort by severity (high → medium → low), then by recency
  const sortedPages = [...pages].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    const aSeverity = a.attention_status.severity
      ? severityOrder[a.attention_status.severity]
      : 3;
    const bSeverity = b.attention_status.severity
      ? severityOrder[b.attention_status.severity]
      : 3;

    if (aSeverity !== bSeverity) {
      return aSeverity - bSeverity;
    }

    // Same severity, sort by most recent scan
    const aDate = a.last_scan?.created_at || a.created_at;
    const bDate = b.last_scan?.created_at || b.created_at;
    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  return (
    <section className="mb-10">
      {/* Zone header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="zone-header">What needs attention</h2>
        <span className="zone-count">
          {pages.length} item{pages.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {sortedPages.map((page) => (
          <AttentionCard key={page.id} page={page} onDelete={onDelete} />
        ))}
      </div>
    </section>
  );
}
