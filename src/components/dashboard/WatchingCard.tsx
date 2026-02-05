import Link from "next/link";
import type { DashboardPageData } from "@/lib/types/analysis";
import { getDomain, timeAgo } from "@/lib/utils/url";

interface WatchingCardProps {
  page: DashboardPageData;
  onDelete: (id: string) => void;
}

export function WatchingCard({ page, onDelete }: WatchingCardProps) {
  const displayName = page.name || getDomain(page.url);

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(page.id);
  };

  const lastChecked = page.last_scan?.created_at
    ? timeAgo(page.last_scan.created_at)
    : null;

  const statusText = page.last_scan?.status === "processing"
    ? "scanning..."
    : page.last_scan?.status === "pending"
    ? "queued"
    : lastChecked
    ? `stable, last checked ${lastChecked}`
    : "no scans yet";

  return (
    <Link
      href={`/pages/${page.id}`}
      className="flex items-center justify-between py-3 px-4 rounded-xl hover:bg-[rgba(255,255,255,0.4)] transition-all duration-150 group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-text-primary font-medium truncate">
          {displayName}
        </span>
        <span className="text-text-muted text-sm">
          &mdash; {statusText}
        </span>
        {page.last_scan?.status === "processing" && (
          <div className="glass-spinner w-4 h-4 flex-shrink-0" />
        )}
      </div>

      {/* Delete button */}
      <button
        onClick={handleDeleteClick}
        className="p-1.5 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
        title={`Delete ${displayName}`}
        aria-label={`Delete ${displayName}`}
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
          />
        </svg>
      </button>
    </Link>
  );
}
