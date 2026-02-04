"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
  /** Optional className for the outer wrapper */
  className?: string;
  /** Show loading state inline (default) or redirect immediately */
  showLoadingInline?: boolean;
}

export default function FreeAuditForm({
  ctaText = "Audit my page",
  className = "",
  showLoadingInline = true,
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

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      router.push(`/analysis/${data.id}`);
    } catch {
      setError("Failed to start analysis. Please try again.");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={className}>
      <div
        className="bg-surface-solid rounded-2xl border border-border-subtle p-4
                    shadow-[0_2px_8px_rgba(17,17,24,0.06),0_1px_2px_rgba(17,17,24,0.04)]"
      >
        {loading && showLoadingInline ? (
          <div className="flex items-center justify-center py-3 px-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border-2 border-accent border-t-transparent animate-spin" />
              <span className="text-text-secondary text-lg">
                {LOADING_STEPS[loadingStep] || LOADING_STEPS[0]}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <input
              type="text"
              inputMode="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yoursite.com"
              className="flex-1 bg-transparent text-text-primary placeholder-text-muted
                         text-lg px-3 py-3 outline-none"
            />
            <button
              type="submit"
              disabled={!url.trim() || loading}
              className="btn-primary px-8 py-3
                         disabled:opacity-30 disabled:cursor-not-allowed
                         flex-shrink-0 whitespace-nowrap"
            >
              {ctaText}
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="text-sm text-score-low mt-3 text-center">{error}</p>
      )}
    </form>
  );
}
