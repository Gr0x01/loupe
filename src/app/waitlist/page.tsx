"use client";

import { useState } from "react";
import Link from "next/link";

export default function WaitlistPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to join waitlist");
        setLoading(false);
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Back link */}
        <Link
          href="/"
          className="text-sm text-text-muted hover:text-accent transition-colors"
        >
          &larr; Back to Loupe
        </Link>

        {submitted ? (
          <div className="mt-8">
            <div className="w-16 h-16 rounded-full bg-[rgba(91,46,145,0.1)] flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1
              className="text-4xl text-text-primary tracking-tight"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              You're on the list
            </h1>
            <p className="text-text-secondary mt-4 text-lg">
              We'll email you when a spot opens up.
            </p>
            <div className="mt-8">
              <Link href="/" className="btn-secondary inline-block">
                Run a free audit
              </Link>
            </div>
          </div>
        ) : (
          <>
            <h1
              className="text-4xl text-text-primary tracking-tight mt-8"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Founding 50 is full
            </h1>
            <p className="text-text-secondary mt-4 text-lg">
              Join the waitlist and we'll notify you when a spot opens.
            </p>

            <div className="glass-card-elevated p-6 mt-8">
              <form onSubmit={handleSubmit}>
                <label htmlFor="email" className="block text-sm text-text-secondary mb-2 text-left">
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="input-glass w-full"
                />
                <button
                  type="submit"
                  disabled={!email.trim() || loading}
                  className="btn-primary w-full mt-4
                             disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {loading ? "Joining..." : "Join waitlist"}
                </button>
              </form>

              {error && (
                <p className="text-sm text-score-low mt-3 text-center">{error}</p>
              )}
            </div>

            <p className="text-sm text-text-muted mt-6">
              Free audits are still available.{" "}
              <Link href="/" className="text-accent hover:underline">
                Try one now
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
