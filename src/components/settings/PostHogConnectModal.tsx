import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/lib/analytics/track";
import { EyeToggleButton } from "./EyeToggleButton";

export function PostHogConnectModal({
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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setApiKey("");
      setProjectId("");
      setHost("https://us.i.posthog.com");
      setError("");
      setShowApiKey(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !connecting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, connecting, onClose]);

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

      track("integration_connected", { type: "posthog" });
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
      onClick={() => !connecting && onClose()}
    >
      <div
        className="bg-surface-solid rounded-2xl shadow-xl p-6 w-full max-w-md border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-4"
          style={{ fontFamily: "var(--font-display)" }}
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
                <EyeToggleButton show={showApiKey} onToggle={() => setShowApiKey(!showApiKey)} />
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
