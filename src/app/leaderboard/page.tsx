"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";

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

function scoreGlow(score: number): string {
  if (score >= 80) return "shadow-[0_0_20px_rgba(26,140,91,0.15)]";
  if (score >= 60) return "shadow-[0_0_20px_rgba(212,148,10,0.12)]";
  return "shadow-[0_0_20px_rgba(194,59,59,0.12)]";
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

function RankDisplay({ rank, isTopThree }: { rank: number; isTopThree: boolean }) {
  if (isTopThree) {
    return (
      <div
        className="w-10 h-10 flex items-center justify-center rounded-xl bg-accent text-white font-bold text-lg"
        style={{
          boxShadow: "0 4px 12px rgba(91, 46, 145, 0.25), inset 0 1px 0 rgba(255,255,255,0.15)",
        }}
      >
        {rank}
      </div>
    );
  }

  return (
    <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-[rgba(0,0,0,0.03)] border border-[rgba(0,0,0,0.04)]">
      <span className="text-sm font-semibold text-text-muted">{rank}</span>
    </div>
  );
}

function TopThreeCard({ entry, showImprovement }: { entry: LeaderboardEntry; showImprovement: boolean }) {
  return (
    <Link
      href={`/analysis/${entry.analysis_id}`}
      className="block rounded-2xl overflow-hidden bg-white shadow-sm ring-1 ring-[rgba(0,0,0,0.04)] group transition-all duration-200 hover:shadow-lg hover:ring-[rgba(91,46,145,0.1)]"
    >
      {/* Screenshot with overlays */}
      <div className="relative aspect-[4/3]">
        <ScreenshotThumbnail url={entry.screenshot_url} domain={entry.domain} />

        {/* Rank badge - top left */}
        <div
          className="absolute top-3 left-3 w-9 h-9 flex items-center justify-center rounded-xl bg-accent text-white font-bold text-base"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.2)" }}
        >
          {entry.rank}
        </div>

        {/* Score - bottom right */}
        <div
          className="absolute bottom-3 right-3 px-3 py-1 rounded-lg bg-white/90 backdrop-blur-sm"
          style={{ boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
        >
          {showImprovement && entry.improvement !== undefined && (
            <span className="text-xs font-bold text-score-high mr-1.5">+{entry.improvement}</span>
          )}
          <span
            className={`text-xl font-bold ${scoreColor(entry.score)}`}
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {entry.score}
          </span>
        </div>
      </div>

      {/* Domain - tight below image */}
      <div className="px-3 py-2.5">
        <p className="font-semibold text-text-primary text-sm truncate group-hover:text-accent transition-colors">
          {entry.domain}
        </p>
      </div>
    </Link>
  );
}

function GridCard({ entry, showImprovement }: { entry: LeaderboardEntry; showImprovement: boolean }) {
  return (
    <Link
      href={`/analysis/${entry.analysis_id}`}
      className="block rounded-xl overflow-hidden bg-white shadow-sm ring-1 ring-[rgba(0,0,0,0.04)] group transition-all duration-150 hover:shadow-md hover:ring-[rgba(91,46,145,0.08)]"
    >
      {/* Screenshot with overlays */}
      <div className="relative aspect-[4/3]">
        <ScreenshotThumbnail url={entry.screenshot_url} domain={entry.domain} />

        {/* Rank - top left */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/60 text-white text-xs font-bold">
          #{entry.rank}
        </div>

        {/* Score - bottom right */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-white/90 backdrop-blur-sm text-sm">
          {showImprovement && entry.improvement !== undefined && (
            <span className="text-xs font-bold text-score-high mr-1">+{entry.improvement}</span>
          )}
          <span
            className={`font-bold ${scoreColor(entry.score)}`}
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {entry.score}
          </span>
        </div>
      </div>

      {/* Domain */}
      <div className="px-2.5 py-2">
        <p className="text-xs font-medium text-text-primary truncate group-hover:text-accent transition-colors">
          {entry.domain}
        </p>
      </div>
    </Link>
  );
}

function TabButton({
  active,
  onClick,
  children,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-150 active:scale-[0.98] ${
        active
          ? "bg-white text-accent shadow-sm border border-[rgba(91,46,145,0.12)] shadow-[0_2px_8px_rgba(91,46,145,0.08)]"
          : "text-text-secondary hover:text-text-primary hover:bg-[rgba(255,255,255,0.5)]"
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function PeriodToggle({
  period,
  onChange,
}: {
  period: Period;
  onChange: (p: Period) => void;
}) {
  return (
    <div className="flex items-center gap-1 bg-[rgba(255,255,255,0.4)] backdrop-blur-sm rounded-xl p-1 border border-[rgba(0,0,0,0.04)]">
      <button
        onClick={() => onChange("month")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          period === "month"
            ? "bg-white text-text-primary shadow-sm"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        This Month
      </button>
      <button
        onClick={() => onChange("all_time")}
        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          period === "all_time"
            ? "bg-white text-text-primary shadow-sm"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        All Time
      </button>
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

  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-1 text-text-primary">
        <div className="max-w-4xl mx-auto px-6 py-12">
          {/* Header */}
          <div className="text-center mb-12">
            <p className="text-sm font-medium text-accent uppercase tracking-wide mb-3">
              {category === "top_scores" ? "Top Performers" : "Biggest Gains"}
            </p>
            <h1
              className="text-4xl sm:text-5xl text-text-primary mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {category === "top_scores"
                ? "The best-audited pages on the web"
                : "From good to great"}
            </h1>
            <p className="text-lg text-text-secondary max-w-lg mx-auto">
              {category === "top_scores"
                ? "Sites that got their messaging, CTAs, and trust signals right."
                : "Pages that improved the most since their first audit."}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
            {/* Category tabs */}
            <div className="flex items-center gap-2 bg-[rgba(0,0,0,0.02)] rounded-xl p-1">
              <TabButton
                active={category === "top_scores"}
                onClick={() => setCategory("top_scores")}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                }
              >
                Top Scores
              </TabButton>
              <TabButton
                active={category === "most_improved"}
                onClick={() => setCategory("most_improved")}
                icon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                }
              >
                Most Improved
              </TabButton>
            </div>

            {/* Period toggle */}
            <PeriodToggle period={period} onChange={setPeriod} />
          </div>

          {/* Content */}
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

              {/* Rest of the list - compact grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-8">
                  {rest.map((entry) => (
                    <GridCard
                      key={entry.analysis_id}
                      entry={entry}
                      showImprovement={showImprovement}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Bottom CTA Section */}
          <section className="mt-16 glass-card-elevated p-8 sm:p-10 text-center">
            <h2
              className="text-2xl sm:text-3xl text-text-primary mb-3"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Think your page belongs here?
            </h2>
            <p className="text-text-secondary mb-8 max-w-md mx-auto">
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
                Already monitoring? View dashboard
              </Link>
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
