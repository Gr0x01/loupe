"use client";

import { useEffect, useState, useCallback, useRef, useId } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

// --- Types ---

interface Finding {
  type: "strength" | "issue" | "suggestion";
  title: string;
  detail: string;
  impact?: "high" | "medium" | "low";
  fix?: string;
}

interface Category {
  name: string;
  score: number;
  findings: Finding[];
}

interface TopAction {
  action: string;
  impact: string;
}

interface HeadlineRewrite {
  current: string;
  suggested: string;
  reasoning: string;
}

interface StructuredOutput {
  overallScore: number;
  categories: Category[];
  summary: string;
  topActions: (TopAction | string)[];
  whatsWorking?: string[];
  whatsNot?: string[];
  headlineRewrite?: HeadlineRewrite | null;
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

const ACTION_TAGS = ["HIGH IMPACT", "QUICK WIN", "LEAKING"] as const;

// --- Helpers ---

function scoreColor(score: number) {
  if (score >= 80) return "text-[#1A8C5B]";
  if (score >= 60) return "text-[#A06B00]";
  return "text-[#C23B3B]";
}

function scoreHexColor(score: number) {
  if (score >= 80) return "#1A8C5B";
  if (score >= 60) return "#A06B00";
  return "#C23B3B";
}

function scoreGlowClass(score: number) {
  if (score >= 80) return "score-ring-glow-green";
  if (score >= 60) return "score-ring-glow-amber";
  return "score-ring-glow-red";
}

function scoreVerdict(score: number) {
  if (score >= 85)
    return "This page is doing the fundamentals right. The fixes below are refinements, not rescues.";
  if (score >= 60)
    return "Solid foundation, but there's friction costing you conversions. The top actions below are where to start.";
  return "This page is working against you in several places. The good news: the highest-impact fixes are straightforward.";
}

function verdictLabel(score: number) {
  if (score >= 85) return "Looking sharp";
  if (score >= 60) return "Room to improve";
  return "Leaving conversions on the table";
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getDomain(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function getActionText(action: TopAction | string): string {
  return typeof action === "string" ? action : action.action;
}

function getActionImpact(action: TopAction | string): string | null {
  return typeof action === "string" ? null : action.impact;
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
  const glowClass = scoreGlowClass(score);
  const gradientId = useId();
  const circumference = 2 * Math.PI * 62;
  const offset = circumference - (displayScore / 100) * circumference;

  return (
    <div className="relative w-44 h-44 flex-shrink-0">
      <svg className={`w-44 h-44 -rotate-90 ${glowClass}`} viewBox="0 0 140 140">
        <circle
          cx="70" cy="70" r="62"
          fill="none" stroke="rgba(0,0,0,0.04)" strokeWidth="7"
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle
          cx="70" cy="70" r="62"
          fill="none" stroke={`url(#${gradientId})`} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-6xl text-[#111118] tabular-nums font-bold"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          {displayScore}
        </span>
      </div>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  const cardClass = {
    issue: "finding-issue",
    suggestion: "finding-suggestion",
    strength: "finding-strength",
  }[finding.type];

  const iconClass = {
    issue: "finding-icon finding-icon-issue",
    suggestion: "finding-icon finding-icon-suggestion",
    strength: "finding-icon finding-icon-strength",
  }[finding.type];

  const icon = {
    issue: "!",
    suggestion: "\u2726",
    strength: "\u2713",
  }[finding.type];

  const impactBadgeClass = finding.impact
    ? `impact-badge impact-badge-${finding.impact}`
    : null;

  return (
    <div className={`${cardClass} p-5 transition-all duration-150`}>
      <div className="flex items-start gap-3">
        <span className={iconClass}>{icon}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[1.0625rem] font-semibold text-[#111118] leading-snug">
              {finding.title}
            </p>
            {impactBadgeClass && (
              <span className={impactBadgeClass}>
                {finding.impact} impact
              </span>
            )}
          </div>
          <p className="text-[0.9375rem] text-[#55556D] mt-1.5 leading-relaxed">
            {finding.detail}
          </p>
          {finding.fix && (
            <p className="text-[0.875rem] text-[#5B2E91] mt-2 font-medium leading-relaxed">
              Fix: {finding.fix}
            </p>
          )}
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
      className="fixed inset-0 z-50 modal-overlay flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-5xl w-full max-h-[90vh] overflow-auto glass-card-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="browser-chrome flex items-center justify-between sticky top-0 rounded-t-[20px]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="browser-dot" />
              <div className="browser-dot" />
              <div className="browser-dot" />
            </div>
            <span className="text-xs text-[#8E8EA0] font-mono ml-2 truncate">
              {getDomain(pageUrl)}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-[#8E8EA0] hover:text-[#111118] transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
        <img src={url} alt={`Screenshot of ${pageUrl}`} className="w-full rounded-b-[20px]" />
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[#55556D] text-lg">{error}</p>
          <Link
            href="/"
            className="text-[#5B2E91] font-medium underline mt-4 inline-block"
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
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="glass-spinner mx-auto" />
          <p className="text-[#111118] font-semibold text-lg mt-6">
            Analyzing your page
          </p>
          <p className="text-base text-[#8E8EA0] mt-2 animate-pulse">
            {LOADING_STEPS[loadingStep]}
          </p>
          {analysis?.url && (
            <p className="text-sm text-[#8E8EA0] mt-4 font-mono truncate">
              {analysis.url}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-[#111118] font-semibold text-xl">
            Analysis failed
          </p>
          <p className="text-base text-[#55556D] mt-2">
            {"Couldn't analyze this page. Try running the audit again."}
          </p>
          <Link
            href="/"
            className="inline-block mt-6 btn-primary"
          >
            Try again
          </Link>
        </div>
      </div>
    );
  }

  // --- Results ---

  if (!analysis.structured_output) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-[#111118] font-semibold text-xl">
            Something went wrong
          </p>
          <p className="text-base text-[#55556D] mt-2">
            The analysis completed but no results were returned. Try again.
          </p>
          <Link href="/" className="inline-block mt-6 btn-primary">
            Try again
          </Link>
        </div>
      </div>
    );
  }

  const s = analysis.structured_output;
  const activeCat = s.categories.find((c) => c.name === activeCategory);
  const activeCatFindings = activeCat
    ? [...activeCat.findings].sort(
        (a, b) => typePriority(a.type) - typePriority(b.type)
      )
    : [];

  return (
    <main className="min-h-screen text-[#111118]">
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10">
        {/* Zone 1: Hero Score Band */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Score + Summary */}
          <div className="lg:col-span-7 flex flex-col justify-center py-8 lg:py-14">
            {/* URL + timestamp */}
            <div className="flex items-center gap-3 mb-6">
              <span className="url-badge">
                {getDomain(analysis.url)}
              </span>
              <span className="text-sm text-[#8E8EA0]">
                Audited {timeAgo(analysis.created_at)}
              </span>
            </div>

            {/* Score + verdict */}
            <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 sm:gap-8 mb-6">
              <ScoreRing score={s.overallScore} />
              <div className="pb-0 sm:pb-3 text-center sm:text-left">
                <p className="text-sm font-semibold text-[#5B2E91] uppercase tracking-widest mb-1.5">
                  Page Score
                </p>
                <p
                  className={`text-4xl ${scoreColor(s.overallScore)}`}
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {verdictLabel(s.overallScore)}
                </p>
                <p className="text-xs text-[#8E8EA0] mt-2">
                  Captured today, {formatDate(analysis.created_at)}
                </p>
              </div>
            </div>

            {/* Summary */}
            <p className="text-xl text-[#55556D] leading-relaxed max-w-[540px] mb-3">
              {s.summary}
            </p>
            <p className="text-base text-[#8E8EA0] max-w-[540px] mb-6">
              {scoreVerdict(s.overallScore)}
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                }}
                className="btn-primary"
              >
                Share this audit
              </button>
              <Link href="/" className="btn-secondary">
                Audit another page
              </Link>
            </div>
          </div>

          {/* Right: Screenshot thumbnail */}
          <div className="lg:col-span-5 flex items-center justify-end py-8 lg:py-14">
            {analysis.screenshot_url ? (
              <button
                onClick={() => setShowScreenshot(true)}
                className="group relative w-full max-w-[400px] glass-card-elevated overflow-hidden
                           hover:shadow-[0_16px_64px_rgba(0,0,0,0.1)] transition-all duration-300 cursor-pointer"
              >
                <div className="browser-chrome flex items-center gap-2 rounded-t-[20px]">
                  <div className="flex gap-1.5">
                    <div className="browser-dot" />
                    <div className="browser-dot" />
                    <div className="browser-dot" />
                  </div>
                  <span className="text-xs text-[#8E8EA0] font-mono ml-2 truncate">
                    {getDomain(analysis.url)}
                  </span>
                </div>
                <div className="relative max-h-[300px] overflow-hidden">
                  <img
                    src={analysis.screenshot_url}
                    alt="Page screenshot"
                    loading="lazy"
                    className="w-full object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 via-transparent to-transparent" />
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-xs text-[#8E8EA0] group-hover:text-[#5B2E91] transition-colors font-medium">
                  Click to expand
                </div>
              </button>
            ) : (
              <div className="w-full max-w-[400px] h-48 glass-card flex items-center justify-center">
                <span className="text-base text-[#8E8EA0]">No screenshot available</span>
              </div>
            )}
          </div>
        </section>

        <hr className="section-divider" />

        {/* At a Glance */}
        {((s.whatsWorking?.length ?? 0) > 0 || (s.whatsNot?.length ?? 0) > 0) && (
          <>
            <section className="py-8">
              <div className="glass-card-elevated overflow-hidden">
                <div className="at-a-glance">
                  {/* What's working */}
                  <div className="at-a-glance-col">
                    <p className="text-sm font-semibold text-[#1A8C5B] uppercase tracking-wide mb-4">
                      What&apos;s working
                    </p>
                    <ul className="space-y-3">
                      {(s.whatsWorking || []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-[#1A8C5B] font-bold text-sm mt-0.5 flex-shrink-0">{"\u2713"}</span>
                          <span className="text-[0.9375rem] text-[#55556D] leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {/* What's not */}
                  <div className="at-a-glance-col">
                    <p className="text-sm font-semibold text-[#C23B3B] uppercase tracking-wide mb-4">
                      What&apos;s not
                    </p>
                    <ul className="space-y-3">
                      {(s.whatsNot || []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-[#C23B3B] font-bold text-sm mt-0.5 flex-shrink-0">{"!"}</span>
                          <span className="text-[0.9375rem] text-[#55556D] leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
              <p className="bridge-text">
                This is your page today. But pages don&apos;t stay still.
              </p>
            </section>

            <hr className="section-divider" />
          </>
        )}

        {/* Zone 2: Top Actions */}
        {s.topActions.length > 0 && (
          <>
            <section className="py-8">
              <div className="section-header">
                <div>
                  <h2
                    className="text-4xl text-[#111118]"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    Where you&apos;re losing visitors
                  </h2>
                  <p className="text-sm text-[#8E8EA0] mt-1">
                    Ranked by conversion impact. Start at the top.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {s.topActions.slice(0, 3).map((action, i) => {
                  const actionText = getActionText(action);
                  const impactText = getActionImpact(action);
                  const tag = ACTION_TAGS[i] || "HIGH IMPACT";
                  const tagClass = i === 0
                    ? "action-tag action-tag-high-impact"
                    : i === 1
                      ? "action-tag action-tag-quick-win"
                      : "action-tag action-tag-leaking";

                  return (
                    <div
                      key={i}
                      className="glass-card p-6 transition-all duration-150"
                    >
                      <div className="flex items-start gap-4">
                        <span className="number-badge">{i + 1}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={tagClass}>{tag}</span>
                          </div>
                          <p className="text-[0.9375rem] text-[#55556D] leading-relaxed">
                            {actionText}
                          </p>
                          {impactText && (
                            <span className="impact-estimate mt-3 inline-block">
                              ~{impactText}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <hr className="section-divider" />
          </>
        )}

        {/* Headline Rewrite Spotlight */}
        {s.headlineRewrite && (
          <>
            <section className="py-8">
              <div className="section-header">
                <div>
                  <h2
                    className="text-4xl text-[#111118]"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    Headline rewrite
                  </h2>
                  <p className="text-sm text-[#8E8EA0] mt-1">
                    One change that could shift perception immediately.
                  </p>
                </div>
              </div>
              <div className="glass-card-elevated p-8 max-w-[700px]">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold text-[#8E8EA0] uppercase tracking-wide mb-2">Current</p>
                    <p className="headline-rewrite-current text-lg leading-relaxed">
                      {s.headlineRewrite.current}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-[#8E8EA0]">
                    <span className="text-lg">{"\u2192"}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#5B2E91] uppercase tracking-wide mb-2">Suggested</p>
                    <div className="headline-rewrite-suggested">
                      <p
                        className="text-lg font-semibold leading-relaxed"
                        style={{ fontFamily: "var(--font-instrument-serif)" }}
                      >
                        {s.headlineRewrite.suggested}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-[#55556D] leading-relaxed mt-2">
                    {s.headlineRewrite.reasoning}
                  </p>
                </div>
              </div>
            </section>

            <hr className="section-divider" />
          </>
        )}

        {/* Zone 3: Category Grid */}
        <section className="py-8">
          <div className="section-header">
            <h2
              className="text-4xl text-[#111118]"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              The full picture
            </h2>
          </div>
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
                  className={`text-left p-5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                    isActive ? "glass-card-active" : "glass-card"
                  }`}
                >
                  <p className="text-sm font-semibold text-[#55556D] uppercase tracking-wide mb-2">
                    {cat.name}
                  </p>
                  <p
                    className={`text-4xl mb-3 ${scoreColor(cat.score)}`}
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    {cat.score}
                  </p>
                  <div className="progress-track mb-3">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${cat.score}%`,
                        backgroundColor: scoreHexColor(cat.score),
                        "--fill-glow": cat.score >= 80
                          ? "rgba(26,140,91,0.2)"
                          : cat.score >= 60
                            ? "rgba(160,107,0,0.2)"
                            : "rgba(194,59,59,0.2)",
                      } as React.CSSProperties}
                    />
                  </div>
                  <p className="text-sm text-[#8E8EA0]">
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

        <hr className="section-divider" />

        {/* Zone 4: Findings Panel */}
        <section className="py-8" id="findings">
          <div className="section-header">
            <h2
              className="text-4xl text-[#111118]"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              What we found
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left sidebar: category nav */}
            <div className="lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {s.categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveCategory(cat.name)}
                    className={`sidebar-nav-item whitespace-nowrap text-left text-sm ${
                      activeCategory === cat.name ? "sidebar-nav-item-active" : ""
                    }`}
                  >
                    <span>{cat.name}</span>
                    <span className={`font-bold ${scoreColor(cat.score)}`}>
                      {cat.score}
                    </span>
                  </button>
                ))}
              </nav>
              {activeCategory && CATEGORY_EXPLAINERS[activeCategory] && (
                <div className="hidden lg:block mt-4 explainer-card">
                  <p className="text-sm text-[#55556D] leading-relaxed">
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
                  <p className="text-[#8E8EA0] text-base">
                    Select a category to view findings.
                  </p>
                </div>
              )}
            </div>
          </div>

          <p className="bridge-text mt-6">
            You just fixed these. How will you know if they break next week?
          </p>
        </section>

        <hr className="section-divider" />

        {/* Zone 5: Bottom CTA */}
        <section className="py-10">
          <div className="glass-card-elevated p-8 md:p-12 text-center max-w-[700px] mx-auto">
            <h2
              className="text-4xl text-[#111118] mb-3"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Pages drift. You won&apos;t always notice.
            </h2>
            <p className="text-lg text-[#55556D] mb-8 max-w-[480px] mx-auto">
              Deploys, CMS updates, AI-generated code. Your page changes more
              than you think. Enter your email and we&apos;ll tell you exactly what shifted, the moment it happens.
            </p>
            <div className="flex flex-col sm:flex-row items-stretch gap-3 max-w-[460px] mx-auto mb-4">
              <input
                type="email"
                placeholder="you@company.com"
                className="flex-1 input-glass"
              />
              <button className="btn-primary whitespace-nowrap">
                Get notified when it changes
              </button>
            </div>
            <p className="text-xs text-[#8E8EA0] mb-1">
              Weekly checks. Plain-language reports. Cancel with one click.
            </p>
            <p className="text-sm text-[#8E8EA0] mb-6">
              Free for one page. No spam. Only updates about this page.
            </p>
            <div className="flex items-center justify-center gap-4 text-sm text-[#8E8EA0]">
              <button
                onClick={() =>
                  navigator.clipboard.writeText(window.location.href)
                }
                className="hover:text-[#5B2E91] transition-colors"
              >
                Copy link
              </button>
              <span className="text-[rgba(0,0,0,0.1)]">|</span>
              <Link
                href="/"
                className="hover:text-[#5B2E91] transition-colors"
              >
                Audit another page
              </Link>
            </div>
          </div>

          {/* Footer note */}
          <p className="text-sm text-[#8E8EA0] text-center mt-8 max-w-md mx-auto">
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
