"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// --- Types ---

interface Finding {
  type: "strength" | "issue" | "suggestion";
  title: string;
  detail: string;
}

interface Category {
  name: string;
  score: number;
  findings: Finding[];
}

interface StructuredOutput {
  overallScore: number;
  categories: Category[];
  summary: string;
  topActions: string[];
}

interface Analysis {
  id: string;
  url: string;
  status: "pending" | "processing" | "complete" | "failed";
  screenshot_url: string | null;
  structured_output: StructuredOutput | null;
  error_message: string | null;
  created_at: string;
}

// --- Constants ---

const LOADING_STEPS = [
  "Screenshotting your page...",
  "Reading headlines and CTAs...",
  "Checking trust signals and social proof...",
  "Reviewing visual hierarchy...",
  "Writing your audit...",
];

const CATEGORY_EXPLAINERS: Record<string, string> = {
  "Messaging & Copy":
    "Visitors decide in seconds whether this page is for them. Unclear or generic copy makes that decision easy — they leave.",
  "Call to Action":
    "Every page needs one clear next step. When CTAs compete, hide, or ask too much too soon, conversions drop.",
  "Trust & Social Proof":
    "People look for reasons to say no. Testimonials, logos, and specifics give them reasons to say yes instead.",
  "Visual Hierarchy":
    "If visitors can't find what matters in a glance, they won't dig for it. Hierarchy controls what gets seen first.",
  "Design Quality":
    "Design signals credibility before a single word gets read. Rough edges make people question everything else.",
  "SEO & Metadata":
    "Search engines and social shares depend on your meta tags, heading structure, and alt text. Missing metadata means missed traffic.",
};

// --- Helpers ---

function scoreColor(score: number) {
  if (score >= 80) return "text-[#34D399]";
  if (score >= 60) return "text-[#FBBF24]";
  return "text-[#F87171]";
}

function scoreHexColor(score: number) {
  if (score >= 80) return "#34D399";
  if (score >= 60) return "#FBBF24";
  return "#F87171";
}

function scoreVerdict(score: number) {
  if (score >= 85)
    return "This page is doing the fundamentals right. The fixes below are refinements, not rescues.";
  if (score >= 60)
    return "Solid foundation, but there's friction costing you conversions. The top actions below are where to start.";
  return "This page is working against you in several places. The good news: the highest-impact fixes are straightforward.";
}

function typePriority(type: Finding["type"]) {
  if (type === "issue") return 0;
  if (type === "suggestion") return 1;
  return 2;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// --- Hooks ---

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || target === 0) return;
    started.current = true;
    const start = performance.now();
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return value;
}

// --- Components ---

function ScoreRing({ score }: { score: number }) {
  const displayScore = useCountUp(score);
  const color = scoreHexColor(score);
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="relative w-40 h-40 flex-shrink-0">
      <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
        <circle
          cx="80" cy="80" r="70"
          fill="none" stroke="#1C1F2E" strokeWidth="8"
        />
        <circle
          cx="80" cy="80" r="70"
          fill="none" stroke={color} strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span
          className="text-6xl text-[#F0F0F3] tabular-nums"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          {displayScore}
        </span>
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const config = {
    issue: {
      border: "border-l-[#F87171]",
      bg: "bg-[rgba(248,113,113,0.06)]",
      icon: "!",
      iconColor: "text-[#F87171]",
    },
    suggestion: {
      border: "border-l-[#00D4FF]",
      bg: "bg-[rgba(0,212,255,0.06)]",
      icon: "\u2726",
      iconColor: "text-[#00D4FF]",
    },
    strength: {
      border: "border-l-[#34D399]",
      bg: "bg-[rgba(52,211,153,0.06)]",
      icon: "\u2713",
      iconColor: "text-[#34D399]",
    },
  }[finding.type];

  return (
    <div
      className={`${config.bg} border border-[#252838] border-l-2 ${config.border} rounded-xl p-5`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`${config.iconColor} text-lg font-bold mt-0.5 w-5 shrink-0`}
        >
          {config.icon}
        </span>
        <div>
          <p className="font-semibold text-[#F0F0F3]">{finding.title}</p>
          <p className="text-sm text-[#9BA1B0] mt-1.5 leading-relaxed">
            {finding.detail}
          </p>
        </div>
      </div>
    </div>
  );
}

function ScreenshotModal({
  url,
  pageUrl,
  onClose,
}: {
  url: string;
  pageUrl: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-5xl w-full max-h-[90vh] overflow-auto rounded-xl border border-[#252838]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#1C1F2E] px-4 py-2.5 flex items-center justify-between border-b border-[#252838] sticky top-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#5C6170]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#5C6170]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#5C6170]" />
            </div>
            <span className="text-xs text-[#5C6170] font-mono ml-2 truncate">
              {getDomain(pageUrl)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#5C6170] hover:text-[#F0F0F3] transition-colors text-sm"
          >
            Close
          </button>
        </div>
        <img src={url} alt={`Screenshot of ${pageUrl}`} className="w-full" />
      </div>
    </div>
  );
}

// --- Page ---

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showScreenshot, setShowScreenshot] = useState(false);

  const fetchAnalysis = useCallback(async () => {
    try {
      const res = await fetch(`/api/analysis/${id}`);
      if (!res.ok) {
        setError("Analysis not found");
        return null;
      }
      const data: Analysis = await res.json();
      setAnalysis(data);
      return data;
    } catch {
      setError("Failed to load analysis");
      return null;
    }
  }, [id]);

  // Poll for results
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    async function poll() {
      const data = await fetchAnalysis();
      if (data && (data.status === "complete" || data.status === "failed")) {
        clearInterval(interval);
        // Default to lowest-scoring category
        if (data.structured_output) {
          const lowest = [...data.structured_output.categories].sort(
            (a, b) => a.score - b.score
          )[0];
          if (lowest) setActiveCategory(lowest.name);
        }
      }
    }
    poll();
    interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [fetchAnalysis]);

  // Loading step cycle
  useEffect(() => {
    if (
      analysis?.status === "pending" ||
      analysis?.status === "processing"
    ) {
      const timer = setInterval(() => {
        setLoadingStep((s) => (s + 1) % LOADING_STEPS.length);
      }, 3000);
      return () => clearInterval(timer);
    }
  }, [analysis?.status]);

  // --- Loading / Error / Failed states ---

  if (error) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[#9BA1B0] text-lg">{error}</p>
          <Link
            href="/"
            className="text-[#00D4FF] font-medium underline mt-4 inline-block"
          >
            Try another URL
          </Link>
        </div>
      </div>
    );
  }

  if (
    !analysis ||
    analysis.status === "pending" ||
    analysis.status === "processing"
  ) {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-8 h-8 border-2 border-[#252838] border-t-[#00D4FF] rounded-full animate-spin mx-auto" />
          <p className="text-[#F0F0F3] font-medium mt-6">
            Analyzing your page
          </p>
          <p className="text-sm text-[#5C6170] mt-2 animate-pulse">
            {LOADING_STEPS[loadingStep]}
          </p>
          {analysis?.url && (
            <p className="text-xs text-[#5C6170] mt-4 font-mono truncate">
              {analysis.url}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="min-h-screen bg-[#0F1117] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-[#F0F0F3] font-medium text-lg">
            Analysis failed
          </p>
          <p className="text-sm text-[#9BA1B0] mt-2">
            {"Couldn't analyze this page. Try running the audit again."}
          </p>
          <Link
            href="/"
            className="inline-block mt-6 bg-[#00D4FF] text-[#0F1117] font-semibold px-6 py-3 rounded-xl hover:bg-[#00B8E0] active:scale-[0.98] transition-all"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  // --- Results ---

  const s = analysis.structured_output!;
  const activeCat = s.categories.find((c) => c.name === activeCategory);
  const activeCatFindings = activeCat
    ? [...activeCat.findings].sort(
        (a, b) => typePriority(a.type) - typePriority(b.type)
      )
    : [];

  return (
    <main className="bg-[#0F1117] min-h-screen text-[#F0F0F3]">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10">
        {/* Zone 1: Hero Score Band */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 border-b border-[#252838]">
          {/* Left: Score + Summary */}
          <div className="lg:col-span-7 flex flex-col justify-center py-12 lg:py-20">
            {/* URL + timestamp */}
            <div className="flex items-center gap-3 mb-8">
              <span className="font-mono text-sm text-[#9BA1B0] bg-[#1C1F2E] px-3 py-1.5 rounded-lg border border-[#252838]">
                {getDomain(analysis.url)}
              </span>
              <span className="text-sm text-[#5C6170]">
                Audited {timeAgo(analysis.created_at)}
              </span>
            </div>

            {/* Score + verdict */}
            <div className="flex items-end gap-6 mb-6">
              <ScoreRing score={s.overallScore} />
              <div className="pb-4">
                <p className="text-sm font-medium text-[#5C6170] uppercase tracking-widest mb-1">
                  Page Score
                </p>
                <p
                  className={`text-2xl ${scoreColor(s.overallScore)}`}
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {s.overallScore >= 85
                    ? "Looking sharp"
                    : s.overallScore >= 60
                      ? "Needs work"
                      : "Needs attention"}
                </p>
              </div>
            </div>

            {/* Summary */}
            <p className="text-lg text-[#9BA1B0] leading-relaxed max-w-[540px] mb-4">
              {s.summary}
            </p>
            <p className="text-sm text-[#5C6170] max-w-[540px] mb-8">
              {scoreVerdict(s.overallScore)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="bg-[#00D4FF] text-[#0F1117] font-semibold px-6 py-3 rounded-xl
                           hover:bg-[#00B8E0] active:scale-[0.98] transition-all duration-150"
              >
                Share this audit
              </button>
              <Link
                href="/"
                className="text-[#9BA1B0] font-medium px-5 py-3 rounded-xl border border-[#252838]
                           hover:border-[#00D4FF] hover:text-[#00D4FF] active:scale-[0.98]
                           transition-all duration-150"
              >
                Audit another page
              </Link>
            </div>
          </div>

          {/* Right: Screenshot thumbnail */}
          <div className="lg:col-span-5 flex items-center justify-end py-8 lg:py-20">
            {analysis.screenshot_url ? (
              <button
                onClick={() => setShowScreenshot(true)}
                className="group relative w-full max-w-[400px] rounded-xl overflow-hidden
                           border border-[#252838] hover:border-[rgba(0,212,255,0.4)]
                           transition-all duration-300"
              >
                {/* Browser chrome */}
                <div className="bg-[#1C1F2E] px-4 py-2.5 flex items-center gap-2 border-b border-[#252838]">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#5C6170]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#5C6170]" />
                    <div className="w-2.5 h-2.5 rounded-full bg-[#5C6170]" />
                  </div>
                  <span className="text-xs text-[#5C6170] font-mono ml-2 truncate">
                    {getDomain(analysis.url)}
                  </span>
                </div>
                {/* Image */}
                <div className="relative max-h-[300px] overflow-hidden">
                  <img
                    src={analysis.screenshot_url}
                    alt="Page screenshot"
                    loading="lazy"
                    className="w-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0F1117] via-transparent to-transparent" />
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-[#5C6170] group-hover:text-[#00D4FF] transition-colors">
                  Click to expand
                </div>
              </button>
            ) : (
              <div className="w-full max-w-[400px] h-48 rounded-xl bg-[#1C1F2E] border border-[#252838] flex items-center justify-center">
                <span className="text-sm text-[#5C6170]">No screenshot available</span>
              </div>
            )}
          </div>
        </section>

        {/* Zone 2: Top 3 Actions */}
        {s.topActions.length > 0 && (
          <section className="py-10 border-b border-[#252838]">
            <div className="mb-6">
              <h2
                className="text-3xl text-[#F0F0F3] mb-1"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Fix these first
              </h2>
              <p className="text-sm text-[#5C6170]">
                Ranked by conversion impact. Start at the top.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {s.topActions.map((action, i) => (
                <div
                  key={i}
                  className="relative bg-[#1C1F2E] rounded-xl border border-[#252838] p-5
                             border-l-2 border-l-[#00D4FF]"
                >
                  <div className="absolute -top-3 -left-3 w-7 h-7 rounded-full bg-[#00D4FF] text-[#0F1117] text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                  <p className="text-sm text-[#9BA1B0] leading-relaxed">
                    {action}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Zone 3: Category Grid */}
        <section className="py-10 border-b border-[#252838]">
          <h2
            className="text-3xl text-[#F0F0F3] mb-6"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Category breakdown
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {s.categories.map((cat) => {
              const isActive = activeCategory === cat.name;
              const issueCount = cat.findings.filter(
                (f) => f.type === "issue"
              ).length;
              const strengthCount = cat.findings.filter(
                (f) => f.type === "strength"
              ).length;

              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    setActiveCategory(cat.name);
                    document
                      .getElementById("findings")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`text-left bg-[#1C1F2E] rounded-xl border p-5
                             hover:border-[rgba(0,212,255,0.4)] active:scale-[0.98]
                             transition-all duration-150 ${
                               isActive
                                 ? "border-[#00D4FF] shadow-[0_0_20px_rgba(0,212,255,0.1)]"
                                 : "border-[#252838]"
                             }`}
                >
                  <p className="text-xs font-medium text-[#5C6170] uppercase tracking-widest mb-3">
                    {cat.name}
                  </p>
                  <p
                    className={`text-4xl mb-3 ${scoreColor(cat.score)}`}
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    {cat.score}
                  </p>
                  <div className="h-1.5 bg-[#252838] rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${cat.score}%`,
                        backgroundColor: scoreHexColor(cat.score),
                      }}
                    />
                  </div>
                  <p className="text-xs text-[#5C6170]">
                    {issueCount > 0 && `${issueCount} issue${issueCount !== 1 ? "s" : ""}`}
                    {issueCount > 0 && strengthCount > 0 && ", "}
                    {strengthCount > 0 &&
                      `${strengthCount} strength${strengthCount !== 1 ? "s" : ""}`}
                    {issueCount === 0 && strengthCount === 0 &&
                      `${cat.findings.length} finding${cat.findings.length !== 1 ? "s" : ""}`}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* Zone 4: Findings Panel */}
        <section className="py-10 border-b border-[#252838]" id="findings">
          <h2
            className="text-3xl text-[#F0F0F3] mb-6"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Detailed findings
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left sidebar: category nav */}
            <div className="lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
              <nav className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {s.categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg
                               text-left whitespace-nowrap transition-all duration-150 ${
                                 activeCategory === cat.name
                                   ? "bg-[#1C1F2E] text-[#00D4FF] border border-[rgba(0,212,255,0.3)]"
                                   : "text-[#5C6170] hover:text-[#9BA1B0]"
                               }`}
                  >
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span
                      className={`text-sm font-bold ${scoreColor(cat.score)}`}
                    >
                      {cat.score}
                    </span>
                  </button>
                ))}
              </nav>
              {/* Category explainer */}
              {activeCategory && CATEGORY_EXPLAINERS[activeCategory] && (
                <div className="hidden lg:block mt-4 p-4 rounded-lg bg-[rgba(0,212,255,0.04)] border border-[#252838]">
                  <p className="text-xs text-[#5C6170] leading-relaxed">
                    {CATEGORY_EXPLAINERS[activeCategory]}
                  </p>
                </div>
              )}
            </div>

            {/* Right: findings for active category */}
            <div className="lg:col-span-9 space-y-3">
              {activeCatFindings.length > 0 ? (
                activeCatFindings.map((finding, i) => (
                  <FindingCard key={i} finding={finding} />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-[#5C6170] text-sm">
                    Select a category to view findings.
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Zone 5: Bottom CTA */}
        <section className="py-16">
          <div className="bg-[#1C1F2E] rounded-2xl border border-[#252838] p-8 md:p-12 text-center max-w-[700px] mx-auto">
            <h2
              className="text-3xl md:text-4xl text-[#F0F0F3] mb-3"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Pages drift. You won't always notice.
            </h2>
            <p className="text-[#9BA1B0] mb-8 max-w-[480px] mx-auto">
              Deploys, CMS edits, AI-generated code — your page changes more
              than you think. We'll watch it and tell you exactly what shifted.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-[460px] mx-auto mb-6">
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 bg-[#0F1117] text-[#F0F0F3] placeholder-[#5C6170]
                           px-4 py-3 rounded-xl border border-[#252838]
                           focus:border-[#00D4FF] focus:outline-none transition-colors"
              />
              <button className="bg-[#00D4FF] text-[#0F1117] font-semibold px-6 py-3 rounded-xl hover:bg-[#00B8E0] active:scale-[0.98] transition-all duration-150 whitespace-nowrap">
                Watch this page
              </button>
            </div>
            <p className="text-xs text-[#5C6170] mb-6">
              Free for one page. No spam. Only updates about this page.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-[#5C6170]">
              <button
                onClick={() =>
                  navigator.clipboard.writeText(window.location.href)
                }
                className="hover:text-[#00D4FF] transition-colors"
              >
                Copy link
              </button>
              <span>|</span>
              <Link
                href="/"
                className="hover:text-[#00D4FF] transition-colors"
              >
                Audit another page
              </Link>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-xs text-[#5C6170] text-center mt-8 max-w-md mx-auto">
            This audit is a snapshot from{" "}
            {new Date(analysis.created_at).toLocaleDateString()}. Pages change.
            Run it again anytime, or set up monitoring to catch drift
            automatically.
          </p>
        </section>
      </div>

      {/* Screenshot modal */}
      {showScreenshot && analysis.screenshot_url && (
        <ScreenshotModal
          url={analysis.screenshot_url}
          pageUrl={analysis.url}
          onClose={() => setShowScreenshot(false)}
        />
      )}
    </main>
  );
}
