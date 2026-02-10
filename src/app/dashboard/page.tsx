"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import ShareModal from "@/components/ShareModal";
import { PageLoader } from "@/components/PageLoader";
import type { DashboardPageData, DetectedChange, ChangesApiResponse } from "@/lib/types/analysis";
import { getDomain } from "@/lib/utils/url";
import {
  AttentionZone,
  WatchingZone,
  ResultsZone,
  EmptySuccessState,
  EmptyOnboardingState,
} from "@/components/dashboard";

interface UserLimits {
  current: number;
  max: number;
  bonusPages: number;
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

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pages, setPages] = useState<DashboardPageData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [userLimits, setUserLimits] = useState<UserLimits>({ current: 0, max: 1, bonusPages: 0 });
  const [deleteTarget, setDeleteTarget] = useState<DashboardPageData | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Results zone state
  const [results, setResults] = useState<(DetectedChange & { domain?: string })[]>([]);
  const [resultsStats, setResultsStats] = useState<ChangesApiResponse["stats"]>({
    totalValidated: 0,
    totalRegressed: 0,
    cumulativeImprovement: 0,
  });
  const highlightWinId = searchParams.get("win") || undefined;

  const fetchPages = useCallback(async () => {
    try {
      // Fetch pages and validated changes in parallel
      const [pagesRes, changesRes] = await Promise.all([
        fetch("/api/pages"),
        fetch("/api/changes"),
      ]);

      if (pagesRes.status === 401) {
        router.push("/login?redirect=/dashboard");
        return;
      }
      if (!pagesRes.ok) {
        setError("Failed to load pages");
        return;
      }
      const pagesData = await pagesRes.json();
      const pageList = pagesData.pages || [];
      setPages(pageList);
      // Update limits based on page count (max is fetched when trying to add)
      setUserLimits((prev) => ({ ...prev, current: pageList.length }));

      // Load changes (don't fail dashboard if this fails)
      if (changesRes.ok) {
        const changesData: ChangesApiResponse = await changesRes.json();
        setResults(changesData.changes || []);
        setResultsStats(changesData.stats);
      }
    } catch {
      setError("Failed to load pages");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

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

  // Split pages into attention vs watching zones
  const attentionPages = pages.filter((p) => p.attention_status.needs_attention);
  const watchingPages = pages.filter((p) => !p.attention_status.needs_attention);
  const isAtLimit = pages.length >= userLimits.max && userLimits.max > 0;

  if (loading) {
    return <PageLoader />;
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
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-text-primary"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Your pages
            </h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-text-secondary">
                {pages.length} page{pages.length !== 1 ? "s" : ""} monitored
              </p>
              {userLimits.max > 0 && (
                <span className="zone-count">
                  {pages.length}/{userLimits.max} slots
                </span>
              )}
            </div>
          </div>
          {pages.length > 0 && (
            <button
              onClick={handleAddClick}
              className="btn-primary w-full sm:w-auto"
            >
              {isAtLimit ? "Unlock more" : "Add page"}
            </button>
          )}
        </div>

        {/* Content: Empty state or zones */}
        {pages.length === 0 ? (
          <EmptyOnboardingState />
        ) : (
          <>
            {/* Results zone — validated/regressed changes at TOP */}
            <ResultsZone
              changes={results}
              stats={resultsStats}
              highlightId={highlightWinId}
            />

            {/* Show success state if no attention items and no results */}
            {attentionPages.length === 0 && watchingPages.length > 0 && results.length === 0 && (
              <EmptySuccessState />
            )}

            {/* Attention zone */}
            {attentionPages.length > 0 && (
              <AttentionZone pages={attentionPages} onDelete={handleDeleteClick} />
            )}

            {/* Watching zone */}
            <WatchingZone
              pages={watchingPages}
              onDelete={handleDeleteClick}
              onAddPage={handleAddClick}
              isAtLimit={isAtLimit}
            />
          </>
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DashboardContent />
    </Suspense>
  );
}
