import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { track } from "@/lib/analytics/track";
import type { GA4Property } from "./types";

export function GA4PropertySelectModal({
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
    if (!isOpen) setError("");
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !selectingId) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectingId, onClose]);

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

      track("integration_connected", { type: "ga4" });
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
      onClick={() => !selectingId && onClose()}
    >
      <div
        className="bg-surface-solid rounded-2xl shadow-xl p-6 w-full max-w-lg max-h-[80vh] flex flex-col border border-border-subtle"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          className="text-2xl font-bold text-text-primary mb-2"
          style={{ fontFamily: "var(--font-display)" }}
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
                  className="w-full glass-card p-4 text-left hover:border-[rgba(255,90,54,0.15)] transition-all duration-150 disabled:opacity-50"
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
