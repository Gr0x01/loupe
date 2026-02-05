export function EmptySuccessState() {
  return (
    <div className="glass-card p-8 text-center mb-10">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-score-high/10 mb-4">
        <svg className="w-6 h-6 text-score-high" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3
        className="text-xl font-bold text-text-primary mb-2"
        style={{ fontFamily: "var(--font-instrument-serif)" }}
      >
        All quiet
      </h3>
      <p className="text-text-secondary text-sm max-w-sm mx-auto">
        Your pages are stable. We&apos;ll let you know if anything needs your attention.
      </p>
    </div>
  );
}
