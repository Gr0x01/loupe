import Link from "next/link";

export function EmptyOnboardingState() {
  return (
    <div className="glass-card p-10 text-center">
      <div className="max-w-md mx-auto">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-accent/10 mb-5">
          <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <h3
          className="text-2xl font-bold text-text-primary mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start watching your site
        </h3>
        <p className="text-text-secondary mb-6">
          Run a free audit to see what&apos;s working and what&apos;s not. Then track changes over time to see how your updates affect conversions.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Audit a page &rarr;
        </Link>
      </div>
    </div>
  );
}
