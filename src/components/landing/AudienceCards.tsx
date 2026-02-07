"use client";

/**
 * AudienceCards - Two side-by-side cards for Vibe Coders and Technical Founders
 * "Built for how you ship"
 *
 * Uses text-based tool pills instead of fake brand SVG logos.
 * Consistent with ScenarioCarousel's approach.
 */

const CheckIcon = () => (
  <svg
    className="w-3 h-3"
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
  </svg>
);

function ToolPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-medium text-white/60 bg-white/8 border border-white/10">
      {label}
    </span>
  );
}

function MiniAIChangelog() {
  return (
    <div className="bg-white/5 rounded-lg p-3 mt-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-score-high/20 flex items-center justify-center text-score-high">
            <CheckIcon />
          </span>
          <span className="text-xs text-white/80">Hero section refactored</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-score-high/20 flex items-center justify-center text-score-high">
            <CheckIcon />
          </span>
          <span className="text-xs text-white/80">Pricing badge removed</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-score-low/20 flex items-center justify-center text-score-low">
            <span className="text-[10px] font-bold">?</span>
          </span>
          <span className="text-xs text-white/60">What did visitors see?</span>
        </div>
      </div>
    </div>
  );
}

function MiniDeployTimeline() {
  return (
    <div className="bg-white/5 rounded-lg p-3 mt-4">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-score-high" />
          <span className="text-xs text-white/80">2:34pm — Deployed</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-score-mid" />
          <span className="text-xs text-white/80">2:35pm — Screenshot</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <span className="text-xs text-white/60">2:36pm — Changes detected</span>
        </div>
      </div>
    </div>
  );
}

export default function AudienceCards() {
  return (
    <section className="px-4 py-20 md:py-24">
      <div className="w-full max-w-5xl mx-auto">
        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-3">
            Built for how you ship
          </p>
          <h2
            className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Whether you vibe code or git push
          </h2>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Vibe Coders card */}
          <div className="audience-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <ToolPill label="Lovable" />
              <ToolPill label="Cursor" />
              <ToolPill label="Bolt" />
            </div>
            <h3
              className="text-xl sm:text-2xl text-white mb-3"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Shipping with AI?
            </h3>
            <p className="text-white/70 leading-relaxed">
              Your AI said &ldquo;Done!&rdquo; but did conversions go up or down?
              Loupe shows you what actually shipped.
            </p>
            <MiniAIChangelog />
          </div>

          {/* Technical Founders card */}
          <div className="audience-card rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <ToolPill label="GitHub" />
              <ToolPill label="Vercel" />
            </div>
            <h3
              className="text-xl sm:text-2xl text-white mb-3"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Deploying constantly?
            </h3>
            <p className="text-white/70 leading-relaxed">
              You deploy. We screenshot. You see what changed. Every push,
              tracked automatically.
            </p>
            <MiniDeployTimeline />
          </div>
        </div>
      </div>
    </section>
  );
}
