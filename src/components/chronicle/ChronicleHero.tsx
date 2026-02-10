"use client";

function formatDateRange(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface ChronicleHeroProps {
  verdict: string;
  url: string;
  baselineDate?: string;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export function ChronicleHero({ verdict, url, baselineDate }: ChronicleHeroProps) {
  const sinceDate = baselineDate ? formatDateRange(baselineDate) : "first scan";

  return (
    <div className="chronicle-hero">
      {/* Date context line */}
      <p className="chronicle-hero-kicker">
        Your page since {sinceDate}
      </p>

      {/* Verdict - the star */}
      <h1
        className="chronicle-hero-verdict text-text-primary"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {verdict}
      </h1>

      {/* Domain badge */}
      <div className="mt-5 flex items-center gap-2 text-sm text-text-muted">
        <span className="url-badge py-1.5 px-3">{getDomain(url)}</span>
      </div>
    </div>
  );
}
