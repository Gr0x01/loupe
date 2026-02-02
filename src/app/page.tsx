"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
        className="bg-[#1C1F2E] rounded-2xl border border-[#252838] p-4
                    shadow-[0_4px_32px_rgba(0,0,0,0.4)]"
      >
        {loading ? (
          <div className="flex items-center justify-center py-3 px-3">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 rounded-full border-2 border-[#00D4FF] border-t-transparent animate-spin" />
              <span className="text-[#9BA1B0] text-lg">
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
              className="flex-1 bg-transparent text-[#F0F0F3] placeholder-[#5C6170]
                         text-lg px-3 py-3 outline-none"
            />
            <button
              type="submit"
              disabled={!url.trim()}
              className="bg-[#00D4FF] text-[#0F1117] font-semibold px-8 py-3 rounded-xl
                         hover:bg-[#00B8E0] active:scale-[0.98]
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
        <p className="text-sm text-[#F87171] mt-3 text-center">{error}</p>
      )}
    </form>
  );
}

function ExampleResultPreview() {
  return (
    <div
      className="bg-[#1C1F2E] rounded-2xl border border-[#252838] p-6 sm:p-8
                  shadow-[0_2px_20px_rgba(0,0,0,0.3)] text-left max-w-xl mx-auto"
    >
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs font-medium text-[#5C6170] uppercase tracking-wide">
            Example audit
          </p>
          <p className="text-sm text-[#9BA1B0] mt-1">acme-saas.com</p>
        </div>
        <div className="text-right">
          <div
            className="text-4xl text-[#F0F0F3] leading-none"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            64
          </div>
          <p className="text-xs text-[#5C6170] mt-0.5">/100</p>
        </div>
      </div>

      {/* Category scores */}
      <div className="space-y-3 mb-6">
        {[
          { name: "Messaging & Copy", score: 58, color: "#FBBF24" },
          { name: "Call to Action", score: 42, color: "#F87171" },
          { name: "Visual Hierarchy", score: 75, color: "#34D399" },
        ].map((cat) => (
          <div key={cat.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-[#9BA1B0]">{cat.name}</span>
              <span className="text-sm font-medium text-[#F0F0F3]">
                {cat.score}
              </span>
            </div>
            <div className="h-1.5 bg-[#252838] rounded-full overflow-hidden">
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
        <div className="flex gap-3 p-3 bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] rounded-lg">
          <span className="text-[#F87171] text-sm mt-0.5 font-bold">!</span>
          <p className="text-sm text-[#9BA1B0]">
            <span className="font-medium text-[#F0F0F3]">
              CTA below the fold.
            </span>{" "}
            Primary action isn't visible without scrolling.
          </p>
        </div>
        <div className="flex gap-3 p-3 bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)] rounded-lg">
          <span className="text-[#34D399] text-sm mt-0.5">&#10003;</span>
          <p className="text-sm text-[#9BA1B0]">
            <span className="font-medium text-[#F0F0F3]">
              Clear headline.
            </span>{" "}
            Communicates the core value in under 8 words.
          </p>
        </div>
      </div>

      {/* Fade out to imply more */}
      <div className="relative mt-2">
        <div className="flex gap-3 p-3 bg-[rgba(251,191,36,0.06)] border border-[rgba(251,191,36,0.15)] rounded-lg opacity-40">
          <span className="text-[#FBBF24] text-sm mt-0.5">&#9734;</span>
          <p className="text-sm text-[#9BA1B0]">
            <span className="font-medium text-[#F0F0F3]">
              Add social proof.
            </span>{" "}
            No testimonials or trust signals visible...
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#1C1F2E] to-transparent" />
      </div>

      <p className="text-xs text-[#5C6170] mt-3 text-center">
        and 9 more findings
      </p>
    </div>
  );
}

export default function Home() {
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
    <div className="min-h-screen bg-[#0F1117]">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center min-h-screen px-4 py-16">
        <div className="w-full max-w-2xl mx-auto text-center">
          <h1
            className="text-[clamp(2.75rem,6vw,4.5rem)] leading-[1.05] tracking-tight text-[#F0F0F3]"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Your site changed.
            <br />
            <span className="text-[#00D4FF]">Did you notice?</span>
          </h1>
          <p className="text-lg text-[#9BA1B0] mt-5 max-w-lg mx-auto leading-relaxed">
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

          <p className="text-sm text-[#5C6170] mt-5">
            Free. No signup. Takes 60 seconds.
          </p>
        </div>
      </section>

      {/* Example Result Preview */}
      <section className="px-4 pb-24">
        <div className="w-full max-w-2xl mx-auto">
          <h2
            className="text-[clamp(1.75rem,3vw,2.5rem)] text-[#F0F0F3] text-center mb-8 leading-tight"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            A full read of your page, not a generic score
          </h2>
          <ExampleResultPreview />
        </div>
      </section>

      {/* Closing CTA */}
      <section className="bg-[#161922] px-4 py-20 border-t border-[#252838]">
        <div className="w-full max-w-2xl mx-auto text-center">
          <p
            className="text-xl text-[#9BA1B0] mb-8 italic"
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
