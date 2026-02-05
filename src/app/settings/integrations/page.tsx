"use client";

import { Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";

interface GitHubRepo {
  id: number;
  full_name: string;
  default_branch: string;
  private: boolean;
  connected: boolean;
}

interface GitHubIntegration {
  connected: boolean;
  username: string;
  avatar_url: string;
  connected_at: string;
  repos: { id: string; full_name: string; default_branch: string }[];
}

interface PostHogIntegration {
  connected: boolean;
  project_id: string;
  host: string;
  connected_at: string;
}

interface GA4Integration {
  connected: boolean;
  property_id: string | null;
  property_name: string | null;
  email: string;
  pending_property_selection: boolean;
  connected_at: string;
}

interface GA4Property {
  property_id: string;
  display_name: string;
  account_name: string;
}

interface SupabaseIntegration {
  connected: boolean;
  project_ref: string;
  project_url: string;
  key_type: "anon" | "service_role";
  has_schema_access: boolean;
  tables: string[];
  connected_at: string;
}

interface IntegrationsData {
  github: GitHubIntegration | null;
  posthog: PostHogIntegration | null;
  ga4: GA4Integration | null;
  supabase: SupabaseIntegration | null;
}

function GitHubIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

function RepoCard({
  repo,
  onDisconnect,
  disconnecting,
}: {
  repo: { id: string; full_name: string; default_branch: string };
  onDisconnect: (id: string) => void;
  disconnecting: boolean;
}) {
  return (
    <div className="glass-card p-4 flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <p className="font-medium text-text-primary truncate">{repo.full_name}</p>
        <p className="text-sm text-text-muted">Branch: {repo.default_branch}</p>
      </div>
      <button
        onClick={() => onDisconnect(repo.id)}
        disabled={disconnecting}
        className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50"
      >
        {disconnecting ? "Removing..." : "Remove"}
      </button>
    </div>
  );
}

function AddRepoModal({
  isOpen,
  onClose,
  onConnect,
  connectingId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (repo: GitHubRepo) => void;
  connectingId: number | null;
}) {
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
      onClick={onClose}
    >
      <div
        className="bg-surface-solid rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
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
                  className="w-full glass-card p-4 text-left hover:border-[rgba(91,46,145,0.15)] transition-all duration-150 disabled:opacity-50"
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

function PostHogConnectModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [projectId, setProjectId] = useState("");
  const [host, setHost] = useState("https://us.i.posthog.com");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError("");

    try {
      const res = await fetch("/api/integrations/posthog/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, projectId, host }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-solid rounded-2xl shadow-xl p-6 w-full max-w-md border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Connect PostHog
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Personal API Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  placeholder="phx_..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="input-glass w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showApiKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Create one at PostHog → Settings → Personal API Keys
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Project ID
              </label>
              <input
                type="text"
                placeholder="12345"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="input-glass w-full"
                required
              />
              <p className="text-xs text-text-muted mt-1">
                Found in PostHog → Settings → Project Details
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Host
              </label>
              <select
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="input-glass w-full"
              >
                <option value="https://us.i.posthog.com">US Cloud (us.i.posthog.com)</option>
                <option value="https://eu.i.posthog.com">EU Cloud (eu.i.posthog.com)</option>
                <option value="https://app.posthog.com">Legacy (app.posthog.com)</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="text-score-low text-sm mb-4">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={connecting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={connecting || !apiKey || !projectId}
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function GA4PropertySelectModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [properties, setProperties] = useState<GA4Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectingId, setSelectingId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const fetchProperties = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/integrations/ga4/properties");
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load properties");
          return;
        }
        const data = await res.json();
        setProperties(data.properties || []);
      } catch {
        setError("Failed to load properties");
      } finally {
        setLoading(false);
      }
    };

    fetchProperties();
  }, [isOpen]);

  const handleSelect = async (property: GA4Property) => {
    setSelectingId(property.property_id);
    setError("");

    try {
      const res = await fetch("/api/integrations/ga4/select-property", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: property.property_id,
          property_name: property.display_name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to select property");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Failed to select property");
    } finally {
      setSelectingId(null);
    }
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-solid rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-2"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Select GA4 Property
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          Choose which property to pull analytics from
        </p>

        {loading && (
          <div className="flex-1 flex items-center justify-center py-8">
            <div className="glass-spinner" />
          </div>
        )}

        {error && (
          <div className="text-score-low text-center py-4">{error}</div>
        )}

        {!loading && !error && properties.length === 0 && (
          <div className="text-text-secondary text-center py-8">
            <p>No GA4 properties found.</p>
            <p className="text-sm mt-2">Make sure your Google account has access to at least one GA4 property.</p>
          </div>
        )}

        {!loading && !error && properties.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
            {properties.map((property) => {
              const isSelecting = selectingId === property.property_id;
              return (
                <button
                  key={property.property_id}
                  onClick={() => handleSelect(property)}
                  disabled={selectingId !== null}
                  className="w-full glass-card p-4 text-left hover:border-[rgba(91,46,145,0.15)] transition-all duration-150 disabled:opacity-50"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary truncate">
                        {property.display_name}
                      </p>
                      <p className="text-sm text-text-muted">
                        {property.account_name} · ID: {property.property_id}
                      </p>
                    </div>
                    <span className="text-accent text-sm font-medium flex-shrink-0">
                      {isSelecting ? "Selecting..." : "Select"}
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

function SupabaseConnectModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [projectUrl, setProjectUrl] = useState("");
  const [anonKey, setAnonKey] = useState("");
  const [serviceRoleKey, setServiceRoleKey] = useState("");
  const [useServiceKey, setUseServiceKey] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProjectUrl("");
      setAnonKey("");
      setServiceRoleKey("");
      setUseServiceKey(false);
      setError("");
      setShowKey(false);
    }
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError("");

    try {
      const res = await fetch("/api/integrations/supabase/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectUrl,
          anonKey: useServiceKey ? undefined : anonKey,
          serviceRoleKey: useServiceKey ? serviceRoleKey : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to connect");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Failed to connect");
    } finally {
      setConnecting(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-solid rounded-2xl shadow-xl p-6 w-full max-w-md border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          Connect Supabase
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Project URL
              </label>
              <input
                type="text"
                placeholder="https://xyz.supabase.co"
                value={projectUrl}
                onChange={(e) => setProjectUrl(e.target.value)}
                className="input-glass w-full"
                required
              />
              <p className="text-xs text-text-muted mt-1">
                Found in Supabase Dashboard → Settings → API
              </p>
            </div>

            {/* Key type toggle */}
            <div className="glass-card p-4 bg-[rgba(91,46,145,0.04)]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">
                  Key type
                </span>
                <button
                  type="button"
                  onClick={() => setUseServiceKey(!useServiceKey)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    useServiceKey ? "bg-accent" : "bg-text-muted/30"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      useServiceKey ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
              <p className="text-xs text-text-muted">
                {useServiceKey
                  ? "Service Role Key — full access to all tables (bypasses RLS)"
                  : "Anon Key — respects Row Level Security (some tables may be hidden)"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {useServiceKey ? "Service Role Key" : "Anon Key"}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder={useServiceKey ? "eyJhbGciOi..." : "eyJhbGciOi..."}
                  value={useServiceKey ? serviceRoleKey : anonKey}
                  onChange={(e) =>
                    useServiceKey
                      ? setServiceRoleKey(e.target.value)
                      : setAnonKey(e.target.value)
                  }
                  className="input-glass w-full pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors"
                  tabIndex={-1}
                >
                  {showKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-text-muted mt-1">
                {useServiceKey
                  ? "Found in Supabase → Settings → API → service_role (keep secret!)"
                  : "Found in Supabase → Settings → API → anon public"}
              </p>
            </div>
          </div>

          {error && (
            <div className="text-score-low text-sm mb-4">{error}</div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary flex-1"
              disabled={connecting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              disabled={connecting || !projectUrl || (!anonKey && !serviceRoleKey)}
            >
              {connecting ? "Connecting..." : "Connect"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

function IntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [integrations, setIntegrations] = useState<IntegrationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAddRepo, setShowAddRepo] = useState(false);
  const [showPostHogConnect, setShowPostHogConnect] = useState(false);
  const [showGA4PropertySelect, setShowGA4PropertySelect] = useState(false);
  const [showSupabaseConnect, setShowSupabaseConnect] = useState(false);
  const [connectingId, setConnectingId] = useState<number | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
  const [disconnectingGitHub, setDisconnectingGitHub] = useState(false);
  const [disconnectingPostHog, setDisconnectingPostHog] = useState(false);
  const [disconnectingGA4, setDisconnectingGA4] = useState(false);
  const [disconnectingSupabase, setDisconnectingSupabase] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [togglingEmail, setTogglingEmail] = useState(false);

  // Show success/error messages from OAuth callback
  const successParam = searchParams.get("success");
  const errorParam = searchParams.get("error");
  const pendingParam = searchParams.get("pending");

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) {
        const data = await res.json();
        setEmailNotifications(data.email_notifications ?? true);
      }
    } catch {
      // Ignore profile fetch errors - default to enabled
    }
  };

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/integrations");
      if (res.status === 401) {
        router.push("/login?redirect=/settings/integrations");
        return;
      }
      if (!res.ok) {
        setError("Failed to load integrations");
        return;
      }
      const data = await res.json();
      setIntegrations(data);
    } catch {
      setError("Failed to load integrations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    fetchProfile();
  }, []);

  // Open property selection modal if pending=ga4 in URL (after OAuth)
  useEffect(() => {
    if (pendingParam === "ga4" && !loading) {
      setShowGA4PropertySelect(true);
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete("pending");
      window.history.replaceState({}, "", url.toString());
    }
  }, [pendingParam, loading]);

  const handleToggleEmailNotifications = async () => {
    setTogglingEmail(true);
    const newValue = !emailNotifications;

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email_notifications: newValue }),
      });

      if (res.ok) {
        setEmailNotifications(newValue);
      } else {
        setError("Failed to update email preferences");
      }
    } catch {
      setError("Failed to update email preferences");
    } finally {
      setTogglingEmail(false);
    }
  };

  const handleConnectGitHub = () => {
    window.location.href = "/api/integrations/github/connect";
  };

  const handleDisconnectGitHub = async () => {
    if (!confirm("Disconnect GitHub? All repo webhooks will be removed.")) return;

    setDisconnectingGitHub(true);
    try {
      const res = await fetch("/api/integrations/github", { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to disconnect GitHub");
        return;
      }
      await fetchIntegrations();
    } catch {
      setError("Failed to disconnect GitHub");
    } finally {
      setDisconnectingGitHub(false);
    }
  };

  const handleConnectRepo = async (repo: GitHubRepo) => {
    setConnectingId(repo.id);
    try {
      const res = await fetch("/api/integrations/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoId: repo.id,
          fullName: repo.full_name,
          defaultBranch: repo.default_branch,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to connect repo");
        return;
      }

      setShowAddRepo(false);
      await fetchIntegrations();
    } catch {
      setError("Failed to connect repo");
    } finally {
      setConnectingId(null);
    }
  };

  const handleDisconnectRepo = async (repoId: string) => {
    setDisconnecting(repoId);
    try {
      const res = await fetch(`/api/integrations/github/repos/${repoId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Failed to remove repo");
        return;
      }
      await fetchIntegrations();
    } catch {
      setError("Failed to remove repo");
    } finally {
      setDisconnecting(null);
    }
  };

  const handleDisconnectPostHog = async () => {
    if (!confirm("Disconnect PostHog?")) return;

    setDisconnectingPostHog(true);
    try {
      const res = await fetch("/api/integrations/posthog", { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to disconnect PostHog");
        return;
      }
      await fetchIntegrations();
    } catch {
      setError("Failed to disconnect PostHog");
    } finally {
      setDisconnectingPostHog(false);
    }
  };

  const handleConnectGA4 = () => {
    window.location.href = "/api/integrations/ga4/connect";
  };

  const handleDisconnectGA4 = async () => {
    if (!confirm("Disconnect Google Analytics?")) return;

    setDisconnectingGA4(true);
    try {
      const res = await fetch("/api/integrations/ga4", { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to disconnect Google Analytics");
        return;
      }
      await fetchIntegrations();
    } catch {
      setError("Failed to disconnect Google Analytics");
    } finally {
      setDisconnectingGA4(false);
    }
  };

  const handleDisconnectSupabase = async () => {
    if (!confirm("Disconnect Supabase?")) return;

    setDisconnectingSupabase(true);
    try {
      const res = await fetch("/api/integrations/supabase", { method: "DELETE" });
      if (!res.ok) {
        setError("Failed to disconnect Supabase");
        return;
      }
      await fetchIntegrations();
    } catch {
      setError("Failed to disconnect Supabase");
    } finally {
      setDisconnectingSupabase(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-4xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Integrations
          </h1>
          <p className="text-text-secondary mt-1">
            Connect your tools to auto-scan after deploys
          </p>
        </div>

        {/* Success/Error messages */}
        {successParam === "github" && (
          <div className="glass-card p-4 mb-6 border-l-4 border-score-high">
            <p className="text-text-primary font-medium">GitHub connected successfully</p>
            <p className="text-sm text-text-secondary mt-1">
              Now connect a repository to start auto-scanning after deploys.
            </p>
          </div>
        )}

        {errorParam && (
          <div className="glass-card p-4 mb-6 border-l-4 border-score-low">
            <p className="text-text-primary font-medium">Connection failed</p>
            <p className="text-sm text-text-secondary mt-1">
              {errorParam === "github_denied"
                ? "You declined the GitHub authorization."
                : "Something went wrong. Please try again."}
            </p>
          </div>
        )}

        {error && (
          <div className="glass-card p-4 mb-6 border-l-4 border-score-low">
            <p className="text-text-primary">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-sm text-text-muted hover:text-text-secondary mt-2"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* GitHub Integration */}
        <section className="mb-8">
          <div className="glass-card-elevated p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#24292e] flex items-center justify-center flex-shrink-0">
                  <GitHubIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-text-primary">GitHub</h2>
                  <p className="text-sm text-text-secondary">
                    Auto-scan pages when you push to main
                  </p>
                </div>
              </div>

              {!integrations?.github ? (
                <button onClick={handleConnectGitHub} className="btn-primary w-full sm:w-auto">
                  Connect
                </button>
              ) : (
                <button
                  onClick={handleDisconnectGitHub}
                  disabled={disconnectingGitHub}
                  className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50 self-end sm:self-auto"
                >
                  {disconnectingGitHub ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
            </div>

            {integrations?.github && (
              <div className="mt-6 pt-6 border-t border-border-subtle">
                {/* Connected account */}
                <div className="flex items-center gap-3 mb-6">
                  {integrations.github.avatar_url && (
                    <img
                      src={integrations.github.avatar_url}
                      alt=""
                      className="w-8 h-8 rounded-full"
                    />
                  )}
                  <div>
                    <p className="font-medium text-text-primary">
                      @{integrations.github.username}
                    </p>
                    <p className="text-xs text-text-muted">Connected</p>
                  </div>
                </div>

                {/* Connected repos */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
                      Watching {integrations.github.repos.length}/1 repo
                    </h3>
                    {integrations.github.repos.length < 1 && (
                      <button
                        onClick={() => setShowAddRepo(true)}
                        className="text-sm text-accent font-medium hover:text-accent-hover transition-colors"
                      >
                        + Add repo
                      </button>
                    )}
                  </div>

                  {integrations.github.repos.length === 0 ? (
                    <div className="glass-card p-6 text-center">
                      <p className="text-text-secondary mb-4">
                        No repos connected yet. Add one to start auto-scanning.
                      </p>
                      <button
                        onClick={() => setShowAddRepo(true)}
                        className="btn-secondary"
                      >
                        Add a repository
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {integrations.github.repos.map((repo) => (
                        <RepoCard
                          key={repo.id}
                          repo={repo}
                          onDisconnect={handleDisconnectRepo}
                          disconnecting={disconnecting === repo.id}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* How it works */}
                <div className="glass-card p-4 bg-[rgba(91,46,145,0.04)]">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">How it works:</span>{" "}
                    When you push to the default branch, we wait 45 seconds for your deploy to finish, then scan all pages linked to the repo.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* PostHog Integration */}
        <section className="mb-8">
          <div className="glass-card-elevated p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-border-subtle flex items-center justify-center flex-shrink-0">
                  <svg className="w-8 h-5" viewBox="0 0 50 30" fill="none">
                    <path d="M10.8914 17.2057c-.3685.7371-1.42031.7371-1.78884 0L8.2212 15.443c-.14077-.2815-.14077-.6129 0-.8944l.88136-1.7627c.36853-.7371 1.42034-.7371 1.78884 0l.8814 1.7627c.1407.2815.1407.6129 0 .8944l-.8814 1.7627zM10.8914 27.2028c-.3685.737-1.42031.737-1.78884 0L8.2212 25.44c-.14077-.2815-.14077-.6129 0-.8944l.88136-1.7627c.36853-.7371 1.42034-.7371 1.78884 0l.8814 1.7627c.1407.2815.1407.6129 0 .8944l-.8814 1.7628z" fill="#1D4AFF"/>
                    <path d="M0 23.4082c0-.8909 1.07714-1.3371 1.70711-.7071l4.58338 4.5834c.62997.63.1838 1.7071-.7071 1.7071H.999999c-.552284 0-.999999-.4477-.999999-1v-4.5834zm0-4.8278c0 .2652.105357.5196.292893.7071l9.411217 9.4112c.18753.1875.44189.2929.70709.2929h5.1692c.8909 0 1.3371-1.0771.7071-1.7071L1.70711 12.7041C1.07714 12.0741 0 12.5203 0 13.4112v5.1692zm0-9.99701c0 .26521.105357.51957.292893.7071L19.7011 28.6987c.1875.1875.4419.2929.7071.2929h5.1692c.8909 0 1.3371-1.0771.7071-1.7071L1.70711 2.70711C1.07715 2.07715 0 2.52331 0 3.41421v5.16918zm9.997 0c0 .26521.1054.51957.2929.7071l17.994 17.99401c.63.63 1.7071.1838 1.7071-.7071v-5.1692c0-.2652-.1054-.5196-.2929-.7071l-17.994-17.994c-.63-.62996-1.7071-.18379-1.7071.70711v5.16918zm11.7041-5.87628c-.63-.62997-1.7071-.1838-1.7071.7071v5.16918c0 .26521.1054.51957.2929.7071l7.997 7.99701c.63.63 1.7071.1838 1.7071-.7071v-5.1692c0-.2652-.1054-.5196-.2929-.7071l-7.997-7.99699z" fill="#F9BD2B"/>
                    <path d="M42.5248 23.5308l-9.4127-9.4127c-.63-.63-1.7071-.1838-1.7071.7071v13.1664c0 .5523.4477 1 1 1h14.5806c.5523 0 1-.4477 1-1v-1.199c0-.5523-.4496-.9934-.9973-1.0647-1.6807-.2188-3.2528-.9864-4.4635-2.1971zm-6.3213 2.2618c-.8829 0-1.5995-.7166-1.5995-1.5996 0-.8829.7166-1.5995 1.5995-1.5995.883 0 1.5996.7166 1.5996 1.5995 0 .883-.7166 1.5996-1.5996 1.5996z" fill="#000"/>
                    <path d="M0 27.9916c0 .5523.447715 1 1 1h4.58339c.8909 0 1.33707-1.0771.70711-1.7071l-4.58339-4.5834C1.07714 22.0711 0 22.5173 0 23.4082v4.5834zM9.997 10.997L1.70711 2.70711C1.07714 2.07714 0 2.52331 0 3.41421v5.16918c0 .26521.105357.51957.292893.7071L9.997 18.9946V10.997zM1.70711 12.7041C1.07714 12.0741 0 12.5203 0 13.4112v5.1692c0 .2652.105357.5196.292893.7071L9.997 28.9916V20.994l-8.28989-8.2899z" fill="#1D4AFF"/>
                    <path d="M19.994 11.4112c0-.2652-.1053-.5196-.2929-.7071l-7.997-7.99699c-.6299-.62997-1.70709-.1838-1.70709.7071v5.16918c0 .26521.10539.51957.29289.7071l9.7041 9.70411v-7.5834zM9.99701 28.9916h5.58339c.8909 0 1.3371-1.0771.7071-1.7071L9.99701 20.994v7.9976zM9.99701 10.997v7.5834c0 .2652.10539.5196.29289.7071l9.7041 9.7041v-7.5834c0-.2652-.1053-.5196-.2929-.7071L9.99701 10.997z" fill="#F54E00"/>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-text-primary">PostHog</h2>
                  <p className="text-sm text-text-secondary">
                    See pageviews and bounce rate with each scan
                  </p>
                </div>
              </div>

              {!integrations?.posthog ? (
                <button
                  onClick={() => setShowPostHogConnect(true)}
                  className="btn-primary w-full sm:w-auto"
                >
                  Connect
                </button>
              ) : (
                <button
                  onClick={handleDisconnectPostHog}
                  disabled={disconnectingPostHog}
                  className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50 self-end sm:self-auto"
                >
                  {disconnectingPostHog ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
            </div>

            {integrations?.posthog && (
              <div className="mt-6 pt-6 border-t border-border-subtle">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#1d4aff] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">P</span>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      Project {integrations.posthog.project_id}
                    </p>
                    <p className="text-xs text-text-muted">
                      {integrations.posthog.host.replace("https://", "")}
                    </p>
                  </div>
                </div>

                <div className="glass-card p-4 bg-[rgba(91,46,145,0.04)]">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">How it works:</span>{" "}
                    We'll pull your analytics so you can see if changes actually moved the&nbsp;needle.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Google Analytics 4 Integration */}
        <section className="mb-8">
          <div className="glass-card-elevated p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white border border-border-subtle flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 55.273 64" fill="none">
                    <g transform="matrix(.363638 0 0 .363636 -7.272763 -2.909091)">
                      <path d="M130 29v132c0 14.77 10.2 23 21 23 10 0 21-7 21-23V30c0-13.54-10-22-21-22s-21 9.33-21 21z" fill="#f9ab00"/>
                      <g fill="#e37400">
                        <path d="M75 96v65c0 14.77 10.2 23 21 23 10 0 21-7 21-23V97c0-13.54-10-22-21-22s-21 9.33-21 21z"/>
                        <circle cx="41" cy="163" r="21"/>
                      </g>
                    </g>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-text-primary">Google Analytics 4</h2>
                  <p className="text-sm text-text-secondary">
                    See pageviews and bounce rate with each scan
                  </p>
                </div>
              </div>

              {!integrations?.ga4 ? (
                <button onClick={handleConnectGA4} className="btn-primary w-full sm:w-auto">
                  Connect
                </button>
              ) : (
                <button
                  onClick={handleDisconnectGA4}
                  disabled={disconnectingGA4}
                  className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50 self-end sm:self-auto"
                >
                  {disconnectingGA4 ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
            </div>

            {integrations?.ga4 && (
              <div className="mt-6 pt-6 border-t border-border-subtle">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#EA4335] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">G</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    {integrations.ga4.property_id ? (
                      <>
                        <p className="font-medium text-text-primary truncate">
                          {integrations.ga4.property_name || `Property ${integrations.ga4.property_id}`}
                        </p>
                        <p className="text-xs text-text-muted">
                          {integrations.ga4.email}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-text-primary">
                          Property not selected
                        </p>
                        <p className="text-xs text-text-muted">
                          {integrations.ga4.email}
                        </p>
                      </>
                    )}
                  </div>
                  {integrations.ga4.pending_property_selection && (
                    <button
                      onClick={() => setShowGA4PropertySelect(true)}
                      className="text-sm text-accent font-medium hover:text-accent-hover transition-colors"
                    >
                      Select property
                    </button>
                  )}
                </div>

                {integrations.ga4.pending_property_selection && (
                  <div className="glass-card p-4 bg-score-low/5 border-l-4 border-score-low mb-4">
                    <p className="text-sm text-text-primary font-medium">Action required</p>
                    <p className="text-sm text-text-secondary mt-1">
                      Select a GA4 property to start pulling analytics data.
                    </p>
                  </div>
                )}

                <div className="glass-card p-4 bg-[rgba(91,46,145,0.04)]">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">How it works:</span>{" "}
                    We'll pull your analytics so you can see if changes actually moved the&nbsp;needle.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Supabase Integration */}
        <section className="mb-8">
          <div className="glass-card-elevated p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[#1C1C1C] flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6" viewBox="0 0 109 113" fill="none">
                    <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint0_linear)"/>
                    <path d="M63.7076 110.284C60.8481 113.885 55.0502 111.912 54.9813 107.314L53.9738 40.0627L99.1935 40.0627C107.384 40.0627 111.952 49.5228 106.859 55.9374L63.7076 110.284Z" fill="url(#paint1_linear)" fillOpacity="0.2"/>
                    <path d="M45.317 2.07103C48.1765 -1.53037 53.9745 0.442937 54.0434 5.041L54.4849 72.2922H9.83113C1.64038 72.2922 -2.92775 62.8321 2.1655 56.4175L45.317 2.07103Z" fill="#3ECF8E"/>
                    <defs>
                      <linearGradient id="paint0_linear" x1="53.9738" y1="54.974" x2="94.1635" y2="71.8295" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#249361"/>
                        <stop offset="1" stopColor="#3ECF8E"/>
                      </linearGradient>
                      <linearGradient id="paint1_linear" x1="36.1558" y1="30.578" x2="54.4844" y2="65.0806" gradientUnits="userSpaceOnUse">
                        <stop/>
                        <stop offset="1" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-text-primary">Supabase</h2>
                  <p className="text-sm text-text-secondary">
                    Track signups and orders from your database
                  </p>
                </div>
              </div>

              {!integrations?.supabase ? (
                <button
                  onClick={() => setShowSupabaseConnect(true)}
                  className="btn-primary w-full sm:w-auto"
                >
                  Connect
                </button>
              ) : (
                <button
                  onClick={handleDisconnectSupabase}
                  disabled={disconnectingSupabase}
                  className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50 self-end sm:self-auto"
                >
                  {disconnectingSupabase ? "Disconnecting..." : "Disconnect"}
                </button>
              )}
            </div>

            {integrations?.supabase && (
              <div className="mt-6 pt-6 border-t border-border-subtle">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-[#3ECF8E] flex items-center justify-center">
                    <span className="text-white font-bold text-sm">S</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {integrations.supabase.project_ref}.supabase.co
                    </p>
                    <p className="text-xs text-text-muted">
                      {integrations.supabase.key_type === "service_role"
                        ? "Service Role Key"
                        : "Anon Key"}{" "}
                      · {integrations.supabase.tables.length} tables found
                    </p>
                  </div>
                </div>

                {!integrations.supabase.has_schema_access && (
                  <div className="glass-card p-4 bg-score-mid/5 border-l-4 border-score-mid mb-4">
                    <p className="text-sm text-text-primary font-medium">Limited access</p>
                    <p className="text-sm text-text-secondary mt-1">
                      Your tables may have Row Level Security enabled. Consider using a Service Role Key for full access.
                    </p>
                    <button
                      onClick={() => setShowSupabaseConnect(true)}
                      className="text-sm text-accent font-medium mt-2 hover:text-accent-hover transition-colors"
                    >
                      Upgrade to Service Role Key
                    </button>
                  </div>
                )}

                {integrations.supabase.tables.length > 0 && (
                  <div className="glass-card p-4 mb-4">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">
                      Tables detected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {integrations.supabase.tables.slice(0, 8).map((table) => (
                        <span
                          key={table}
                          className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-mono bg-bg-inset text-text-secondary"
                        >
                          {table}
                        </span>
                      ))}
                      {integrations.supabase.tables.length > 8 && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-sm text-text-muted">
                          +{integrations.supabase.tables.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="glass-card p-4 bg-[rgba(91,46,145,0.04)]">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">How it works:</span>{" "}
                    We track row counts in tables like signups, orders, and waitlist to correlate page changes with real business outcomes.
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Email Notifications */}
        <section className="mb-8">
          <div className="glass-card-elevated p-5 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-xl font-semibold text-text-primary">Email Notifications</h2>
                  <p className="text-sm text-text-secondary">
                    Get notified when scans complete
                  </p>
                </div>
              </div>

              <button
                onClick={handleToggleEmailNotifications}
                disabled={togglingEmail}
                className={`relative w-11 h-6 sm:w-12 sm:h-7 rounded-full transition-colors duration-200 flex-shrink-0 ${
                  emailNotifications ? "bg-accent" : "bg-text-muted/30"
                } disabled:opacity-50`}
                role="switch"
                aria-checked={emailNotifications}
              >
                <span
                  className={`absolute top-0.5 sm:top-1 left-0.5 sm:left-1 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                    emailNotifications ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-border-subtle">
              <div className="glass-card p-4 bg-[rgba(91,46,145,0.04)]">
                <p className="text-sm text-text-secondary">
                  <span className="font-medium text-text-primary">What you'll get:</span>{" "}
                  Emails when your daily or weekly scans complete, and after GitHub-triggered deploy scans.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AddRepoModal
        isOpen={showAddRepo}
        onClose={() => setShowAddRepo(false)}
        onConnect={handleConnectRepo}
        connectingId={connectingId}
      />

      <PostHogConnectModal
        isOpen={showPostHogConnect}
        onClose={() => setShowPostHogConnect(false)}
        onSuccess={() => fetchIntegrations()}
      />

      <GA4PropertySelectModal
        isOpen={showGA4PropertySelect}
        onClose={() => setShowGA4PropertySelect(false)}
        onSuccess={() => fetchIntegrations()}
      />

      <SupabaseConnectModal
        isOpen={showSupabaseConnect}
        onClose={() => setShowSupabaseConnect(false)}
        onSuccess={() => fetchIntegrations()}
      />
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="glass-spinner mx-auto" />
            <p className="text-text-secondary mt-4">Loading integrations...</p>
          </div>
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
