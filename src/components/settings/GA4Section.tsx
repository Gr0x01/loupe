import type { GA4Integration } from "./types";

function GA4Icon() {
  return (
    <svg className="w-6 h-6" viewBox="0 0 55.273 64" fill="none">
      <g transform="matrix(.363638 0 0 .363636 -7.272763 -2.909091)">
        <path d="M130 29v132c0 14.77 10.2 23 21 23 10 0 21-7 21-23V30c0-13.54-10-22-21-22s-21 9.33-21 21z" fill="#f9ab00"/>
        <g fill="#e37400">
          <path d="M75 96v65c0 14.77 10.2 23 21 23 10 0 21-7 21-23V97c0-13.54-10-22-21-22s-21 9.33-21 21z"/>
          <circle cx="41" cy="163" r="21"/>
        </g>
      </g>
    </svg>
  );
}

export function GA4Section({
  ga4,
  onConnect,
  onDisconnect,
  disconnecting,
  onSelectProperty,
}: {
  ga4: GA4Integration | null;
  onConnect: () => void;
  onDisconnect: () => void;
  disconnecting: boolean;
  onSelectProperty: () => void;
}) {
  return (
    <section className="mb-4">
      <div className="glass-card-elevated p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-border-subtle flex items-center justify-center flex-shrink-0">
              <GA4Icon />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg sm:text-xl font-semibold text-text-primary">Google Analytics 4</h3>
              <p className="text-sm text-text-secondary">
                See pageviews and bounce rate with each scan
              </p>
            </div>
          </div>

          {!ga4 ? (
            <button onClick={onConnect} className="btn-primary w-full sm:w-auto">
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

        {ga4 && (
          <div className="mt-6 pt-6 border-t border-border-subtle">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-full bg-[#EA4335] flex items-center justify-center">
                <span className="text-white font-bold text-sm">G</span>
              </div>
              <div className="flex-1 min-w-0">
                {ga4.property_id ? (
                  <>
                    <p className="font-medium text-text-primary truncate">
                      {ga4.property_name || `Property ${ga4.property_id}`}
                    </p>
                    <p className="text-xs text-text-muted">
                      Connected via Google
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-medium text-text-primary">
                      Property not selected
                    </p>
                    <p className="text-xs text-text-muted">
                      Connected via Google
                    </p>
                  </>
                )}
              </div>
              {ga4.pending_property_selection && (
                <button
                  onClick={onSelectProperty}
                  className="text-sm text-accent font-medium hover:text-accent-hover transition-colors"
                >
                  Select property
                </button>
              )}
            </div>

            {ga4.pending_property_selection && (
              <div className="glass-card p-4 bg-score-low/5 border-l-4 border-score-low mb-4">
                <p className="text-sm text-text-primary font-medium">Action required</p>
                <p className="text-sm text-text-secondary mt-1">
                  Select a GA4 property to start pulling analytics data.
                </p>
              </div>
            )}

            <div className="glass-card p-4 bg-[rgba(255,90,54,0.04)]">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">How it works:</span>{" "}
                We&apos;ll pull your analytics so you can see if changes actually moved the&nbsp;needle.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
