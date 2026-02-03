"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ShareModal from "@/components/ShareModal";

interface PageData {
  id: string;
  url: string;
  name: string | null;
  scan_frequency: string;
  created_at: string;
  last_scan: {
    id: string;
    status: string;
    score: number | null;
    previous_score: number | null;
    created_at: string;
  } | null;
}

interface UserLimits {
  current: number;
  max: number;
  bonusPages: number;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-score-high";
  if (score >= 60) return "text-score-mid";
  return "text-score-low";
}

function ScoreDelta({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null) return null;
  const delta = current - previous;
  if (delta === 0) return null;

  const color = delta > 0 ? "text-score-high" : "text-score-low";
  const sign = delta > 0 ? "+" : "";

  return (
    <span className={`text-sm font-semibold ${color}`}>
      {sign}{delta}
    </span>
  );
}

function FrequencyBadge({ frequency }: { frequency: string }) {
  const label = frequency === "daily" ? "Daily" : frequency === "weekly" ? "Weekly" : "Manual";
  return (
    <span className="text-xs font-medium text-text-muted bg-[rgba(0,0,0,0.03)] px-2 py-0.5 rounded-full">
      {label}
    </span>
  );
}

function PageCard({ page }: { page: PageData }) {
  const displayName = page.name || getDomain(page.url);
  const score = page.last_scan?.score;
  const previousScore = page.last_scan?.previous_score;

  return (
    <Link
      href={`/pages/${page.id}`}
      className="glass-card p-5 block hover:border-[rgba(91,46,145,0.15)] transition-all duration-150"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg font-semibold text-text-primary truncate">
              {displayName}
            </h3>
            <FrequencyBadge frequency={page.scan_frequency} />
          </div>
          <p className="text-sm text-text-muted mt-1 truncate font-mono">
            {getDomain(page.url)}
          </p>
          {page.last_scan && (
            <p className="text-sm text-text-muted mt-2">
              Last scan: {timeAgo(page.last_scan.created_at)}
              {page.last_scan.status === "processing" && (
                <span className="text-accent ml-2">Scanning...</span>
              )}
              {page.last_scan.status === "pending" && (
                <span className="text-text-muted ml-2">Queued</span>
              )}
            </p>
          )}
          {!page.last_scan && (
            <p className="text-sm text-text-muted mt-2">No scans yet</p>
          )}
        </div>

        {/* Score display */}
        {typeof score === "number" && page.last_scan?.status === "complete" && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`text-3xl font-bold ${scoreColor(score)}`}
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {score}
            </span>
            <ScoreDelta current={score} previous={previousScore ?? null} />
          </div>
        )}

        {page.last_scan?.status === "processing" && (
          <div className="flex-shrink-0">
            <div className="glass-spinner w-6 h-6" />
          </div>
        )}
      </div>
    </Link>
  );
}

function EmptyState() {
  return (
    <div className="glass-card p-10 text-center">
      <div className="max-w-md mx-auto">
        <h3
          className="text-2xl font-bold text-text-primary mb-3"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          No pages yet
        </h3>
        <p className="text-text-secondary mb-6">
          Start monitoring your pages to track changes over time. Run a free audit first, then re-scan to add it to your dashboard.
        </p>
        <Link href="/" className="btn-primary inline-block">
          Audit a page
        </Link>
      </div>
    </div>
  );
}

function AddPageModal({
  isOpen,
  onClose,
  onSubmit,
  loading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (url: string, name: string) => void;
  loading: boolean;
}) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onSubmit(url, name);
  };

  return (
    <div
      className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card-elevated p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Add a page
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              URL
            </label>
            <input
              type="text"
              inputMode="url"
              placeholder="https://yoursite.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input-glass w-full"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Name (optional)
            </label>
            <input
              type="text"
              placeholder="My homepage"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-glass w-full"
            />
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={loading || !url}
            >
              {loading ? "Adding..." : "Add page"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [pages, setPages] = useState<PageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [userLimits, setUserLimits] = useState<UserLimits>({ current: 0, max: 1, bonusPages: 0 });

  const fetchPages = async () => {
    try {
      const res = await fetch("/api/pages");
      if (res.status === 401) {
        router.push("/login?redirect=/dashboard");
        return;
      }
      if (!res.ok) {
        setError("Failed to load pages");
        return;
      }
      const data = await res.json();
      const pageList = data.pages || [];
      setPages(pageList);
      // Update limits based on page count (max is fetched when trying to add)
      setUserLimits((prev) => ({ ...prev, current: pageList.length }));
    } catch {
      setError("Failed to load pages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPages();
  }, []);

  const handleAddPage = async (url: string, name: string) => {
    setAddLoading(true);
    try {
      const res = await fetch("/api/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, name: name || undefined }),
      });

      const data = await res.json();

      if (res.status === 403 && data.error === "page_limit_reached") {
        // At page limit — show share modal
        setUserLimits({ current: data.current, max: data.max, bonusPages: 0 });
        setShowAddModal(false);
        setShowShareModal(true);
        return;
      }

      if (res.status === 409) {
        // Page already exists
        router.push(`/pages/${data.id}`);
        return;
      }

      if (!res.ok) {
        setError("Failed to add page");
        return;
      }

      setShowAddModal(false);
      await fetchPages();
    } catch {
      setError("Failed to add page");
    } finally {
      setAddLoading(false);
    }
  };

  const handleShareSuccess = () => {
    // Refresh limits after sharing
    setUserLimits((prev) => ({ ...prev, max: prev.max + 1, bonusPages: prev.bonusPages + 1 }));
  };

  const handleAddClick = () => {
    // Check if at limit before showing add modal
    if (pages.length >= userLimits.max && userLimits.max > 0) {
      setShowShareModal(true);
    } else {
      setShowAddModal(true);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <div className="glass-spinner mx-auto" />
          <p className="text-text-secondary mt-4">Loading your pages...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-text-secondary text-lg">{error}</p>
          <button
            onClick={() => {
              setError("");
              setLoading(true);
              fetchPages();
            }}
            className="btn-primary mt-4"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-text-primary">
      <div className="max-w-3xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-4xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Your pages
            </h1>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-text-secondary">
                {pages.length} page{pages.length !== 1 ? "s" : ""} monitored
              </p>
              {userLimits.max > 0 && (
                <span className="text-xs font-medium text-text-muted bg-[rgba(0,0,0,0.03)] px-2 py-0.5 rounded-full">
                  {pages.length}/{userLimits.max} slots
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/settings/integrations"
              className="text-sm text-text-muted hover:text-accent transition-colors"
            >
              Integrations
            </Link>
            <button
              onClick={handleAddClick}
              className="btn-primary"
            >
              {pages.length >= userLimits.max && userLimits.max > 0 ? "Unlock more" : "Add page"}
            </button>
          </div>
        </div>

        {/* Pages list or empty state */}
        {pages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <PageCard key={page.id} page={page} />
            ))}
          </div>
        )}

        {/* Footer links */}
        <div className="mt-12 text-center">
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-accent transition-colors"
          >
            Audit a new page
          </Link>
        </div>
      </div>

      <AddPageModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddPage}
        loading={addLoading}
      />

      <ShareModal
        key={showShareModal ? "open" : "closed"}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        onSuccess={handleShareSuccess}
      />
    </main>
  );
}
