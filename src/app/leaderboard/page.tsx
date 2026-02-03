"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LeaderboardEntry {
  rank: number;
  analysis_id: string;
  url: string;
  domain: string;
  score: number;
  improvement?: number;
  first_score?: number;
  screenshot_url: string | null;
  created_at: string;
}

type Category = "top_scores" | "most_improved";
type Period = "month" | "all_time";

function scoreColor(score: number): string {
  if (score >= 80) return "text-score-high";
  if (score >= 60) return "text-score-mid";
  return "text-score-low";
}

function scoreBgColor(score: number): string {
  if (score >= 80) return "bg-[rgba(26,140,91,0.08)]";
  if (score >= 60) return "bg-[rgba(212,148,10,0.08)]";
  return "bg-[rgba(194,59,59,0.08)]";
}

function scoreGlowStyle(score: number): React.CSSProperties {
  if (score >= 80) return { boxShadow: "0 0 24px rgba(26,140,91,0.25), 0 2px 8px rgba(0,0,0,0.08)" };
  if (score >= 60) return { boxShadow: "0 0 24px rgba(212,148,10,0.2), 0 2px 8px rgba(0,0,0,0.08)" };
  return { boxShadow: "0 0 24px rgba(194,59,59,0.2), 0 2px 8px rgba(0,0,0,0.08)" };
}

function ScreenshotThumbnail({ url, domain }: { url: string | null; domain: string }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[rgba(91,46,145,0.04)] to-[rgba(91,46,145,0.08)]">
        <svg className="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`Screenshot of ${domain}`}
      className="w-full h-full object-cover object-top"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function TopThreeCard({ entry, showImprovement }: { entry: LeaderboardEntry; showImprovement: boolean }) {
  // Medal gradients for rank accent
  const rankStyles: Record<number, { gradient: string; label: string }> = {
    1: { gradient: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%)", label: "1st" },
    2: { gradient: "linear-gradient(135deg, #E8E8E8 0%, #A8A8A8 50%, #E8E8E8 100%)", label: "2nd" },
    3: { gradient: "linear-gradient(135deg, #CD7F32 0%, #A0522D 50%, #CD7F32 100%)", label: "3rd" },
  };
  const rank = rankStyles[entry.rank] || { gradient: "transparent", label: `${entry.rank}` };

  return (
    <Link
      href={`/analysis/${entry.analysis_id}`}
      className="block rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-[rgba(0,0,0,0.04)] group transition-all duration-200 hover:shadow-lg hover:ring-[rgba(91,46,145,0.1)]"
    >
      {/* Metallic rank stripe */}
      <div className="h-1" style={{ background: rank.gradient }} />

      {/* Screenshot with score overlay */}
      <div className="relative aspect-[4/3]">
        <ScreenshotThumbnail url={entry.screenshot_url} domain={entry.domain} />

        {/* Score - bottom right, semantic color */}
        <div
          className={`absolute bottom-3 right-3 px-3 py-1.5 rounded-xl ${scoreBgColor(entry.score)} backdrop-blur-sm`}
          style={scoreGlowStyle(entry.score)}
        >
          {showImprovement && entry.improvement !== undefined && (
            <span className="text-xs font-bold text-score-high mr-2">+{entry.improvement}</span>
          )}
          <span
            className={`text-2xl font-bold ${scoreColor(entry.score)}`}
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {entry.score}
          </span>
        </div>
      </div>

      {/* Domain + rank label */}
      <div className="px-3 py-2.5 flex items-center justify-between">
        <p className="font-semibold text-text-primary text-sm truncate group-hover:text-accent transition-colors flex-1">
          {entry.domain}
        </p>
        <span className="text-xs font-medium text-text-muted ml-2 shrink-0">{rank.label}</span>
      </div>
    </Link>
  );
}

function ListCard({ entry, showImprovement }: { entry: LeaderboardEntry; showImprovement: boolean }) {
  return (
    <Link
      href={`/analysis/${entry.analysis_id}`}
      className="flex items-center gap-4 px-4 py-3 rounded-xl bg-white ring-1 ring-[rgba(0,0,0,0.04)] group transition-all duration-150 hover:shadow-md hover:ring-[rgba(91,46,145,0.08)]"
    >
      {/* Rank number */}
      <span className="text-sm font-semibold text-text-muted w-6 text-center shrink-0">
        {entry.rank}
      </span>

      {/* Small thumbnail */}
      <div className="w-14 h-10 rounded-lg overflow-hidden shrink-0 ring-1 ring-[rgba(0,0,0,0.04)]">
        <ScreenshotThumbnail url={entry.screenshot_url} domain={entry.domain} />
      </div>

      {/* Domain */}
      <span className="flex-1 font-medium text-text-primary truncate group-hover:text-accent transition-colors">
        {entry.domain}
      </span>

      {/* Improvement badge (if applicable) */}
      {showImprovement && entry.improvement !== undefined && (
        <span className="text-xs font-bold text-score-high px-2 py-0.5 rounded-full bg-[rgba(26,140,91,0.08)]">
          +{entry.improvement}
        </span>
      )}

      {/* Score */}
      <span
        className={`text-lg font-bold ${scoreColor(entry.score)} shrink-0`}
        style={{ fontFamily: "var(--font-instrument-serif)" }}
      >
        {entry.score}
      </span>
    </Link>
  );
}

/**
 * Compact filter bar - text links separated by pipes.
 * Maximum 44px tall. No decorative containers.
 */
function FilterBar({
  category,
  onCategoryChange,
  period,
  onPeriodChange,
}: {
  category: Category;
  onCategoryChange: (c: Category) => void;
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 text-sm">
      {/* Category: Top / Improved */}
      <button
        onClick={() => onCategoryChange("top_scores")}
        className={`px-2 py-1 rounded transition-colors ${
          category === "top_scores"
            ? "text-text-primary font-semibold"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        Top
      </button>
      <span className="text-text-muted/50">|</span>
      <button
        onClick={() => onCategoryChange("most_improved")}
        className={`px-2 py-1 rounded transition-colors ${
          category === "most_improved"
            ? "text-text-primary font-semibold"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        Improved
      </button>

      {/* Separator dot */}
      <span className="text-text-muted/30 mx-1">&#8226;</span>

      {/* Period: Month / All */}
      <button
        onClick={() => onPeriodChange("month")}
        className={`px-2 py-1 rounded transition-colors ${
          period === "month"
            ? "text-text-primary font-semibold"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        Month
      </button>
      <span className="text-text-muted/50">|</span>
      <button
        onClick={() => onPeriodChange("all_time")}
        className={`px-2 py-1 rounded transition-colors ${
          period === "all_time"
            ? "text-text-primary font-semibold"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        All
      </button>
    </div>
  );
}

/**
 * Content wrapper with fade transition when key changes.
 */
function FadeTransition({
  filterKey,
  children,
}: {
  filterKey: string;
  children: React.ReactNode;
}) {
  const [displayedKey, setDisplayedKey] = useState(filterKey);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (filterKey !== displayedKey) {
      // Fade out
      setIsVisible(false);

      // After fade out, update content and fade in
      const timeout = setTimeout(() => {
        setDisplayedKey(filterKey);
        setIsVisible(true);
      }, 150);

      return () => clearTimeout(timeout);
    }
  }, [filterKey, displayedKey]);

  return (
    <div
      className={`transition-opacity duration-150 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}

function EmptyState({ category, period }: { category: Category; period: Period }) {
  const isImproved = category === "most_improved";
  const message = isImproved
    ? "No improved pages yet. Run multiple audits on the same page to track your progress."
    : period === "month"
      ? "No audits this month yet. Be the first to claim the top spot."
      : "No audits yet. Be the first to claim the top spot.";

  return (
    <div className="glass-card-elevated p-12 text-center">
      <div className="max-w-sm mx-auto">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[rgba(91,46,145,0.06)] flex items-center justify-center">
          {isImproved ? (
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ) : (
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          )}
        </div>
        <h3
          className="text-2xl text-text-primary mb-3"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          {isImproved ? "No improvements yet" : "The board is empty"}
        </h3>
        <p className="text-text-secondary mb-8">{message}</p>
        <Link href="/" className="btn-primary inline-block">
          Audit your page
        </Link>
      </div>
    </div>
  );
}

export default function LeaderboardPage() {
  const [category, setCategory] = useState<Category>("top_scores");
  const [period, setPeriod] = useState<Period>("all_time");
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refetchKey, setRefetchKey] = useState(0);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/leaderboard?category=${category}&period=${period}&limit=20`);
        if (!res.ok) {
          setError("Failed to load leaderboard");
          return;
        }
        const data = await res.json();
        setEntries(data.entries || []);
      } catch {
        setError("Failed to load leaderboard");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [category, period, refetchKey]);

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);
  const showImprovement = category === "most_improved";

  // Key for fade transition - changes when filters change
  const contentKey = `${category}-${period}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-10">
        <p className="text-xs sm:text-sm font-medium text-accent uppercase tracking-wide mb-2 sm:mb-3">
          {category === "top_scores" ? "Top Performers" : "Biggest Gains"}
        </p>
        <h1
          className="text-3xl sm:text-4xl md:text-5xl text-text-primary mb-3 sm:mb-4"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          {category === "top_scores"
            ? "The best-audited pages on the web"
            : "From good to great"}
        </h1>
        <p className="text-base sm:text-lg text-text-secondary max-w-lg mx-auto">
          {category === "top_scores"
            ? "Sites that got their messaging, CTAs, and trust signals right."
            : "Pages that improved the most since their first audit."}
        </p>
      </div>

      {/* Filter Bar - compact text links */}
      <div className="mb-6 sm:mb-10">
        <FilterBar
          category={category}
          onCategoryChange={setCategory}
          period={period}
          onPeriodChange={setPeriod}
        />
      </div>

      {/* Content with fade transition */}
      <FadeTransition filterKey={contentKey}>
        {loading ? (
          <div className="text-center py-20">
            <div className="glass-spinner mx-auto" />
            <p className="text-text-secondary mt-4">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <p className="text-text-secondary text-lg mb-4">{error}</p>
            <button
              onClick={() => setRefetchKey((k) => k + 1)}
              className="btn-primary"
            >
              Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState category={category} period={period} />
        ) : (
          <>
            {/* Top 3 podium */}
            {topThree.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                {/* Reorder for podium effect on desktop: 2, 1, 3 */}
                {topThree.length >= 2 && (
                  <div className="sm:order-1 order-2">
                    <TopThreeCard entry={topThree[1]} showImprovement={showImprovement} />
                  </div>
                )}
                {topThree.length >= 1 && (
                  <div className="sm:order-2 order-1 sm:-mt-4">
                    <TopThreeCard entry={topThree[0]} showImprovement={showImprovement} />
                  </div>
                )}
                {topThree.length >= 3 && (
                  <div className="sm:order-3 order-3">
                    <TopThreeCard entry={topThree[2]} showImprovement={showImprovement} />
                  </div>
                )}
              </div>
            )}

            {/* Rest of the list - horizontal rows */}
            {rest.length > 0 && (
              <div className="mt-10">
                <h3 className="text-sm font-medium text-text-muted uppercase tracking-wide mb-4">
                  Also on the board
                </h3>
                <div className="flex flex-col gap-2">
                  {rest.map((entry) => (
                    <ListCard
                      key={entry.analysis_id}
                      entry={entry}
                      showImprovement={showImprovement}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </FadeTransition>

      {/* Bottom CTA Section */}
      <section className="mt-12 sm:mt-16 glass-card-elevated p-6 sm:p-8 md:p-10 text-center">
        <h2
          className="text-xl sm:text-2xl md:text-3xl text-text-primary mb-3"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Think your page belongs here?
        </h2>
        <p className="text-sm sm:text-base text-text-secondary mb-6 sm:mb-8 max-w-md mx-auto">
          Audit your landing page and see how it stacks up. Fix the issues, re-scan, and climb the board.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/" className="btn-primary">
            Audit your page
          </Link>
          <Link
            href="/dashboard"
            className="text-accent font-medium hover:underline"
          >
            View dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
