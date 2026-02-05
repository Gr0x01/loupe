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

  // Severity dot color
  const severityColors = {
    high: "bg-score-low",
    medium: "bg-score-mid",
    low: "bg-text-muted",
  };
  const dotColor = attention_status.severity
    ? severityColors[attention_status.severity]
    : "bg-text-muted";

  // Link to analysis if exists, otherwise to page timeline
  const linkHref = page.last_scan?.id
    ? `/analysis/${page.last_scan.id}`
    : `/pages/${page.id}`;

  return (
    <Link
      href={linkHref}
      className="glass-card p-5 block hover:border-[rgba(91,46,145,0.15)] transition-all duration-150 group"
    >
      <div className="flex items-start gap-4">
        {/* Severity dot */}
        <div className="flex-shrink-0 pt-1.5">
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          {/* Domain */}
          <p className="text-sm text-text-muted font-mono truncate">
            {getDomain(page.url)}
          </p>

          {/* Headline */}
          {attention_status.headline && (
            <h3 className="text-base font-semibold text-text-primary mt-1">
              {attention_status.headline}
            </h3>
          )}

          {/* Subheadline */}
          {attention_status.subheadline && (
            <p className="text-sm text-text-secondary mt-0.5">
              {attention_status.subheadline}
            </p>
          )}

          {/* CTA */}
          <p className="text-sm font-medium text-accent mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
            See details &rarr;
          </p>
        </div>

        {/* Delete button */}
        <button
          onClick={handleDeleteClick}
          className="p-2 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-150 flex-shrink-0"
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
