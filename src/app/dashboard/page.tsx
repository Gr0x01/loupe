"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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

function PageCard({ page, onDelete }: { page: PageData; onDelete: (id: string) => void }) {
  const displayName = page.name || getDomain(page.url);
  const score = page.last_scan?.score;
  const previousScore = page.last_scan?.previous_score;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(page.id);
  };

  return (
    <Link
      href={`/pages/${page.id}`}
      className="glass-card p-5 block hover:border-[rgba(91,46,145,0.15)] transition-all duration-150 group"
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

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Score display */}
          {typeof score === "number" && page.last_scan?.status === "complete" && (
            <div className="flex items-center gap-2">
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
            <div className="glass-spinner w-6 h-6" />
          )}

          {/* Delete button */}
          <button
            onClick={handleDeleteClick}
            className="p-2 text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all duration-150"
            title="Delete page"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    onSubmit(url, name);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
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
    </div>,
    document.body
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  pageName,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  pageName: string;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="glass-card-elevated p-6 w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-2"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Delete {pageName}?
        </h2>
        <p className="text-text-secondary mb-6">
          This will permanently delete all scan history for this page. This cannot be undone.
        </p>
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
            type="button"
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
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
  const [deleteTarget, setDeleteTarget] = useState<PageData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const handleDeleteClick = (id: string) => {
    const page = pages.find((p) => p.id === id);
    if (page) {
      setDeleteTarget(page);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/pages/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setDeleteTarget(null); // Close modal so user sees error
        setError("Failed to delete page");
        return;
      }
      setDeleteTarget(null);
      await fetchPages();
    } catch {
      setDeleteTarget(null); // Close modal so user sees error
      setError("Failed to delete page");
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="glass-spinner mx-auto" />
          <p className="text-text-secondary mt-4">Loading your pages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center px-4">
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
      </div>
    );
  }

  return (
    <>
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
          <button
            onClick={handleAddClick}
            className="btn-primary"
          >
            {pages.length >= userLimits.max && userLimits.max > 0 ? "Unlock more" : "Add page"}
          </button>
        </div>

        {/* Pages list or empty state */}
        {pages.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <PageCard key={page.id} page={page} onDelete={handleDeleteClick} />
            ))}
          </div>
        )}
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

      <DeleteConfirmModal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        pageName={deleteTarget?.name || getDomain(deleteTarget?.url || "")}
      />
    </>
  );
}
