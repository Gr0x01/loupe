import type { SupabaseIntegration } from "./types";

function SupabaseIcon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 109 113" fill="none">
      <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint0_linear)"/>
      <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint1_linear)" fillOpacity="0.2"/>
      <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E"/>
      <defs>
        <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
          <stop stopColor="#249361"/>
          <stop offset="1" stopColor="#3ECF8E"/>
        </linearGradient>
        <linearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
          <stop/>
          <stop offset="1" stopOpacity="0"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SupabaseSection({
  supabase,
  onConnect,
  onDisconnect,
  disconnecting,
}: {
  supabase: SupabaseIntegration | null;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
}) {
  return (
    <section className="mb-4">
      <div className="glass-card-elevated p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#1C1C1C] flex items-center justify-center flex-shrink-0">
              <SupabaseIcon />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-text-primary">Supabase</h3>
              <p className="text-sm text-text-secondary">
                Track signups and orders from your database
              </p>
            </div>
          </div>

          {!supabase ? (
            <button
              onClick={onConnect}
              className="btn-primary w-full sm:w-auto"
            >
              Connect
            </button>
          ) : (
            <button
              onClick={onDisconnect}
              disabled={disconnecting}
              className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50 self-end sm:self-auto"
            >
              {disconnecting ? "Disconnecting..." : "Disconnect"}
            </button>
          )}
        </div>

        {supabase && (
          <div className="mt-6 pt-6 border-t border-border-subtle">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#3ECF8E] flex items-center justify-center">
                <span className="text-white font-bold text-sm">S</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary truncate">
                  {supabase.project_name}
                </p>
                <p className="text-xs text-text-muted">
                  {supabase.key_type === "service_role"
                    ? "Service Role Key"
                    : "Anon Key"}{" "}
                  · {supabase.tables.length} tables found
                </p>
              </div>
            </div>

            {/* Show warning only for anon key with no tables - service role sees everything */}
            {supabase.key_type === "anon" && supabase.tables.length === 0 && (
              <div className="glass-card p-4 bg-score-mid/5 border-l-4 border-score-mid mb-4">
                <p className="text-sm text-text-primary font-medium">We might be missing some tables</p>
                <p className="text-sm text-text-secondary mt-1">
                  With an Anon Key, we can only see tables your app&apos;s frontend can access. If you have tables like orders or signups that need authentication, we can&apos;t see them.
                </p>
                <button
                  onClick={onConnect}
                  className="text-sm text-accent font-medium mt-2 hover:text-accent-hover transition-colors"
                >
                  Use Service Role Key instead
                </button>
              </div>
            )}

            {/* For service role key with no tables, it means database is empty */}
            {supabase.key_type === "service_role" && supabase.tables.length === 0 && (
              <div className="glass-card p-4 bg-bg-inset mb-4">
                <p className="text-sm text-text-primary font-medium">No tables found</p>
                <p className="text-sm text-text-secondary mt-1">
                  Your database doesn&apos;t have any tables in the public schema yet. Once you create tables like &quot;users&quot; or &quot;orders&quot;, we&apos;ll track them automatically.
                </p>
              </div>
            )}

            {supabase.tables.length > 0 && (
              <div className="glass-card p-4 mb-4">
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                  Tables detected
                </p>
                <div className="flex flex-wrap gap-2">
                  {supabase.tables.slice(0, 8).map((table) => (
                    <span
                      key={table}
                      className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-mono bg-bg-inset text-text-secondary"
                    >
                      {table}
                    </span>
                  ))}
                  {supabase.tables.length > 8 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm text-text-muted">
                      +{supabase.tables.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            )}

            <p className="text-sm text-text-muted">
              <span className="font-medium">How it works:</span>{" "}
              We track row counts in tables like signups, orders, and waitlist to correlate page changes with real business outcomes.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
