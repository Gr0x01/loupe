"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics/track";

const LOADING_STEPS = [
  "Checking your page...",
  "Reading headlines and CTAs...",
  "Checking trust signals and social proof...",
  "Reviewing visual hierarchy...",
  "Writing your audit...",
];

interface FreeAuditFormProps {
  /** Optional custom CTA text for the button */
  ctaText?: string;
  /** Optional custom placeholder for URL input */
  placeholder?: string;
  /** Optional className for the outer wrapper */
  className?: string;
  /** Show loading state inline (default) or redirect immediately */
  showLoadingInline?: boolean;
  /** Analytics source identifier (default: "homepage") */
  source?: "homepage" | "dashboard" | "page_detail" | "pricing";
}

export default function FreeAuditForm({
  ctaText = "Audit my page",
  placeholder = "https://yoursite.com",
  className = "",
  showLoadingInline = true,
  source = "homepage",
}: FreeAuditFormProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      setLoadingStep(0);
      intervalRef.current = setInterval(() => {
        setLoadingStep((prev) =>
          prev < LOADING_STEPS.length - 1 ? prev + 1 : prev
        );
      }, 3000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;

    setLoading(true);
    setError("");

    // Track audit start
    const trimmedUrl = url.trim();
    let domain = trimmedUrl;
    try { domain = new URL(trimmedUrl.startsWith("http") ? trimmedUrl : `https://${trimmedUrl}`).hostname; } catch { /* use raw */ }
    track("audit_started", { source, url: trimmedUrl, domain });

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmedUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Store pending audit so dashboard can auto-link after sign-up
      try {
        localStorage.setItem(
          "loupe_pending_audit",
          JSON.stringify({ analysisId: data.id, url: trimmedUrl, ts: Date.now() })
        );
      } catch { /* localStorage may be unavailable */ }

      router.push(`/analysis/${data.id}${data.cached ? "?cached=1" : ""}`);
    } catch {
      setError("Failed to start analysis. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div className="free-audit-shell">
        {loading && showLoadingInline ? (
          <div className="flex items-center justify-center py-3 px-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border-2 border-coral border-t-transparent animate-spin" />
              <span className="text-lg text-text-secondary">
                {LOADING_STEPS[loadingStep] || LOADING_STEPS[0]}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <input
              type="text"
              inputMode="url"
              aria-label="Website URL to audit"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={placeholder}
              className="free-audit-input flex-1 text-base px-4 py-2.5 outline-none
                         text-text-primary placeholder-text-muted"
            />
            <button
              type="submit"
              className="btn-primary free-audit-submit px-6 py-2.5 text-sm
                         flex-shrink-0 whitespace-nowrap"
            >
              {ctaText}
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm mt-3 text-center text-score-low">{error}</p>
      )}
    </form>
  );
}
