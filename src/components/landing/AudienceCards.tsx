"use client";

/**
 * AudienceCards - Two side-by-side cards for Vibe Coders and Technical Founders
 * "Built for how you ship"
 */

const LovableIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#FF6B6B" />
    <path d="M12 7l2.5 4h-5L12 7z" fill="white" />
    <circle cx="12" cy="15" r="2" fill="white" />
  </svg>
);

const CursorIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#000" />
    <path d="M8 6l8 6-4 1-2 5-2-12z" fill="white" />
  </svg>
);

const BoltIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#FFB800" />
    <path d="M13 5L9 13h4l-1 6 5-8h-4l1-6z" fill="white" />
  </svg>
);

const GitHubIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#24292F" />
    <path
      d="M12 6C8.7 6 6 8.7 6 12c0 2.6 1.7 4.9 4 5.7.3.1.4-.1.4-.3v-1c-1.6.4-2-.8-2-.8-.3-.7-.7-.9-.7-.9-.5-.4 0-.4 0-.4.6 0 .9.6.9.6.5.9 1.4.6 1.7.5 0-.4.2-.6.4-.8-1.3-.1-2.6-.6-2.6-2.8 0-.6.2-1.1.6-1.5-.1-.2-.3-.7 0-1.5 0 0 .5-.2 1.6.6.5-.1 1-.2 1.5-.2s1 .1 1.5.2c1.1-.8 1.6-.6 1.6-.6.3.8.1 1.3 0 1.5.4.4.6.9.6 1.5 0 2.2-1.3 2.7-2.6 2.8.2.2.4.5.4 1v1.5c0 .2.1.4.4.3 2.3-.8 4-3 4-5.7 0-3.3-2.7-6-6-6z"
      fill="white"
    />
  </svg>
);

const VercelIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="6" fill="#000" />
    <path d="M12 7l6 10H6L12 7z" fill="white" />
  </svg>
);

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
              <LovableIcon />
              <CursorIcon />
              <BoltIcon />
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
              <GitHubIcon />
              <VercelIcon />
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
