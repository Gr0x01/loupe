"use client";

/**
 * MockComparisonCard - Static demonstration of the comparison/change tracking output
 * Used on the homepage to show what Loupe catches after deploys
 */

// Evaluation status icons
const CheckIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
);

const DownArrowIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 4l-4 4-4 4" />
    <path d="M12 4H4" />
  </svg>
);

const PlusIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="3" x2="8" y2="13" />
    <line x1="3" y1="8" x2="13" y2="8" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="2 12 6 8 9 11 14 4" />
    <polyline points="10 4 14 4 14 8" />
  </svg>
);

const DeployIcon = () => (
  <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="8" cy="8" r="3" />
    <path d="M8 1v4M8 11v4M1 8h4M11 8h4" strokeLinecap="round" />
  </svg>
);

export default function MockComparisonCard() {
  return (
    <div className="glass-card-elevated p-5 sm:p-6 max-w-md w-full">
      {/* Header — scan context */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          Scan #3
        </span>
        <span className="text-text-muted">&middot;</span>
        <span className="element-badge flex items-center gap-1.5">
          <DeployIcon />
          <span>Tuesday 2:34pm</span>
        </span>
      </div>

      {/* Score Change */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
          Score
        </p>
        <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-instrument-serif)" }}>
          <span className="text-text-muted">62</span>
          <span className="text-text-muted mx-2">&rarr;</span>
          <span className="text-score-high">78</span>
          <span className="text-base text-score-high ml-2">+16</span>
        </p>
      </div>

      {/* Segmented Progress Bar */}
      <div className="mb-5">
        <div className="progress-segmented">
          <div
            className="progress-segment"
            style={{ width: "60%", backgroundColor: "var(--score-high)" }}
          />
          <div
            className="progress-segment"
            style={{ width: "20%", backgroundColor: "var(--score-mid)" }}
          />
          <div
            className="progress-segment"
            style={{ width: "20%", backgroundColor: "var(--score-low)" }}
          />
        </div>
        <div className="progress-legend">
          <span className="progress-legend-item">
            <span className="progress-legend-dot" style={{ backgroundColor: "var(--score-high)" }} />
            <span className="font-semibold">3</span> resolved
          </span>
          <span className="progress-legend-item">
            <span className="progress-legend-dot" style={{ backgroundColor: "var(--score-mid)" }} />
            <span className="font-semibold">1</span> improved
          </span>
          <span className="progress-legend-item">
            <span className="progress-legend-dot" style={{ backgroundColor: "var(--score-low)" }} />
            <span className="font-semibold">1</span> new
          </span>
        </div>
      </div>

      {/* Sample Evaluations */}
      <div className="space-y-2 mb-5">
        {/* Resolved */}
        <div className="evaluation-card p-3">
          <div className="flex items-center gap-3">
            <span className="evaluation-icon evaluation-icon-resolved">
              <CheckIcon />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">CTA below the fold</p>
              <span className="element-badge text-xs mt-1">Hero section</span>
            </div>
            <span className="evaluation-badge evaluation-badge-resolved flex-shrink-0">
              Resolved
            </span>
          </div>
        </div>

        {/* Regressed */}
        <div className="evaluation-card p-3">
          <div className="flex items-center gap-3">
            <span className="evaluation-icon evaluation-icon-regressed">
              <DownArrowIcon />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Social proof removed</p>
              <span className="element-badge text-xs mt-1">Trust section</span>
            </div>
            <span className="evaluation-badge evaluation-badge-regressed flex-shrink-0">
              Regressed
            </span>
          </div>
        </div>

        {/* New issue */}
        <div className="evaluation-card p-3">
          <div className="flex items-center gap-3">
            <span className="evaluation-icon evaluation-icon-new">
              <PlusIcon />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">Headline too vague</p>
              <span className="element-badge text-xs mt-1">Hero copy</span>
            </div>
            <span className="evaluation-badge evaluation-badge-new flex-shrink-0">
              New
            </span>
          </div>
        </div>
      </div>

      {/* Analytics Insight */}
      <div className="analytics-insight-card !p-4 !rounded-xl">
        <div className="flex items-start gap-3">
          <span className="evaluation-icon evaluation-icon-improved flex-shrink-0">
            <ChartIcon />
          </span>
          <p
            className="text-sm text-text-primary leading-relaxed"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Bounce rate dropped 12% since this change — correlated with CTA fix
          </p>
        </div>
      </div>

      {/* Fade hint */}
      <p className="text-xs text-text-muted text-center mt-4">
        +2 more changes...
      </p>
    </div>
  );
}
