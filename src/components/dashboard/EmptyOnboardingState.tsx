"use client";

import { useState } from "react";

export interface ClaimSuggestion {
  label: string;
  url: string;
  reason?: string;
}

interface EmptyOnboardingStateProps {
  onAddPage: (url: string, name: string) => Promise<string | void>;
  loading: boolean;
  onMetricFocusDone?: () => void;
  claimSuggestions?: ClaimSuggestion[];
}

const METRIC_OPTIONS = [
  { label: "Signups", value: "signups" },
  { label: "Bounce Rate", value: "bounce rate" },
  { label: "Time on Page", value: "time on page" },
  { label: "Custom", value: "__custom__" },
];

export function EmptyOnboardingState({
  onAddPage,
  loading,
  onMetricFocusDone,
  claimSuggestions = [],
}: EmptyOnboardingStateProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [step, setStep] = useState<"url" | "metric_focus">("url");
  const [pageId, setPageId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [customMetric, setCustomMetric] = useState("");
  const [savingMetric, setSavingMetric] = useState(false);

  const normalizeUrl = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "https://" + normalized;
    }

    try {
      return new URL(normalized).toString();
    } catch {
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url.trim()) {
      setError("Paste a URL to get started.");
      return;
    }

    const normalized = normalizeUrl(url);
    if (!normalized) {
      setError("That doesn't look like a valid URL.");
      return;
    }

    setUrl(normalized);

    try {
      const result = await onAddPage(normalized, "");
      if (typeof result === "string") {
        // Got page ID back — show metric focus step
        setPageId(result);
        setStep("metric_focus");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
  };

  const handleSuggestionClick = async (suggestedUrl: string) => {
    if (loading) return;
    setError("");

    const normalized = normalizeUrl(suggestedUrl);
    if (!normalized) {
      setError("That suggestion looks invalid. Paste your URL instead.");
      return;
    }

    setUrl(normalized);

    try {
      const result = await onAddPage(normalized, "");
      if (typeof result === "string") {
        setPageId(result);
        setStep("metric_focus");
      }
    } catch {
      setError("Something went wrong. Try again.");
    }
  };

  const handleMetricSave = async () => {
    if (!pageId) return;

    const value = selectedMetric === "__custom__" ? customMetric.trim() : selectedMetric;
    if (!value) return;

    setSavingMetric(true);
    try {
      const res = await fetch(`/api/pages/${pageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metric_focus: value }),
      });
      if (!res.ok) console.warn("Failed to save metric focus:", res.status);
    } catch {
      // Non-critical — page still works without metric focus
    } finally {
      setSavingMetric(false);
      onMetricFocusDone?.();
    }
  };

  const handleMetricSelect = async (value: string) => {
    if (!pageId) return;
    setSelectedMetric(value);
    if (value !== "__custom__") {
      // Auto-save and we're done — the page is already being analyzed
      setSavingMetric(true);
      try {
        const res = await fetch(`/api/pages/${pageId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ metric_focus: value }),
        });
        if (!res.ok) console.warn("Failed to save metric focus:", res.status);
      } catch {
        // Non-critical
      } finally {
        setSavingMetric(false);
        onMetricFocusDone?.();
      }
    }
  };

  if (step === "metric_focus") {
    return (
      <div className="flex items-center justify-center py-8 sm:py-16">
        <div className="glass-card-elevated p-6 sm:p-10 w-full max-w-[480px]">
          {/* Badge */}
          <span
            className="inline-flex items-center text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-5"
            style={{ background: "var(--emerald-subtle)", color: "var(--emerald)" }}
          >
            One more thing
          </span>

          {/* Headline */}
          <h2
            className="text-2xl sm:text-3xl font-bold text-text-primary mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What matters most?
          </h2>

          {/* Subtext */}
          <p className="text-ink-500 text-sm sm:text-base mb-6 leading-relaxed">
            Tell Loupe what metric you care about. We&apos;ll evaluate changes through this lens.
          </p>

          {/* Metric options grid */}
          <div className="metric-focus-grid">
            {METRIC_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleMetricSelect(option.value)}
                disabled={savingMetric}
                className={`metric-focus-option ${
                  selectedMetric === option.value ? "metric-focus-option-selected" : ""
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom input */}
          {selectedMetric === "__custom__" && (
            <div className="mt-4 flex items-stretch gap-3">
              <input
                type="text"
                placeholder="e.g. demo requests, add to cart"
                value={customMetric}
                onChange={(e) => setCustomMetric(e.target.value)}
                className="input-glass flex-1 text-sm"
                maxLength={200}
                autoFocus
              />
              <button
                type="button"
                onClick={handleMetricSave}
                disabled={savingMetric || !customMetric.trim()}
                className="btn-primary text-sm whitespace-nowrap"
              >
                {savingMetric ? "Saving..." : "Save"}
              </button>
            </div>
          )}

          {/* Skip link */}
          <p className="text-center mt-5">
            <button
              type="button"
              onClick={() => onMetricFocusDone?.()}
              className="text-sm text-ink-400 hover:text-ink-600 transition-colors"
            >
              Skip — I&apos;ll set this later
            </button>
          </p>
        </div>
      </div>
    );
  }

  const canSubmit = !!normalizeUrl(url);

  return (
    <div className="flex items-center justify-center py-8 sm:py-16">
      <div
        className={`glass-card-elevated p-6 sm:p-10 w-full max-w-[480px] transition-shadow duration-200 ${
          isFocused ? "onboarding-card-focused" : ""
        }`}
      >
        {/* Badge */}
        <span
          className="inline-flex items-center text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-5"
          style={{ background: "var(--blue-subtle)", color: "var(--blue)" }}
        >
          Get started
        </span>

        {/* Headline */}
        <h2
          className="text-2xl sm:text-3xl font-bold text-text-primary mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Add your first page
        </h2>

        {/* Subtext */}
        <p className="text-ink-500 text-sm sm:text-base mb-6 leading-relaxed">
          Paste any URL. We&apos;ll screenshot it, audit it for conversion issues, and start
          tracking changes.
        </p>

        {claimSuggestions.length > 0 && (
          <div className="mb-5">
            <p className="onboarding-suggestion-label">Suggested first pages</p>
            <div className="onboarding-suggestion-grid">
              {claimSuggestions.map((suggestion) => (
                <button
                  key={suggestion.url}
                  type="button"
                  className="onboarding-suggestion"
                  onClick={() => handleSuggestionClick(suggestion.url)}
                  disabled={loading}
                >
                  <span className="onboarding-suggestion-title">{suggestion.label}</span>
                  <span className="onboarding-suggestion-url">{suggestion.url}</span>
                  {suggestion.reason && (
                    <span className="onboarding-suggestion-reason">{suggestion.reason}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input form */}
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col sm:flex-row items-stretch gap-3">
            <input
              type="text"
              inputMode="url"
              placeholder="https://yoursite.com"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              className={`input-glass flex-1 text-base sm:text-lg ${
                error ? "onboarding-input-error" : ""
              }`}
              disabled={loading}
              autoFocus
            />
            <button
              type="submit"
              className="btn-primary whitespace-nowrap text-base"
              disabled={loading || !canSubmit}
            >
              {loading ? "Adding..." : "Start watching"}
            </button>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm font-medium mt-3" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}
          {!error && !url.trim() && (
            <p className="text-xs mt-3 text-[var(--ink-400)]">
              Paste a URL to enable &ldquo;Start watching&rdquo;.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
