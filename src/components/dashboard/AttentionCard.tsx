import Link from "next/link";
import type { DashboardPageData } from "@/lib/types/analysis";
import { getDomain } from "@/lib/utils/url";

interface AttentionCardProps {
  page: DashboardPageData;
  onDelete: (id: string) => void;
}

export function AttentionCard({ page, onDelete }: AttentionCardProps) {
  const displayName = page.name || getDomain(page.url);
  const { attention_status } = page;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(page.id);
  };

  // Severity badge style
  const severityStyles = {
    high: {
      badgeClass: "dashboard-severity-high",
      label: "high",
    },
    medium: {
      badgeClass: "dashboard-severity-medium",
      label: "medium",
    },
    low: {
      badgeClass: "dashboard-severity-low",
      label: "low",
    },
  };
  const severityStyle = attention_status.severity
    ? severityStyles[attention_status.severity]
    : null;

  // Link to analysis if exists, otherwise to page timeline
  const linkHref = page.last_scan?.id
    ? `/analysis/${page.last_scan.id}`
    : `/pages/${page.id}`;

  return (
    <Link
      href={linkHref}
      className="dashboard-attention-row group"
    >
      <div className="flex items-start gap-3">
        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* Domain */}
            <p className="text-xs text-text-secondary font-mono truncate">
              {getDomain(page.url)}
            </p>
            {severityStyle && (
              <span className={`dashboard-severity-badge ${severityStyle.badgeClass}`}>
                {severityStyle.label}
              </span>
            )}
          </div>

          {/* Headline */}
          {attention_status.headline && (
            <h3 className="text-[0.95rem] leading-snug font-semibold text-text-primary mt-1">
              {attention_status.headline}
            </h3>
          )}

          {/* Subheadline */}
          {attention_status.subheadline && (
            <p className="text-[0.82rem] leading-relaxed text-text-secondary mt-1">
              {attention_status.subheadline}
            </p>
          )}

          {/* CTA */}
          <p className="dashboard-row-cta">
            See details &rarr;
          </p>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className="dashboard-row-delete p-1.5 text-text-muted hover:text-red-500 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-all duration-150 flex-shrink-0"
          title={`Delete ${displayName}`}
          aria-label={`Delete ${displayName}`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
