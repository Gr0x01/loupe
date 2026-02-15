"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/analytics/track";
import { TIER_INFO, TIER_LIMITS, type SubscriptionTier } from "@/lib/permissions";
import {
  AddRepoModal,
  PostHogConnectModal,
  GA4PropertySelectModal,
  SupabaseConnectModal,
  GitHubSection,
  PostHogSection,
  GA4Section,
  SupabaseSection,
} from "@/components/settings";
import type { GitHubAvailableRepo, IntegrationsData } from "@/components/settings/types";

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
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
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  // Plan section state
  const [tier, setTier] = useState<SubscriptionTier>("free");
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [stripeCustomerId, setStripeCustomerId] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [portalLoading, setPortalLoading] = useState(false);
  // Delete account state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
        setTier(data.subscription_tier || "free");
        setSubscriptionStatus(data.subscription_status || null);
        setStripeCustomerId(data.stripe_customer_id || null);
      }
    } catch {
      // Ignore profile fetch errors - default to enabled
    }
  };

  const fetchPageCount = async () => {
    try {
      const res = await fetch("/api/pages");
      if (res.ok) {
        const data = await res.json();
        setPageCount(Array.isArray(data) ? data.length : 0);
      }
    } catch {
      // Ignore
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

  const fetchUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setUserEmail(user?.email ?? null);
    } catch {
      // Non-critical, leave email as null
    }
  };

  useEffect(() => {
    fetchIntegrations();
    fetchProfile();
    fetchPageCount();
    fetchUser();
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

  // Track integration connected events from OAuth callbacks (only once per session)
  const hasTrackedOAuth = useRef(false);
  useEffect(() => {
    if (hasTrackedOAuth.current) return;
    if (successParam === "github") {
      hasTrackedOAuth.current = true;
      track("integration_connected", { type: "github" });
    } else if (successParam === "ga4") {
      hasTrackedOAuth.current = true;
      track("integration_connected", { type: "ga4" });
    }
  }, [successParam]);

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

  const handleConnectRepo = async (repo: GitHubAvailableRepo) => {
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

      track("github_repo_connected", { repo_name: repo.full_name });

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

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to open billing portal");
        setPortalLoading(false);
      }
    } catch {
      setError("Failed to open billing portal");
      setPortalLoading(false);
    }
  };

  const deletingRef = useRef(false);
  const handleDeleteAccount = async () => {
    if (deletingRef.current) return;
    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        await supabase.auth.signOut();
        router.push("/");
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete account");
        deletingRef.current = false;
      }
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      deletingRef.current = false;
    } finally {
      setDeleting(false);
    }
  };

  // Escape key handler for delete modal
  useEffect(() => {
    if (!showDeleteModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !deleting) {
        setShowDeleteModal(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showDeleteModal, deleting]);

  if (loading) {
    return <PageLoader />;
  }

  return (
    <>
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="mb-10">
          <h1
            className="text-4xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Settings
          </h1>
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

        {/* ===== INTEGRATIONS SECTION ===== */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Integrations
            </h2>
          </div>

          <GitHubSection
            github={integrations?.github ?? null}
            onConnect={handleConnectGitHub}
            onDisconnect={handleDisconnectGitHub}
            disconnectingGitHub={disconnectingGitHub}
            onAddRepo={() => setShowAddRepo(true)}
            onDisconnectRepo={handleDisconnectRepo}
            disconnectingRepoId={disconnecting}
          />

          <PostHogSection
            posthog={integrations?.posthog ?? null}
            onConnect={() => setShowPostHogConnect(true)}
            onDisconnect={handleDisconnectPostHog}
            disconnecting={disconnectingPostHog}
          />

          <GA4Section
            ga4={integrations?.ga4 ?? null}
            onConnect={handleConnectGA4}
            onDisconnect={handleDisconnectGA4}
            disconnecting={disconnectingGA4}
            onSelectProperty={() => setShowGA4PropertySelect(true)}
          />

          <SupabaseSection
            supabase={integrations?.supabase ?? null}
            onConnect={() => setShowSupabaseConnect(true)}
            onDisconnect={handleDisconnectSupabase}
            disconnecting={disconnectingSupabase}
          />

          {/* Email Notifications */}
          <section>
            <div className="glass-card-elevated p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-lg sm:text-xl font-semibold text-text-primary">Email Notifications</h3>
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
                <div className="glass-card p-4 bg-[rgba(255,90,54,0.04)]">
                  <p className="text-sm text-text-secondary">
                    <span className="font-medium text-text-primary">What you&apos;ll get:</span>{" "}
                    Emails when your daily or weekly scans complete, and after GitHub-triggered deploy scans.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ===== PLAN SECTION ===== */}
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Plan
            </h2>
          </div>

          <section>
            <div className="glass-card-elevated p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg sm:text-xl font-semibold text-text-primary">
                        {TIER_INFO[tier].name}
                      </h3>
                      {tier !== "free" && subscriptionStatus && (
                        subscriptionStatus === "active" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-score-high/10 text-score-high">
                            Active
                          </span>
                        ) : subscriptionStatus === "past_due" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-score-mid/10 text-score-mid">
                            Past due
                          </span>
                        ) : subscriptionStatus === "trialing" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                            Trial
                          </span>
                        ) : subscriptionStatus === "canceled" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-text-muted/10 text-text-muted">
                            Canceled
                          </span>
                        ) : null
                      )}
                    </div>
                    <p className="text-sm text-text-secondary">
                      {pageCount} of {TIER_LIMITS[tier].pages} pages used
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border-subtle flex flex-wrap gap-3">
                {tier !== "pro" && (
                  <Link href="/pricing" className="btn-primary">
                    Upgrade
                  </Link>
                )}
                {stripeCustomerId && (
                  <button
                    onClick={handleOpenPortal}
                    disabled={portalLoading}
                    className="btn-secondary"
                  >
                    {portalLoading ? "Opening..." : "Manage subscription"}
                  </button>
                )}
              </div>
            </div>
          </section>
        </div>

        {/* ===== ACCOUNT SECTION ===== */}
        <div>
          <div className="flex items-center gap-2 mb-6">
            <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Account
            </h2>
          </div>

          <section>
            <div className="glass-card-elevated p-5 sm:p-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  {userEmail ? (
                    <>
                      <p className="font-medium text-text-primary truncate">
                        {userEmail}
                      </p>
                      <p className="text-sm text-text-muted">
                        Signed in via magic link
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-text-primary">
                        Your account
                      </p>
                      <p className="text-sm text-text-muted">
                        Signed in
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-border-subtle flex items-center justify-between">
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="text-sm text-text-muted hover:text-score-low transition-colors disabled:opacity-50"
                >
                  {signingOut ? "Signing out..." : "Sign out"}
                </button>
                <button
                  onClick={() => {
                    setShowDeleteModal(true);
                    setDeleteConfirmText("");
                    setDeleteError("");
                  }}
                  className="text-sm text-text-muted hover:text-score-low transition-colors"
                >
                  Delete account
                </button>
              </div>
            </div>
          </section>
        </div>
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

      {showDeleteModal && mounted && createPortal(
        <div
          className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div
            className="bg-surface-solid rounded-2xl shadow-xl p-6 w-full max-w-md border border-border-subtle"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-account-title"
            onKeyDown={(e) => {
              if (e.key !== "Tab") return;
              const focusable = e.currentTarget.querySelectorAll<HTMLElement>(
                "input:not([disabled]), button:not([disabled])"
              );
              if (focusable.length === 0) return;
              const first = focusable[0];
              const last = focusable[focusable.length - 1];
              if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
              } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }}
          >
            <h2
              id="delete-account-title"
              className="text-2xl font-bold text-text-primary mb-2"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Delete account
            </h2>
            <p className="text-sm text-text-secondary mb-4">
              This will permanently delete your account and all associated data:
            </p>
            <ul className="text-sm text-text-secondary mb-6 space-y-1 list-disc list-inside">
              <li>All tracked pages and scan history</li>
              <li>Detected changes and observations</li>
              <li>Connected integrations</li>
              {stripeCustomerId && <li>Your subscription will be canceled</li>}
            </ul>

            <div className="mb-4">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                Type <span className="font-mono font-bold text-text-primary">delete</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input-glass w-full"
                placeholder="delete"
                disabled={deleting}
                autoFocus
              />
            </div>

            {deleteError && (
              <div className="text-score-low text-sm mb-4">{deleteError}</div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="btn-secondary flex-1"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText.trim().toLowerCase() !== "delete" || deleting}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-score-low text-white hover:bg-score-low/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <div className="glass-spinner mx-auto" />
            <p className="text-text-secondary mt-4">Loading settings...</p>
          </div>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
