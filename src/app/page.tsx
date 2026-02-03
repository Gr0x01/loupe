"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface FoundingStatus {
  claimed: number;
  total: number;
  isFull: boolean;
  remaining: number;
}

const LOADING_STEPS = [
  "Screenshotting your page...",
  "Reading headlines and CTAs...",
  "Checking trust signals and social proof...",
  "Reviewing visual hierarchy...",
  "Writing your audit...",
];

function HeroInput({
  onSubmit,
  loading,
  error,
  loadingStep,
}: {
  onSubmit: (url: string) => void;
  loading: boolean;
  error: string;
  loadingStep: number;
}) {
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || loading) return;
    onSubmit(url.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <div
        className="bg-surface-solid rounded-2xl border border-border-subtle p-4
                    shadow-[0_2px_8px_rgba(17,17,24,0.06),0_1px_2px_rgba(17,17,24,0.04)]"
      >
        {loading ? (
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
              disabled={!url.trim()}
              className="bg-accent text-white font-semibold px-8 py-3 rounded-xl
                         hover:bg-accent-hover active:scale-[0.98]
                         transition-all duration-150
                         disabled:opacity-30 disabled:cursor-not-allowed
                         flex-shrink-0 whitespace-nowrap"
            >
              Audit this page
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

function FoundingProgress({ status }: { status: FoundingStatus | null }) {
  if (!status) return null;

  const percentage = Math.round((status.claimed / status.total) * 100);

  if (status.isFull) {
    return (
      <div className="text-center">
        <p className="text-text-secondary">
          Founding 50 is full.{" "}
          <Link href="/waitlist" className="text-accent font-medium hover:underline">
            Join the waitlist
          </Link>
        </p>
        <p className="text-sm text-text-muted mt-1">
          Free audits still work. No signup needed.
        </p>
      </div>
    );
  }

  return (
    <div className="text-center">
      <div className="inline-flex items-center gap-3 bg-surface-solid rounded-full px-4 py-2 border border-border-subtle">
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-bg-inset rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-700"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <span className="text-sm font-medium text-text-primary">
            {status.claimed}/{status.total}
          </span>
        </div>
        <span className="text-sm text-text-secondary">Founding spots claimed</span>
      </div>
      <p className="text-sm text-text-muted mt-3">
        Free. No signup required for audits.{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>{" "}
        to monitor pages.
      </p>
    </div>
  );
}

function ExampleResultPreview() {
  return (
    <div
      className="bg-surface-solid rounded-2xl border border-border-subtle p-6 sm:p-8
                  shadow-[0_2px_8px_rgba(17,17,24,0.06),0_1px_2px_rgba(17,17,24,0.04)] text-left max-w-xl mx-auto"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
            Example audit
          </p>
          <p className="text-sm text-text-secondary mt-1">acme-saas.com</p>
        </div>
        <div className="text-right">
          <div
            className="text-4xl text-text-primary leading-none"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            64
          </div>
          <p className="text-xs text-text-muted mt-0.5">/100</p>
        </div>
      </div>

      {/* Category scores */}
      <div className="space-y-3 mb-6">
        {[
          { name: "Messaging & Copy", score: 58, color: "var(--score-mid)" },
          { name: "Call to Action", score: 42, color: "var(--score-low)" },
          { name: "Visual Hierarchy", score: 75, color: "var(--score-high)" },
        ].map((cat) => (
          <div key={cat.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-text-secondary">{cat.name}</span>
              <span className="text-sm font-medium text-text-primary">
                {cat.score}
              </span>
            </div>
            <div className="h-1.5 bg-bg-inset rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${cat.score}%`,
                  backgroundColor: cat.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Sample findings */}
      <div className="space-y-2">
        <div className="flex gap-3 p-3 bg-[#FDECEC] border border-[#E8B8B8] rounded-lg">
          <span className="text-score-low text-sm mt-0.5 font-bold">!</span>
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">
              CTA below the fold.
            </span>{" "}
            Primary action isn't visible without scrolling.
          </p>
        </div>
        <div className="flex gap-3 p-3 bg-[#E8F5EE] border border-[#B8DFC9] rounded-lg">
          <span className="text-score-high text-sm mt-0.5">&#10003;</span>
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">
              Clear headline.
            </span>{" "}
            Communicates the core value in under 8 words.
          </p>
        </div>
      </div>

      {/* Fade out to imply more */}
      <div className="relative mt-2">
        <div className="flex gap-3 p-3 bg-[#FFF5E0] border border-[#E0D5A0] rounded-lg opacity-40">
          <span className="text-score-mid text-sm mt-0.5">&#9734;</span>
          <p className="text-sm text-text-secondary">
            <span className="font-medium text-text-primary">
              Add social proof.
            </span>{" "}
            No testimonials or trust signals visible...
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-white to-transparent" />
      </div>

      <p className="text-xs text-text-muted mt-3 text-center">
        and 9 more findings
      </p>
    </div>
  );
}

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);
  const [foundingStatus, setFoundingStatus] = useState<FoundingStatus | null>(null);
  const router = useRouter();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Fetch founding 50 status
    fetch("/api/founding-status")
      .then((res) => res.json())
      .then((data) => setFoundingStatus(data))
      .catch(() => {}); // Silently fail — status is nice-to-have
  }, []);

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

  async function handleAnalyze(url: string) {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
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
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h1
            className="text-[clamp(2.75rem,6vw,4.5rem)] leading-[1.05] tracking-tight text-text-primary"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Your site changed.
            <br />
            <span className="text-accent">Did you notice?</span>
          </h1>
          <p className="text-lg text-text-secondary mt-5 max-w-lg mx-auto leading-relaxed">
            Paste a URL. We'll audit your headlines, CTAs, trust signals, and
            layout in 60 seconds, then tell you exactly what needs fixing.
          </p>

          <div className="mt-10">
            <HeroInput
              onSubmit={handleAnalyze}
              loading={loading}
              error={error}
              loadingStep={loadingStep}
            />
          </div>

          <div className="mt-6">
            <FoundingProgress status={foundingStatus} />
          </div>
        </div>
      </section>

      {/* Example Result Preview */}
      <section className="px-4 pb-24">
        <div className="w-full max-w-2xl mx-auto">
          <h2
            className="text-[clamp(1.75rem,3vw,2.5rem)] text-text-primary text-center mb-8 leading-tight"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            A full read of your page, not a generic score
          </h2>
          <ExampleResultPreview />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-bg-inset px-4 py-20 border-t border-border-subtle">
        <div className="w-full max-w-2xl mx-auto text-center">
          <p
            className="text-xl text-text-secondary mb-8 italic"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Paste a URL above. See what your page looks like to a stranger.
          </p>
          <HeroInput
            onSubmit={handleAnalyze}
            loading={loading}
            error={error}
            loadingStep={loadingStep}
          />
        </div>
      </section>
    </div>
  );
}
