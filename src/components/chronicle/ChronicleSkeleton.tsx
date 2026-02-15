"use client";

/**
 * Skeleton loader that mirrors the dossier two-panel layout.
 * Prevents layout shift while analysis data loads.
 */
export function ChronicleSkeleton() {
  return (
    <div className="dossier-layout" aria-hidden="true">
      {/* ── Sidebar ── */}
      <aside className="dossier-sidebar">
        <div className="dossier-sidebar-inner">
          {/* Screenshot placeholder */}
          <div className="dossier-skeleton-screenshot dossier-skeleton-bar" />

          {/* Identity: domain + scan label */}
          <div className="flex flex-col gap-2 px-1">
            <div className="dossier-skeleton-bar h-4 w-3/4" />
            <div className="dossier-skeleton-bar h-3 w-1/2" />
          </div>

          {/* Scorecard rows */}
          <div className="flex flex-col gap-3 mt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="dossier-skeleton-bar dossier-skeleton-dot" />
                <div
                  className="dossier-skeleton-bar h-3"
                  style={{ width: `${55 + i * 10}%` }}
                />
              </div>
            ))}
          </div>

          {/* Summary block */}
          <div className="flex flex-col gap-2 mt-2">
            <div className="dossier-skeleton-bar h-3 w-20" />
            <div className="dossier-skeleton-bar h-3 w-full" />
            <div className="dossier-skeleton-bar h-3 w-5/6" />
            <div className="dossier-skeleton-bar h-3 w-2/3" />
          </div>
        </div>
      </aside>

      {/* ── Feed ── */}
      <div className="dossier-feed flex flex-col gap-6">
        {/* Verdict */}
        <div className="flex flex-col gap-2">
          <div className="dossier-skeleton-bar h-6 w-2/3" />
          <div className="dossier-skeleton-bar h-4 w-5/6" />
        </div>

        {/* Metric strip pills */}
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="dossier-skeleton-bar dossier-skeleton-pill"
            />
          ))}
        </div>

        {/* Timeline cards */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="dossier-skeleton-card">
            <div className="dossier-skeleton-card-accent" />
            <div className="flex flex-col gap-2 flex-1 py-4 pr-4">
              <div className="dossier-skeleton-bar h-4 w-3/5" />
              <div className="dossier-skeleton-bar h-3 w-full" />
              <div
                className="dossier-skeleton-bar h-3"
                style={{ width: `${60 + i * 10}%` }}
              />
            </div>
          </div>
        ))}

        {/* Suggestion section */}
        <div className="flex flex-col gap-3 mt-2">
          <div className="dossier-skeleton-bar h-4 w-32" />
          {[1, 2].map((i) => (
            <div key={i} className="dossier-skeleton-card">
              <div className="dossier-skeleton-card-accent" />
              <div className="flex flex-col gap-2 flex-1 py-4 pr-4">
                <div className="dossier-skeleton-bar h-4 w-2/5" />
                <div className="dossier-skeleton-bar h-3 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
