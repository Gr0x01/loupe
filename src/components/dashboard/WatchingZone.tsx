import type { DashboardPageData } from "@/lib/types/analysis";
import { WatchingCard } from "./WatchingCard";

interface WatchingZoneProps {
  pages: DashboardPageData[];
  onDelete?: (id: string) => void;
  onAddPage?: () => void;
  isAtLimit?: boolean;
  demo?: boolean;
}

export function WatchingZone({
  pages,
  onDelete,
  onAddPage,
  isAtLimit = false,
  demo = false,
}: WatchingZoneProps) {
  return (
    <section>
      {/* Zone header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="zone-header">Watching (no action needed)</h2>
        {pages.length > 0 && (
          <span className="zone-count">
            {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Cards or empty message */}
      {pages.length > 0 ? (
        <div className="dashboard-zone-surface">
          {pages.map((page) => (
            <WatchingCard key={page.id} page={page} onDelete={onDelete} demo={demo} />
          ))}
        </div>
      ) : (
        <p className="text-text-muted text-sm">
          Pages move here when there&apos;s nothing left to fix.
          <br />
          Right now, your pages have findings worth addressing.
        </p>
      )}

      {/* Add page button - hide in demo mode */}
      {!demo && (isAtLimit ? (
        <button
          onClick={onAddPage}
          className="mt-4 group flex items-center gap-3 px-4 py-3 rounded-xl
                     bg-[rgba(255,90,54,0.04)] border border-[rgba(255,90,54,0.12)]
                     hover:bg-[rgba(255,90,54,0.08)] hover:border-[rgba(255,90,54,0.2)]
                     transition-all"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg
                          bg-[rgba(255,90,54,0.08)] group-hover:bg-[rgba(255,90,54,0.12)] transition-colors">
            {/* Share icon */}
            <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </div>
          <div className="text-left">
            <span className="text-accent font-semibold text-sm">Add another page</span>
            <span className="block text-text-muted text-xs">Share Loupe to unlock more slots</span>
          </div>
        </button>
      ) : (
        <button
          onClick={onAddPage}
          className="mt-4 flex items-center gap-2 text-accent font-medium
                     hover:text-accent-hover transition-colors
                     px-3 py-2 -ml-3 rounded-lg hover:bg-[rgba(255,90,54,0.05)]"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Watch another page
        </button>
      ))}
    </section>
  );
}
