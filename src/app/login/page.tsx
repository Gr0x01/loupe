"use client";

import { useState, useMemo, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface FoundingStatus {
  claimed: number;
  total: number;
  isFull: boolean;
  remaining: number;
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [foundingStatus, setFoundingStatus] = useState<FoundingStatus | null>(null);
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    fetch("/api/founding-status")
      .then((res) => res.json())
      .then((data) => setFoundingStatus(data))
      .catch(() => {});
  }, []);

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    setSent(true);
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
    }
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || waitlistLoading) return;

    setWaitlistLoading(true);
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
        setWaitlistLoading(false);
        return;
      }

      setWaitlistSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setWaitlistLoading(false);
    }
  }

  // Show waitlist form if founding 50 is full
  const showWaitlist = foundingStatus?.isFull;

  // Waitlist submitted success state
  if (waitlistSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-accent transition-colors"
          >
            &larr; Back to Loupe
          </Link>
          <div className="mt-8">
            <div className="w-16 h-16 rounded-full bg-[rgba(255,90,54,0.1)] flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1
              className="text-4xl text-text-primary tracking-tight"
              style={{ fontFamily: "var(--font-display)" }}
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
        </div>
      </div>
    );
  }

  // Waitlist form (when founding 50 is full)
  if (showWaitlist) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-10">
            <Link
              href="/"
              className="text-sm text-text-muted hover:text-accent transition-colors"
            >
              &larr; Back to Loupe
            </Link>
            <h1
              className="text-4xl text-text-primary tracking-tight mt-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Founding 50 is full
            </h1>
            <p className="text-text-secondary mt-3">
              Join the waitlist and we'll notify you when a spot opens.
            </p>
          </div>

          <div className="glass-card-elevated p-6">
            <form onSubmit={handleWaitlist}>
              <label htmlFor="email" className="block text-sm text-text-secondary mb-2">
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
                disabled={!email.trim() || waitlistLoading}
                className="btn-primary w-full mt-4
                           disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {waitlistLoading ? "Joining..." : "Join waitlist"}
              </button>
            </form>

            {error && (
              <p className="text-sm text-score-low mt-3 text-center">{error}</p>
            )}
          </div>

          <p className="text-center text-xs text-text-muted mt-6">
            Free audits are still available.{" "}
            <Link href="/" className="text-accent hover:underline">
              Try one now
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Normal login form
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="text-sm text-text-muted hover:text-accent transition-colors"
          >
            &larr; Back to Loupe
          </Link>
          <h1
            className="text-4xl text-text-primary tracking-tight mt-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Sign in to Loupe
          </h1>
          <p className="text-text-secondary mt-3">
            Monitor your pages. Get notified when things change.
          </p>
        </div>

        {/* Card */}
        <div className="glass-card-elevated p-6">
          {sent ? (
            <div className="text-center py-4">
              <p className="text-text-primary font-medium mb-2">Check your email</p>
              <p className="text-sm text-text-secondary">
                We sent a sign-in link to{" "}
                <span className="text-text-primary font-medium">{email}</span>
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-accent text-sm font-medium mt-4
                           hover:bg-[rgba(255,90,54,0.08)] px-3 py-1.5 rounded-lg
                           transition-colors duration-150"
              >
                Use a different email
              </button>
            </div>
          ) : (
            <>
              {/* Google OAuth */}
              <button
                onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-3
                           bg-[rgba(255,255,255,0.5)] text-text-primary font-medium py-3 px-4 rounded-xl
                           border border-border-subtle hover:border-accent-border
                           hover:bg-[rgba(255,255,255,0.8)] active:scale-[0.98]
                           transition-all duration-150"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border-subtle" />
                <span className="text-xs text-text-muted uppercase tracking-wide">or</span>
                <div className="flex-1 h-px bg-border-subtle" />
              </div>

              {/* Magic link form */}
              <form onSubmit={handleMagicLink}>
                <label htmlFor="email" className="block text-sm text-text-secondary mb-2">
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
                  {loading ? "Sending..." : "Send magic link"}
                </button>
              </form>

              {error && (
                <p className="text-sm text-score-low mt-3 text-center">{error}</p>
              )}
            </>
          )}
        </div>

        <p className="text-center text-xs text-text-muted mt-6">
          No password needed. We&apos;ll email you a sign-in link.
        </p>
      </div>
    </div>
  );
}
