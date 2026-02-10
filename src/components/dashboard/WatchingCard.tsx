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
    ? "Scanning now"
    : page.last_scan?.status === "pending"
    ? "Queued for scan"
    : lastChecked
    ? `Stable - checked ${lastChecked}`
    : "No scans yet";

  return (
    <Link
      href={`/pages/${page.id}`}
      className="dashboard-watching-row group"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[0.92rem] leading-snug text-text-primary font-medium truncate">
          {displayName}
        </p>
        <div className="mt-1 flex items-center gap-2 min-w-0">
          <span
            className={`dashboard-status-dot ${page.last_scan?.status === "processing" ? "dashboard-status-dot-live" : ""}`}
            aria-hidden="true"
          />
          <p className="text-text-muted text-[0.8rem] leading-snug truncate">
            {statusText}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 pl-2">
        {page.last_scan?.status === "processing" && (
          <div className="glass-spinner w-4 h-4 flex-shrink-0" />
        )}

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className="dashboard-row-delete p-1.5 text-text-muted hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-all duration-150 flex-shrink-0"
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
      </div>
    </Link>
  );
}
