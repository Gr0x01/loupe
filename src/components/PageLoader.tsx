"use client";

/**
 * Skeleton loading component for page content.
 * Use this for initial data fetches across the app.
 */
export function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 pt-12 pb-16">
      <div className="w-full max-w-3xl space-y-6">
        {/* Hero skeleton */}
        <div className="glass-card p-6 sm:p-8 space-y-4">
          <div className="h-8 w-3/4 bg-border-subtle/40 rounded animate-pulse" />
          <div className="h-5 w-1/2 bg-border-subtle/30 rounded animate-pulse" />
          <div className="h-4 w-1/3 bg-border-subtle/20 rounded animate-pulse" />
        </div>

        {/* Content skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="h-4 w-20 bg-border-subtle/40 rounded animate-pulse" />
              <div className="h-5 w-4/5 bg-border-subtle/30 rounded animate-pulse" />
              <div className="h-4 w-3/5 bg-border-subtle/20 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
