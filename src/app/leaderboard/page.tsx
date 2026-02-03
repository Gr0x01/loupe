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
  if (score >= 80) return "bg-[rgba(26,140,91,0.1)]";
  if (score >= 60) return "bg-[rgba(212,148,10,0.1)]";
  return "bg-[rgba(194,59,59,0.1)]";
}

function ScreenshotThumbnail({ url, domain }: { url: string | null; domain: string }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <svg className="w-6 h-6 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="rank-badge rank-badge-gold">
        <span className="rank-badge-icon">1</span>
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="rank-badge rank-badge-silver">
        <span className="rank-badge-icon">2</span>
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="rank-badge rank-badge-bronze">
        <span className="rank-badge-icon">3</span>
      </div>
    );
  }
  return (
    <div className="rank-badge rank-badge-default">
      <span className="text-sm font-bold text-text-muted">{rank}</span>
    </div>
  );
}

function LeaderboardCard({ entry, showImprovement }: { entry: LeaderboardEntry; showImprovement: boolean }) {
  return (
    <div className="glass-card p-5 flex items-center gap-4 group">
      {/* Rank */}
      <RankBadge rank={entry.rank} />

      {/* Screenshot thumbnail */}
      <div className="w-20 h-14 rounded-lg overflow-hidden bg-[rgba(0,0,0,0.04)] flex-shrink-0">
        <ScreenshotThumbnail url={entry.screenshot_url} domain={entry.domain} />
      </div>

      {/* Domain + link */}
      <div className="flex-1 min-w-0">
        <a
          href={entry.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-lg font-semibold text-text-primary hover:text-accent transition-colors truncate block"
        >
          {entry.domain}
          <svg
            className="w-4 h-4 inline-block ml-1.5 opacity-0 group-hover:opacity-60 transition-opacity"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <Link
          href={`/analysis/${entry.analysis_id}`}
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          View audit
        </Link>
      </div>

      {/* Score / Improvement */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {showImprovement && entry.improvement !== undefined && (
          <span className="improvement-badge">
            +{entry.improvement}
          </span>
        )}
        <div className={`px-3 py-1.5 rounded-lg ${scoreBgColor(entry.score)}`}>
          <span
            className={`text-2xl font-bold ${scoreColor(entry.score)}`}
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {entry.score}
          </span>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
        active
          ? "bg-white text-accent shadow-sm border border-[rgba(91,46,145,0.15)]"
          : "text-text-secondary hover:text-text-primary hover:bg-[rgba(255,255,255,0.4)]"
      }`}
    >
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
    <div className="flex items-center gap-1 bg-[rgba(0,0,0,0.03)] rounded-lg p-1">
      <button
        onClick={() => onChange("month")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
          period === "month"
            ? "bg-white text-text-primary shadow-sm"
            : "text-text-muted hover:text-text-secondary"
        }`}
      >
        This Month
      </button>
      <button
        onClick={() => onChange("all_time")}
        className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 ${
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
  const message =
    category === "most_improved"
      ? period === "month"
        ? "No improved pages this month yet. Run multiple audits on the same page to track improvement."
        : "No improved pages yet. Run multiple audits on the same page to track improvement."
      : period === "month"
        ? "No audits completed this month yet. Be the first!"
        : "No audits completed yet. Be the first!";

  return (
    <div className="glass-card p-10 text-center">
      <div className="max-w-md mx-auto">
        <svg
          className="w-12 h-12 mx-auto text-text-muted mb-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
          />
        </svg>
        <h3
          className="text-xl font-bold text-text-primary mb-2"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          No entries yet
        </h3>
        <p className="text-text-secondary mb-6">{message}</p>
        <Link href="/" className="btn-primary inline-block">
          Audit a page
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

  return (
    <main className="min-h-screen text-text-primary">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1
            className="text-4xl sm:text-5xl font-bold text-text-primary mb-3"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Leaderboard
          </h1>
          <p className="text-text-secondary text-lg">
            Top-scoring pages and biggest improvements
          </p>
        </div>

        {/* Category tabs */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <TabButton active={category === "top_scores"} onClick={() => setCategory("top_scores")}>
            Top Scores
          </TabButton>
          <TabButton active={category === "most_improved"} onClick={() => setCategory("most_improved")}>
            Most Improved
          </TabButton>
        </div>

        {/* Period toggle */}
        <div className="flex justify-center mb-8">
          <PeriodToggle period={period} onChange={setPeriod} />
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="glass-spinner mx-auto" />
            <p className="text-text-secondary mt-4">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <p className="text-text-secondary text-lg">{error}</p>
            <button
              onClick={() => setRefetchKey((k) => k + 1)}
              className="btn-primary mt-4"
            >
              Try again
            </button>
          </div>
        ) : entries.length === 0 ? (
          <EmptyState category={category} period={period} />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <LeaderboardCard
                key={entry.analysis_id}
                entry={entry}
                showImprovement={category === "most_improved"}
              />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center">
          <p className="text-sm text-text-muted mb-4">
            Want to see your page on the leaderboard?
          </p>
          <Link href="/" className="btn-secondary inline-block">
            Audit your page
          </Link>
        </div>
      </div>
    </main>
  );
}
