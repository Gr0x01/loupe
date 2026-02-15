import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { GitHubAvailableRepo } from "./types";

export function AddRepoModal({
  isOpen,
  onClose,
  onConnect,
  connectingId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (repo: GitHubAvailableRepo) => void;
  connectingId: number | null;
}) {
  const [repos, setRepos] = useState<GitHubAvailableRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) setError("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && connectingId === null) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, connectingId, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRepos = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/integrations/github/repos");
        if (!res.ok) {
          setError("Failed to load repos");
          return;
        }
        const data = await res.json();
        setRepos(data.repos || []);
      } catch {
        setError("Failed to load repos");
      } finally {
        setLoading(false);
      }
    };

    fetchRepos();
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const availableRepos = repos.filter((r) => !r.connected);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
      onClick={() => connectingId === null && onClose()}
    >
      <div
        className="bg-surface-solid rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Connect a repository
        </h2>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="glass-spinner" />
          </div>
        )}

        {error && (
          <div className="text-score-low text-center py-8">{error}</div>
        )}

        {!loading && !error && availableRepos.length === 0 && (
          <div className="text-text-secondary text-center py-8">
            All your repositories are already connected.
          </div>
        )}

        {!loading && !error && availableRepos.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {availableRepos.map((repo) => {
              const isConnecting = connectingId === repo.id;
              return (
                <button
                  key={repo.id}
                  onClick={() => onConnect(repo)}
                  disabled={connectingId !== null}
                  className="w-full glass-card p-4 text-left hover:border-[rgba(255,90,54,0.15)] transition-all duration-150 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary truncate">
                        {repo.full_name}
                      </p>
                      <p className="text-sm text-text-muted">
                        {repo.private ? "Private" : "Public"} · {repo.default_branch}
                      </p>
                    </div>
                    <span className="text-accent text-sm font-medium flex-shrink-0">
                      {isConnecting ? "Connecting..." : "Connect"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border-subtle">
          <button onClick={onClose} className="btn-secondary w-full">
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
