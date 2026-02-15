import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/lib/analytics/track";
import { EyeToggleButton } from "./EyeToggleButton";

export function SupabaseConnectModal({
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
  const [useServiceKey, setUseServiceKey] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !connecting) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, connecting, onClose]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProjectUrl("");
      setAnonKey("");
      setServiceRoleKey("");
      setUseServiceKey(true);
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

      track("integration_connected", { type: "supabase" });
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

            {/* Key type selection cards */}
            <fieldset>
              <legend className="block text-sm font-medium text-text-secondary mb-2">
                Which key do you have?
              </legend>
              <div className="grid grid-cols-2 gap-3">
                {/* Service Role Key option */}
                <button
                  type="button"
                  onClick={() => setUseServiceKey(true)}
                  className={`relative text-left p-3.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                    useServiceKey
                      ? "glass-card-active"
                      : "glass-card"
                  }`}
                  role="radio"
                  aria-checked={useServiceKey}
                >
                  <span className="inline-flex items-center gap-1.5 mb-2">
                    <span className="text-sm font-semibold text-text-primary">
                      Service Role
                    </span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-score-high/10 text-score-high border border-score-high/15">
                      Best
                    </span>
                  </span>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Sees all your tables. We can track signups, orders, and&nbsp;more.
                  </p>
                </button>

                {/* Anon Key option */}
                <button
                  type="button"
                  onClick={() => setUseServiceKey(false)}
                  className={`relative text-left p-3.5 rounded-xl border transition-all duration-150 active:scale-[0.98] ${
                    !useServiceKey
                      ? "glass-card-active"
                      : "glass-card"
                  }`}
                  role="radio"
                  aria-checked={!useServiceKey}
                >
                  <span className="block text-sm font-semibold text-text-primary mb-2">
                    Public (Anon)
                  </span>
                  <p className="text-xs text-text-muted leading-relaxed">
                    Limited access. Some tables may be hidden from us.
                  </p>
                </button>
              </div>
            </fieldset>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                {useServiceKey ? "Service Role Key" : "Anon Key"}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  placeholder="eyJhbGciOi..."
                  value={useServiceKey ? serviceRoleKey : anonKey}
                  onChange={(e) =>
                    useServiceKey
                      ? setServiceRoleKey(e.target.value)
                      : setAnonKey(e.target.value)
                  }
                  className="input-glass w-full pr-10"
                  required
                />
                <EyeToggleButton show={showKey} onToggle={() => setShowKey(!showKey)} />
              </div>
              <p className="text-xs text-text-muted mt-1">
                {useServiceKey
                  ? "Supabase → Settings → API → service_role key"
                  : "Supabase → Settings → API → anon public key"}
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
