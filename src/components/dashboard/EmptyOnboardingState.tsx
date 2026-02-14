"use client";

import { useState } from "react";

interface EmptyOnboardingStateProps {
  onAddPage: (url: string, name: string) => Promise<void>;
  loading: boolean;
}

export function EmptyOnboardingState({ onAddPage, loading }: EmptyOnboardingStateProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const trimmed = url.trim();
    if (!trimmed) {
      setError("Paste a URL to get started.");
      return;
    }

    // Basic URL validation
    let normalized = trimmed;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = "https://" + normalized;
    }

    try {
      new URL(normalized);
    } catch {
      setError("That doesn't look like a valid URL.");
      return;
    }

    setUrl(normalized);

    try {
      await onAddPage(normalized, "");
    } catch {
      setError("Something went wrong. Try again.");
    }
  };

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
              disabled={loading || !url.trim()}
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
        </form>
      </div>
    </div>
  );
}
