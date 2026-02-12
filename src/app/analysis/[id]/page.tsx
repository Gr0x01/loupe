"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageLoader } from "@/components/PageLoader";
import { track } from "@/lib/analytics/track";
import { useAnalysis } from "@/lib/hooks/use-data";
import type {
  PageContext,
  DeployContextAPI,
  MetricsSnapshot,
  ClaimStatus,
  AnalysisResult,
  ChangesSummary,
  Finding,
  ElementType,
} from "@/lib/types/analysis";
import { ChronicleLayout, ScanPicker } from "@/components/chronicle";
import { ClaimModal, type ClaimModalType } from "@/components/ClaimModal";

// Type guard for Chronicle format (N+1 scans with new ChangesSummary)
function isChronicleFormat(summary: unknown): summary is ChangesSummary {
  return (
    typeof summary === "object" &&
    summary !== null &&
    "verdict" in summary &&
    "changes" in summary &&
    Array.isArray((summary as ChangesSummary).changes) &&
    "progress" in summary &&
    typeof (summary as ChangesSummary).progress?.validated === "number"
  );
}

// --- Types ---

interface Analysis {
  id: string;
  url: string;
  status: "pending" | "processing" | "complete" | "failed";
  screenshot_url: string | null;
  mobile_screenshot_url: string | null;
  structured_output: AnalysisResult["structured"] | null;
  error_message: string | null;
  created_at: string;
  parent_analysis_id: string | null;
  changes_summary: ChangesSummary | null;
  parent_structured_output: AnalysisResult["structured"] | null;
  page_context: PageContext | null;
  metrics_snapshot: MetricsSnapshot | null;
  deploy_context: DeployContextAPI | null;
  trigger_type: "manual" | "daily" | "weekly" | "deploy" | null;
  claim_status?: ClaimStatus;
}

// --- Constants ---

// Analysis pipeline stages
const ANALYSIS_STAGES = [
  { id: "screenshot", label: "Screenshotting your page" },
  { id: "reading", label: "Reading your headline and CTA" },
  { id: "trust", label: "Checking trust signals" },
  { id: "hierarchy", label: "Reviewing visual hierarchy" },
  { id: "writing", label: "Writing your audit" },
];

// Examples of what Loupe catches - the stuff they CAN'T track themselves
const DRIFT_EXAMPLES = [
  "Cursor updated your pricing page — your 'Cancel anytime' guarantee is gone",
  "Your checkout button moved below the fold after yesterday's deploy",
  "Your hero still says 'Coming Soon' — it's been 47 days",
  "Conversions dropped 23% the same week your social proof disappeared",
  "Your CTA says 'Submit' instead of 'Get My Plan' — changed 3 deploys ago",
];

// Element type icons for new finding cards
const ELEMENT_ICONS: Record<ElementType, React.ReactNode> = {
  headline: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M2 8h8M2 12h10" />
    </svg>
  ),
  cta: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="12" height="8" rx="2" />
      <path d="M5 8h6" />
    </svg>
  ),
  copy: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M2 7h10M2 10h8M2 13h6" />
    </svg>
  ),
  layout: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <path d="M2 6h12M6 6v8" />
    </svg>
  ),
  "social-proof": (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2l1.5 4.5H14l-3.5 3 1.5 4.5L8 11l-4 3 1.5-4.5L2 6.5h4.5z" />
    </svg>
  ),
  form: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="12" height="3" rx="0.5" />
      <rect x="2" y="8" width="12" height="3" rx="0.5" />
      <rect x="5" y="13" width="6" height="2" rx="0.5" />
    </svg>
  ),
  image: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <circle cx="5.5" cy="5.5" r="1.5" />
      <path d="M14 10l-3-3-5 5-2-2-2 2" />
    </svg>
  ),
  navigation: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4h12M2 8h12M2 12h12" />
    </svg>
  ),
  pricing: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v12M5 4.5c0-1.5 1.5-2 3-2s3 .5 3 2-1.5 2-3 2.5-3 1-3 2.5 1.5 2 3 2 3-.5 3-2" />
    </svg>
  ),
  other: (
    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
    </svg>
  ),
};

// Impact badge class helper for new findings
function getImpactBadgeClass(impact: "high" | "medium" | "low"): string {
  return `new-finding-impact new-finding-impact-${impact}`;
}

// --- Helpers ---

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

// --- Hero Components ---

function VerdictDisplay({
  verdict,
  verdictContext,
}: {
  verdict: string;
  verdictContext: string;
}) {
  return (
    <div className="text-left">
      <h1
        className="hero-reveal-verdict-new text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight text-text-primary max-w-2xl lg:max-w-none tracking-tight"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {verdict}
      </h1>
      {verdictContext && (
        <p className="hero-reveal-context text-base lg:text-lg text-text-secondary mt-3 max-w-xl lg:max-w-none leading-relaxed">
          {verdictContext}
        </p>
      )}
    </div>
  );
}

// ImpactBar, AnimatedCount, DomainBadge removed — consolidated into hero footer

// Hero Screenshot - floats in corner as visual proof
function HeroScreenshot({
  url,
  mobileUrl,
  pageUrl,
  domain,
  createdAt,
  onDesktopClick,
  onMobileClick,
}: {
  url: string;
  mobileUrl?: string | null;
  pageUrl: string;
  domain: string;
  createdAt: string;
  onDesktopClick: () => void;
  onMobileClick?: () => void;
}) {
  const [desktopError, setDesktopError] = useState(false);
  const [mobileError, setMobileError] = useState(false);

  if (desktopError) return null;

  return (
    <div className={mobileUrl && !mobileError ? "w-[300px]" : "w-[260px]"}>
      <div className="flex gap-3 items-end">
        {/* Desktop screenshot */}
        <button
          className="hero-screenshot-wrapper cursor-pointer group flex-1 appearance-none bg-transparent border-none p-0 text-left"
          onClick={onDesktopClick}
        >
          <div className="hero-screenshot">
            {/* Browser chrome */}
            <div className="browser-chrome flex items-center gap-1.5 rounded-t-lg py-2 px-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
                <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
                <div className="w-2 h-2 rounded-full bg-[rgba(0,0,0,0.08)]" />
              </div>
              <span className="text-[10px] text-text-muted font-mono ml-1.5 truncate">
                {getDomain(pageUrl)}
              </span>
            </div>
            {/* Screenshot */}
            <div className="relative overflow-hidden rounded-b-lg">
              <img
                src={url}
                alt={`Desktop screenshot of ${pageUrl}`}
                className="w-full h-auto max-h-[180px] object-cover object-top"
                onError={() => setDesktopError(true)}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-accent bg-white/90 px-2 py-1 rounded shadow-sm">
                  View full
                </span>
              </div>
            </div>
          </div>
        </button>

        {/* Mobile screenshot */}
        {mobileUrl && !mobileError && (
          <button
            className="w-[90px] cursor-pointer group flex-shrink-0 appearance-none bg-transparent border-none p-0"
            onClick={onMobileClick}
          >
            {/* Phone frame */}
            <div className="border-[1.5px] border-[var(--line)] rounded-[10px] overflow-hidden bg-white">
              {/* Notch indicator */}
              <div className="flex justify-center py-1">
                <div className="w-8 h-1 rounded-full bg-[rgba(0,0,0,0.08)]" />
              </div>
              {/* Screenshot */}
              <div className="relative overflow-hidden">
                <img
                  src={mobileUrl}
                  alt={`Mobile screenshot of ${pageUrl}`}
                  className="w-full h-auto max-h-[150px] object-cover object-top"
                  onError={() => setMobileError(true)}
                />
                <div className="absolute inset-0 bg-accent/0 group-hover:bg-accent/5 transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-medium text-accent bg-white/90 px-1.5 py-0.5 rounded shadow-sm">
                    View
                  </span>
                </div>
              </div>
              {/* Bottom bar */}
              <div className="flex justify-center py-1">
                <div className="w-6 h-0.5 rounded-full bg-[rgba(0,0,0,0.08)]" />
              </div>
            </div>
          </button>
        )}
      </div>
      {/* Caption */}
      <p className="text-[11px] text-text-muted text-center mt-2">
        {domain} · {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      </p>
    </div>
  );
}

interface NewHeroSectionProps {
  structured: AnalysisResult["structured"];
  domain: string;
  createdAt: string;
  screenshotUrl: string | null;
  mobileScreenshotUrl?: string | null;
  onScreenshotClick: (view: "desktop" | "mobile") => void;
  claimStatus?: ClaimStatus;
  onShareLink: () => void;
  linkCopied: boolean;
  claimEmailSent: boolean;
  claimEmail: string;
  setClaimEmail: (email: string) => void;
  claimLoading: boolean;
  onClaimEmail: (e: React.FormEvent) => void;
  claimError: string;
  claimedPageId?: string | null;
  pageUrl: string;
}

function NewHeroSection({
  structured,
  domain,
  createdAt,
  screenshotUrl,
  mobileScreenshotUrl,
  onScreenshotClick,
  claimStatus,
  onShareLink,
  linkCopied,
  claimEmailSent,
  claimEmail,
  setClaimEmail,
  claimLoading,
  onClaimEmail,
  claimError,
  claimedPageId,
  pageUrl,
}: NewHeroSectionProps) {
  return (
    <section className="py-8 lg:py-12">
      <div className="glass-card-elevated mx-auto overflow-hidden">
        {/* Main content */}
        <div className="px-6 sm:px-8 py-8 lg:py-10 relative">
          {/* Screenshot floats in top-right on desktop */}
          {screenshotUrl && (
            <div className="hidden lg:block float-right ml-8 mb-4">
              <HeroScreenshot
                url={screenshotUrl}
                mobileUrl={mobileScreenshotUrl}
                pageUrl={pageUrl}
                domain={domain}
                createdAt={createdAt}
                onDesktopClick={() => onScreenshotClick("desktop")}
                onMobileClick={() => onScreenshotClick("mobile")}
              />
            </div>
          )}

          <div className="space-y-5 flex flex-col items-start">
            {/* Verdict — the star */}
            <VerdictDisplay
              verdict={structured.verdict}
              verdictContext={structured.verdictContext}
            />

            {/* Metrics summary line — consolidated */}
            <p className="hero-reveal-impact text-base text-text-primary">
              <span className="text-accent font-semibold">+{structured.projectedImpactRange}</span>
              {" "}potential
              <span className="text-text-muted mx-2">·</span>
              <span className="font-bold">{structured.findingsCount}</span>
              {" "}opportunit{structured.findingsCount !== 1 ? "ies" : "y"} below
            </p>

            {/* Domain + date — mobile only (desktop shows under screenshot) */}
            <p className="lg:hidden text-xs text-text-muted">
              {domain} · {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Card footer — email capture */}
        <div className="hero-reveal-actions border-t border-border-outer px-6 sm:px-8 py-5 bg-[rgba(0,0,0,0.015)]">
          {claimStatus?.claimed_by_current_user ? (
            /* Current user already watching */
            <div className="flex items-center justify-between">
              <Link
                href={`/pages/${claimedPageId}`}
                className="text-sm text-accent hover:underline font-medium"
              >
                You&apos;re tracking this → View history
              </Link>
              <button
                onClick={onShareLink}
                className="text-xs px-3 py-1.5 rounded-lg border border-border-subtle text-text-secondary hover:border-accent hover:text-accent transition-colors"
              >
                {linkCopied ? "Copied!" : "Share"}
              </button>
            </div>
          ) : claimStatus?.is_claimed ? (
            /* Domain claimed by someone else */
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-muted">Already being monitored by someone else</span>
              <button
                onClick={onShareLink}
                className="text-xs px-3 py-1.5 rounded-lg border border-border-subtle text-text-secondary hover:border-accent hover:text-accent transition-colors"
              >
                {linkCopied ? "Copied!" : "Share"}
              </button>
            </div>
          ) : claimEmailSent ? (
            /* Success state */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-score-high" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
                <span className="text-sm text-text-primary font-medium">Check your inbox — you&apos;re in</span>
              </div>
              <button
                onClick={onShareLink}
                className="text-xs px-3 py-1.5 rounded-lg border border-border-subtle text-text-secondary hover:border-accent hover:text-accent transition-colors"
              >
                {linkCopied ? "Copied!" : "Share"}
              </button>
            </div>
          ) : (
            /* Default state — form first */
            <div className="space-y-3 lg:space-y-0 lg:flex lg:items-center lg:justify-between lg:gap-4">
              {/* Form — stacks on mobile, inline on desktop */}
              <form onSubmit={onClaimEmail} className="flex flex-col sm:flex-row items-stretch gap-2">
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                  className="input-glass text-sm py-2.5 flex-1 sm:flex-none sm:w-48"
                  aria-label="Email address"
                  required
                />
                <button
                  type="submit"
                  disabled={claimLoading}
                  className="btn-primary text-sm py-2.5 px-5 whitespace-nowrap"
                >
                  {claimLoading ? "..." : "Track this page"}
                </button>
              </form>
              {claimError && <p className="text-xs text-score-low lg:hidden">{claimError}</p>}

              {/* Trust line + share */}
              <div className="flex items-center justify-between lg:justify-end gap-4 text-xs">
                <span className="text-text-muted">Free — we&apos;ll tell you when something&nbsp;changes</span>
                <button
                  onClick={onShareLink}
                  className="flex-shrink-0 px-3 py-1.5 rounded-lg border border-border-subtle text-text-secondary hover:border-accent hover:text-accent transition-colors"
                >
                  {linkCopied ? "Copied!" : "Share"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Collapsed Finding Card - compact for 2-column grid
function CollapsedFindingCard({
  finding,
  onToggle,
}: {
  finding: Finding;
  onToggle: () => void;
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  // Truncate currentValue for preview
  const problemPreview = finding.currentValue.length > 45
    ? finding.currentValue.slice(0, 45).trim() + "…"
    : finding.currentValue;

  return (
    <div
      className="finding-card-collapsed group"
      onClick={onToggle}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-expanded={false}
      aria-label={`${finding.title}. ${finding.impact} impact. Click to expand.`}
    >
      {/* Top row: Impact badge + expand hint */}
      <div className="flex items-center justify-between mb-2">
        <span className={getImpactBadgeClass(finding.impact)}>
          {finding.impact.toUpperCase()}
        </span>
        <span className="text-xs text-text-muted opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          View fix
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M6 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-lg font-bold text-text-primary leading-snug line-clamp-2 group-hover:text-accent transition-colors"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {finding.title}
      </h3>

      {/* Problem preview - what's wrong on their page */}
      <p className="finding-problem-preview">
        &ldquo;{problemPreview}&rdquo;
      </p>

      {/* Prediction with friendly text */}
      <div className="mt-auto pt-2 flex items-center gap-1.5 text-score-high">
        <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 12 6 8 9 11 14 4" />
          <polyline points="10 4 14 4 14 8" />
        </svg>
        <span className="font-semibold">+{finding.prediction.range}</span>
        <span className="text-text-muted font-normal text-sm truncate">{finding.prediction.friendlyText}</span>
      </div>
    </div>
  );
}

// Feedback types for finding cards - accuracy-based for LLM calibration
type FindingFeedbackType = 'accurate' | 'inaccurate' | null;

// Expanded Finding Card - full-width with 2-column interior
function ExpandedFindingCard({
  finding,
  onToggle,
  feedback,
  onFeedback,
  analysisId,
  domain,
}: {
  domain: string;
  finding: Finding;
  onToggle: () => void;
  feedback: FindingFeedbackType;
  onFeedback: (type: FindingFeedbackType, feedbackText?: string) => void;
  analysisId: string;
}) {
  const [suggestionCopied, setSuggestionCopied] = useState(false);
  const [whyOpen, setWhyOpen] = useState(false);
  const [inaccurateText, setInaccurateText] = useState("");
  const [showInaccurateInput, setShowInaccurateInput] = useState(false);
  const [inaccurateClosing, setInaccurateClosing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inaccurateInputRef = useRef<HTMLDivElement>(null);

  const closeInaccurateInput = useCallback(() => {
    setInaccurateClosing(true);
    setTimeout(() => {
      setShowInaccurateInput(false);
      setInaccurateClosing(false);
      setInaccurateText("");
    }, 150);
  }, []);

  // Close inaccurate input when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (inaccurateInputRef.current && !inaccurateInputRef.current.contains(e.target as Node)) {
        closeInaccurateInput();
      }
    }
    if (showInaccurateInput && !inaccurateClosing) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showInaccurateInput, inaccurateClosing, closeInaccurateInput]);

  const handleAccurate = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          findingId: finding.id,
          feedbackType: "accurate",
        }),
      });
      if (res.ok) {
        track("finding_feedback_submitted", { feedback_type: "accurate", domain });
        onFeedback("accurate");
      }
    } catch (err) {
      console.error("Feedback error:", err);
    }
    setSubmitting(false);
  };

  const handleInaccurateClick = () => {
    setShowInaccurateInput(true);
  };

  const handleInaccurateSubmit = async () => {
    const trimmed = inaccurateText.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          findingId: finding.id,
          feedbackType: "inaccurate",
          feedbackText: trimmed,
        }),
      });
      if (res.ok) {
        track("finding_feedback_submitted", { feedback_type: "inaccurate", domain });
        onFeedback("inaccurate", trimmed);
        setShowInaccurateInput(false);
      }
    } catch (err) {
      console.error("Feedback error:", err);
    }
    setSubmitting(false);
  };

  const handleCopySuggestion = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(finding.suggestion);
    setSuggestionCopied(true);
    track("suggestion_copied", { element_type: finding.elementType, domain });
    setTimeout(() => setSuggestionCopied(false), 2000);
  };

  const impactLabel = {
    high: "HIGH IMPACT",
    medium: "MEDIUM IMPACT",
    low: "LOW IMPACT",
  }[finding.impact];

  // Determine if card should be dimmed (inaccurate feedback)
  const isDimmed = feedback === 'inaccurate';

  return (
    <div className={`new-finding-card-expanded ${isDimmed ? 'finding-card-dimmed' : ''}`}>
      {/* Header row */}
      <div className="flex items-center justify-between mb-5">
        <span className={getImpactBadgeClass(finding.impact)}>
          {impactLabel}
        </span>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-[rgba(0,0,0,0.04)] transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l8 8M14 6l-8 8" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <h3
        className="text-2xl font-bold text-text-primary mb-6"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {finding.title}
      </h3>

      {/* Two-column content: Current | Suggestion — matching structure */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
        {/* Left: Current */}
        <div className="finding-content-box finding-content-current">
          <span className="finding-content-label">Current</span>
          <p className="finding-content-text">
            &ldquo;{finding.currentValue}&rdquo;
          </p>
        </div>

        {/* Right: Suggestion */}
        <div className="finding-content-box finding-content-suggestion">
          <div className="flex items-center justify-between">
            <span className="finding-content-label finding-content-label-accent">Suggestion</span>
            <button
              onClick={handleCopySuggestion}
              className="new-finding-copy-btn"
              title={suggestionCopied ? "Copied!" : "Copy"}
              aria-label={suggestionCopied ? "Copied to clipboard" : "Copy suggestion"}
            >
              {suggestionCopied ? (
                <svg className="w-4 h-4 text-score-high" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                  <path d="M10.5 5.5V3.5a1.5 1.5 0 00-1.5-1.5H3.5A1.5 1.5 0 002 3.5V9a1.5 1.5 0 001.5 1.5h2" />
                </svg>
              )}
            </button>
          </div>
          <p className="finding-content-text finding-content-text-bold">
            &ldquo;{finding.suggestion}&rdquo;
          </p>
        </div>
      </div>

      {/* Prediction line - full width */}
      <div className="prediction-badge mb-5">
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 12 6 8 9 11 14 4" />
          <polyline points="10 4 14 4 14 8" />
        </svg>
        <span className="font-bold">+{finding.prediction.range}</span>
        <span className="text-text-secondary">{finding.prediction.friendlyText}</span>
      </div>

      {/* Footer: Why this matters + Feedback */}
      <div className="pt-4 border-t border-border-outer">
        <div className="flex items-center justify-between gap-4">
          {/* Left: Why this matters toggle */}
          {finding.assumption ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setWhyOpen(!whyOpen);
              }}
              className="new-finding-toggle-btn"
              aria-expanded={whyOpen}
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform duration-200 ${whyOpen ? "rotate-180" : ""}`}
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polyline points="4 6 8 10 12 6" />
              </svg>
              Why this matters
            </button>
          ) : (
            <div /> /* Spacer */
          )}

          {/* Right: Feedback controls */}
          <div className="finding-feedback">
            {feedback === 'accurate' ? (
              /* Accurate confirmation - click to undo */
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedback(null);
                }}
                className="finding-feedback-confirmation finding-feedback-confirmation-positive finding-feedback-undo"
                title="Click to undo"
              >
                Noted
              </button>
            ) : feedback === 'inaccurate' ? (
              /* Inaccurate confirmation - click to undo */
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFeedback(null);
                }}
                className="finding-feedback-confirmation finding-feedback-confirmation-muted finding-feedback-undo"
                title="Click to undo"
              >
                Got it
              </button>
            ) : showInaccurateInput ? (
              /* Inaccurate input form */
              <div className={`finding-feedback-inaccurate-input ${inaccurateClosing ? 'finding-feedback-inaccurate-input-closing' : ''}`} ref={inaccurateInputRef}>
                <span className="finding-feedback-prompt">What did we miss?</span>
                <div className="finding-feedback-input-row">
                  <input
                    type="text"
                    placeholder="e.g., We tested this already"
                    value={inaccurateText}
                    onChange={(e) => setInaccurateText(e.target.value)}
                    className="finding-feedback-input"
                    maxLength={500}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleInaccurateSubmit();
                      if (e.key === 'Escape') closeInaccurateInput();
                    }}
                  />
                  <button
                    onClick={handleInaccurateSubmit}
                    className="finding-feedback-submit"
                    disabled={!inaccurateText.trim() || submitting}
                  >
                    {submitting ? '...' : 'Send'}
                  </button>
                </div>
              </div>
            ) : (
              /* Default: two feedback buttons */
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAccurate();
                  }}
                  className="finding-feedback-btn finding-feedback-btn-accurate"
                  disabled={submitting}
                >
                  Accurate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInaccurateClick();
                  }}
                  className="finding-feedback-btn finding-feedback-btn-inaccurate"
                >
                  Not quite
                </button>
              </>
            )}
          </div>
        </div>

        {/* Why this matters expandable content */}
        {finding.assumption && (
          <div
            className="finding-expandable-content"
            data-open={whyOpen}
          >
            <div className="finding-expandable-inner">
              <div className="mt-3 p-4 bg-[rgba(0,0,0,0.02)] rounded-lg">
                <p className="text-sm text-text-secondary leading-relaxed">{finding.assumption}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Findings Section for new format - 2-column grid layout
function FindingsSection({ findings, analysisId, domain }: { findings: Finding[]; analysisId: string; domain: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Lift feedback state so it persists across card collapse/expand
  const [feedbackMap, setFeedbackMap] = useState<Record<string, FindingFeedbackType>>({});

  const toggleFinding = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleFeedback = (findingId: string, type: FindingFeedbackType) => {
    setFeedbackMap((prev) => ({ ...prev, [findingId]: type }));
  };

  if (findings.length === 0) return null;

  return (
    <section className="result-section">
      <div className="section-header">
        <div>
          <h2
            className="text-4xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What to fix
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Ranked by conversion impact. Start at the top.
          </p>
        </div>
      </div>

      <div className="findings-grid">
        {findings.map((finding) => {
          const isExpanded = expandedId === finding.id;
          const feedback = feedbackMap[finding.id] ?? null;
          return (
            <div
              key={finding.id}
              className={isExpanded ? "findings-grid-item-expanded" : ""}
            >
              {isExpanded ? (
                <ExpandedFindingCard
                  finding={finding}
                  onToggle={() => toggleFinding(finding.id)}
                  feedback={feedback}
                  onFeedback={(type) => handleFeedback(finding.id, type)}
                  analysisId={analysisId}
                  domain={domain}
                />
              ) : (
                <CollapsedFindingCard
                  finding={finding}
                  onToggle={() => toggleFinding(finding.id)}
                />
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

// Bottom Line Section — merged Summary + Wayback value bridge
interface WaybackSnapshot {
  timestamp: string;
  original: string;
  thumbnailUrl: string;
  snapshotUrl: string;
  date: string;
}

function BottomLineSection({ url, summary, screenshotUrl }: { url: string; summary?: string; screenshotUrl?: string | null }) {
  const [snapshots, setSnapshots] = useState<WaybackSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const controller = new AbortController();

    async function fetchSnapshots() {
      try {
        const res = await fetch(`/api/wayback?url=${encodeURIComponent(url)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.snapshots && data.snapshots.length > 0) {
          setSnapshots(data.snapshots.slice(0, 4)); // Max 4 snapshots
        } else {
          setError(true);
        }
      } catch (err) {
        // Don't set error state if aborted
        if (err instanceof Error && err.name === "AbortError") return;
        setError(true);
      }
      setLoading(false);
    }
    fetchSnapshots();

    return () => controller.abort();
  }, [url]);

  // Shared header with summary lead-in
  const renderHeader = () => (
    <div className="text-center max-w-2xl mx-auto mb-8">
      <p className="text-xs font-bold uppercase tracking-[0.15em] text-text-muted mb-4">
        The bottom line
      </p>
      {summary && (
        <blockquote className="relative mb-8">
          <span
            className="absolute -top-2 left-1/2 -translate-x-1/2 text-5xl text-accent opacity-10 select-none leading-none pointer-events-none"
            style={{ fontFamily: "var(--font-display)" }}
            aria-hidden="true"
          >
            "
          </span>
          <p
            className="text-xl lg:text-2xl text-text-primary leading-relaxed pt-4"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {summary}
          </p>
        </blockquote>
      )}
    </div>
  );

  // Show mock timeline if no Wayback history
  if (error || (!loading && snapshots.length === 0)) {
    return (
      <section className="result-section">
        {renderHeader()}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
          {/* Today's screenshot first */}
          <div>
            <div className="aspect-[4/3] rounded-lg bg-bg-inset border-2 border-accent overflow-hidden">
              {screenshotUrl ? (
                <img
                  src={screenshotUrl}
                  alt="Today's snapshot"
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-accent text-center mt-2 font-medium">Today</p>
          </div>
          {/* Placeholder past snapshots */}
          {["1 month from now", "3 months", "6 months"].map((label, i) => (
            <div key={i}>
              <div className="aspect-[4/3] rounded-lg bg-bg-inset border border-border-subtle overflow-hidden relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-border-subtle/50" />
                </div>
              </div>
              <p className="text-xs text-text-muted text-center mt-2">{label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-text-secondary text-center mt-6">
          <a href="#claim-cta" className="text-accent hover:underline font-medium">Track this page</a>
          <span className="mx-1">—</span>
          we&apos;ll show you what moved.
        </p>
      </section>
    );
  }

  if (loading) {
    return (
      <section className="result-section">
        {renderHeader()}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="aspect-[4/3] rounded-lg bg-bg-inset animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  // Show Today first, then 3 Wayback snapshots (going back in time)
  const displaySnapshots = snapshots.slice(0, 3);

  return (
    <section className="result-section">
      {renderHeader()}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-start">
        {/* Today's screenshot first */}
        <div>
          <div className="aspect-[4/3] rounded-lg bg-bg-inset border-2 border-accent overflow-hidden">
            {screenshotUrl ? (
              <img
                src={screenshotUrl}
                alt="Today's snapshot"
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-accent text-center mt-2 font-medium">Today</p>
        </div>
        {/* Historical snapshots */}
        {displaySnapshots.map((snapshot, i) => (
          <a
            key={i}
            href={snapshot.snapshotUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <div className="aspect-[4/3] rounded-lg bg-bg-inset border border-border-subtle overflow-hidden transition-all group-hover:border-accent group-hover:shadow-lg">
              {failedImages.has(snapshot.timestamp) ? (
                <div className="w-full h-full flex items-center justify-center bg-bg-inset">
                  <div className="w-10 h-10 rounded-full bg-border-subtle/50" />
                </div>
              ) : (
                <img
                  src={snapshot.thumbnailUrl}
                  alt={`Snapshot from ${snapshot.date}`}
                  className="w-full h-full object-cover object-top"
                  loading="lazy"
                  onError={() => {
                    setFailedImages((prev) => new Set(prev).add(snapshot.timestamp));
                  }}
                />
              )}
            </div>
            <p className="text-xs text-text-muted text-center mt-2 group-hover:text-accent transition-colors">
              {snapshot.date}
            </p>
          </a>
        ))}
      </div>
      <p className="text-sm text-text-secondary text-center mt-6">
        <a href="#claim-cta" className="text-accent hover:underline font-medium">Track this page</a>
        <span className="mx-1">—</span>
        we&apos;ll show you what moved.
      </p>
    </section>
  );
}

// PDF Download Button with email capture modal
function PdfDownloadButton({
  analysis,
}: {
  analysis: {
    id: string;
    url: string;
    created_at: string;
    structured_output: AnalysisResult["structured"];
  };
}) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleDownload = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError("");

    try {
      // Capture email if provided
      if (email) {
        await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            source: "pdf_download",
            analysis_id: analysis.id,
            url: analysis.url,
          }),
        });
      }

      // Dynamically import PDF generator (client-side only)
      const { generateAuditPdf } = await import("@/lib/pdf/generate-audit-pdf");

      const blob = await generateAuditPdf({
        url: analysis.url,
        structured: analysis.structured_output,
        createdAt: analysis.created_at,
      });

      // Trigger download
      const domain = new URL(analysis.url).hostname;
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `loupe-audit-${domain}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);

      // Track PDF download
      track("pdf_downloaded", { domain });

      setShowModal(false);
    } catch (err) {
      console.error("PDF generation error:", err);
      setError("Failed to generate PDF. Try again.");
    }

    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="btn-secondary text-sm py-2 px-4 flex items-center gap-2"
      >
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M8 2v8m0 0l-3-3m3 3l3-3" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M2 11v2a1 1 0 001 1h10a1 1 0 001-1v-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Download PDF
      </button>

      {/* Email capture modal - rendered via portal to escape stacking contexts */}
      {showModal && typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50"
            onClick={() => setShowModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <h3
                className="text-xl font-bold text-text-primary mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Download your audit
              </h3>
              <p className="text-sm text-text-secondary mb-4">
                Get a PDF copy of this audit to share with your team.
              </p>

              <form onSubmit={handleDownload} className="space-y-3">
                <div>
                  <label htmlFor="pdf-email" className="text-xs text-text-muted block mb-1">
                    Email (optional — for follow-up tips)
                  </label>
                  <input
                    id="pdf-email"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-glass w-full"
                  />
                </div>

                {error && <p className="text-xs text-score-low">{error}</p>}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary flex-1"
                  >
                    {loading ? "Generating..." : "Download"}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function ScreenshotModal({
  url,
  mobileUrl,
  pageUrl,
  initialView = "desktop",
  onClose,
}: {
  url: string;
  mobileUrl?: string | null;
  pageUrl: string;
  initialView?: "desktop" | "mobile";
  onClose: () => void;
}) {
  const [isClosing, setIsClosing] = useState(false);
  const [activeView, setActiveView] = useState<"desktop" | "mobile">(initialView);

  // Hide site nav when modal is open
  useEffect(() => {
    document.body.classList.add("modal-open");
    return () => document.body.classList.remove("modal-open");
  }, []);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match animation duration
  }, [onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [handleClose]);

  const currentUrl = activeView === "mobile" && mobileUrl ? mobileUrl : url;

  return (
    <div
      className={`screenshot-modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleClose}
    >
      <div
        className={`screenshot-modal-content ${isClosing ? "closing" : ""}${activeView === "mobile" ? " max-w-[420px]" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="browser-chrome flex items-center justify-between sticky top-0 rounded-t-[20px]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="browser-dot" />
              <div className="browser-dot" />
              <div className="browser-dot" />
            </div>
            {mobileUrl ? (
              <div className="flex items-center gap-1 ml-2" role="group" aria-label="Screenshot viewport">
                <button
                  onClick={() => setActiveView("desktop")}
                  aria-pressed={activeView === "desktop"}
                  className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                    activeView === "desktop"
                      ? "text-text-primary bg-[rgba(0,0,0,0.06)]"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setActiveView("mobile")}
                  aria-pressed={activeView === "mobile"}
                  className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                    activeView === "mobile"
                      ? "text-text-primary bg-[rgba(0,0,0,0.06)]"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  Mobile
                </button>
              </div>
            ) : (
              <span className="text-xs text-text-muted font-mono ml-2 truncate">
                {getDomain(pageUrl)}
              </span>
            )}
          </div>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary transition-colors text-sm font-medium"
          >
            Close
          </button>
        </div>
        <img src={currentUrl} alt={`${activeView === "mobile" ? "Mobile" : "Desktop"} screenshot of ${pageUrl}`} className="w-full rounded-b-[20px]" />
      </div>
    </div>
  );
}

// --- Page ---

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const previewLoading = searchParams.get("preview") === "loading";

  // Use SWR hook for analysis fetching with automatic polling
  const { data: analysis, error: analysisError, isLoading } = useAnalysis(id);
  const error = analysisError?.message || "";

  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);
  const loadingStartTime = useRef(Date.now());
  const hasTrackedCompletion = useRef(false);
  const hasTrackedView = useRef(false);

  // Reset tracking refs when navigating between analyses
  useEffect(() => {
    hasTrackedCompletion.current = false;
    hasTrackedView.current = false;
    claimSubmittedRef.current = false;
  }, [id]);

  // Track audit page view (fires once per analysis load)
  useEffect(() => {
    if (analysis?.status === "complete" && !hasTrackedView.current) {
      hasTrackedView.current = true;
      track("audit_viewed", {
        domain: getDomain(analysis.url),
        url: analysis.url,
        is_owner: analysis.claim_status === "owner",
      });
    }
  }, [analysis]);

  const [showScreenshot, setShowScreenshot] = useState<false | "desktop" | "mobile">(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const claimEmailRef = useRef(claimEmail);
  claimEmailRef.current = claimEmail;
  const claimSubmittedRef = useRef(false);
  const [claimEmailSent, setClaimEmailSent] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [deployExpanded, setDeployExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [foundingStatus, setFoundingStatus] = useState<{
    claimed: number;
    total: number;
    remaining: number;
    isFull: boolean;
  } | null>(null);
  const [claimModalType, setClaimModalType] = useState<ClaimModalType>(null);

  // Check for already_claimed URL param (from auth callback redirect)
  useEffect(() => {
    if (searchParams.get("already_claimed") === "true") {
      setClaimModalType("already_claimed");
      // Clean up URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("already_claimed");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  // Fetch founding status on mount
  useEffect(() => {
    fetch("/api/founding-status")
      .then((res) => res.json())
      .then((data) => {
        // Validate response shape before setting
        if (data && typeof data.claimed === "number" && typeof data.remaining === "number") {
          setFoundingStatus(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleClaimEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimEmail || !analysis || claimSubmittedRef.current) return;
    claimSubmittedRef.current = true;
    setClaimLoading(true);
    setClaimError("");
    try {
      const res = await fetch("/api/auth/claim-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: claimEmail.trim(),
          analysisId: analysis.id,
        }),
      });
      if (res.ok) {
        setClaimEmailSent(true);
        // Track page claim attempt (activation moment)
        track("page_claimed", { domain: getDomain(analysis.url), url: analysis.url });
      } else {
        const data = await res.json();
        console.error("Claim link error:", data.error);
        setClaimError("Failed to send link. Try again.");
      }
    } catch {
      setClaimError("Network error. Try again.");
    }
    setClaimLoading(false);
  };

  const handleShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setLinkCopied(true);
    track("share_link_copied", { context: "analysis" });
    setTimeout(() => setLinkCopied(false), 2000);
  };

  // Track audit completion + auto-submit email if typed during loading
  useEffect(() => {
    if (
      analysis?.status === "complete" &&
      analysis?.structured_output &&
      !hasTrackedCompletion.current
    ) {
      hasTrackedCompletion.current = true;
      track("audit_completed", {
        domain: getDomain(analysis.url),
        url: analysis.url,
        findings_count: analysis.structured_output.findingsCount ?? 0,
        impact_range: analysis.structured_output.projectedImpactRange ?? "0%",
      });

      // Auto-handle email typed during loading screen
      const email = claimEmailRef.current.trim();
      if (email && !claimSubmittedRef.current) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (isValid) {
          // Valid email — auto-submit claim link
          claimSubmittedRef.current = true;
          fetch("/api/auth/claim-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, analysisId: analysis.id }),
          }).then((res) => {
            if (res.ok) {
              setClaimEmailSent(true);
              track("page_claimed", { domain: getDomain(analysis.url), url: analysis.url });
            } else {
              // Claim failed — save as lead so email isn't lost
              claimSubmittedRef.current = false;
              return fetch("/api/leads", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email,
                  source: "loading_claim_failed",
                  analysis_id: analysis.id,
                  url: analysis.url,
                }),
              });
            }
          }).catch(() => {});
        } else if (email.includes("@")) {
          // Partial email with @ — save as lead for follow-up
          fetch("/api/leads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              source: "loading_partial",
              analysis_id: analysis.id,
              url: analysis.url,
            }),
          }).catch(() => {});
        }
      }
    }
  }, [analysis?.status, analysis?.structured_output, analysis?.id, analysis?.url]);

  // Steady progress animation (no looping, no fast jumps)
  useEffect(() => {
    if (
      previewLoading ||
      analysis?.status === "pending" ||
      analysis?.status === "processing"
    ) {
      // Reset start time when entering loading state
      loadingStartTime.current = Date.now();

      // Steady progress: ~2% per second, caps at 90%
      const progressTimer = setInterval(() => {
        const elapsed = (Date.now() - loadingStartTime.current) / 1000;
        setProgress(Math.min(90, elapsed * 2));
      }, 200);

      // Stages advance forward only, hold on final (8s per stage = 40s total)
      const stageTimer = setInterval(() => {
        setStageIndex((s) => Math.min(s + 1, ANALYSIS_STAGES.length - 1));
      }, 8000);

      // Examples rotate independently (5s each, with crossfade)
      const exampleTimer = setInterval(() => {
        setExampleIndex((s) => (s + 1) % DRIFT_EXAMPLES.length);
      }, 5000);

      return () => {
        clearInterval(progressTimer);
        clearInterval(stageTimer);
        clearInterval(exampleTimer);
      };
    }
  }, [analysis?.status, previewLoading]);

  // --- Loading / Error / Failed states ---

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-text-secondary text-lg">{error}</p>
          <Link
            href="/"
            className="text-accent font-medium underline mt-4 inline-block"
          >
            Try another URL
          </Link>
        </div>
      </div>
    );
  }

  // Skeleton loader for initial content fetch (before we know the status)
  if (isLoading && !analysis) {
    return <PageLoader />;
  }

  // Generating loader (analysis in progress)
  if (
    previewLoading ||
    !analysis ||
    analysis.status === "pending" ||
    analysis.status === "processing"
  ) {
    return (
      <div className="flex justify-center px-4 pt-12 pb-16">
        <div className="w-full max-w-[540px]">
          {/* Single consolidated card */}
          <div className="glass-card-elevated p-8">
            {/* URL + Progress */}
            <div className="text-center mb-6">
              {analysis?.url && (
                <p className="text-sm text-text-muted font-mono mb-3 truncate">
                  {getDomain(analysis.url)}
                </p>
              )}

              {/* Single continuous progress bar */}
              <div className="w-full max-w-[280px] mx-auto mb-3">
                <div className="h-1.5 rounded-full bg-bg-inset overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{
                      width: `${progress}%`,
                      transition: "width 0.4s ease-out",
                    }}
                  />
                </div>
              </div>

              {/* Stage label with crossfade */}
              <div className="relative h-6 overflow-hidden">
                {ANALYSIS_STAGES.map((stage, i) => (
                  <p
                    key={stage.id}
                    className="absolute inset-0 text-base text-text-secondary transition-opacity duration-500"
                    style={{ opacity: i === stageIndex ? 1 : 0 }}
                  >
                    {stage.label}...
                  </p>
                ))}
              </div>
              <p className="text-xs text-text-muted mt-2">Usually takes about a minute</p>
            </div>

            {/* Preview with overlapping suggestion card */}
            <div className="relative mb-8">
              {/* Base skeleton - the "current state" */}
              <div className="bg-bg-inset/50 rounded-xl p-5">
                <div className="flex items-start gap-4">
                  {/* Mini score skeleton */}
                  <div className="w-16 h-16 rounded-full bg-border-subtle/40 animate-pulse flex-shrink-0" />
                  {/* Skeleton content */}
                  <div className="flex-1 space-y-2.5 pt-1">
                    <div className="h-4 w-4/5 bg-border-subtle/60 rounded animate-pulse" />
                    <div className="h-3 w-3/5 bg-border-subtle/40 rounded animate-pulse" />
                    <div className="h-3 w-2/5 bg-border-subtle/30 rounded animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Overlapping "suggestion" card - the value preview */}
              <div className="absolute -bottom-4 -right-2 sm:right-6 w-[280px] glass-card p-3.5 shadow-lg border-l-2 border-accent">
                <p className="text-[10px] font-semibold text-accent uppercase tracking-wide mb-1.5">
                  What we catch
                </p>
                {/* Crossfade between examples */}
                <div className="relative h-10 overflow-hidden">
                  {DRIFT_EXAMPLES.map((example, i) => (
                    <p
                      key={i}
                      className="absolute inset-0 text-sm text-text-primary font-medium leading-snug transition-opacity duration-500"
                      style={{ opacity: i === exampleIndex ? 1 : 0 }}
                    >
                      &ldquo;{example}&rdquo;
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Email capture */}
            {claimEmailSent ? (
              <div className="text-center py-3">
                <div className="inline-flex items-center gap-2 text-score-high mb-1">
                  <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                  </svg>
                  <span className="font-medium text-text-primary">Check your inbox</span>
                </div>
                <p className="text-sm text-text-muted">We&apos;re watching. You&apos;ll know when it drifts.</p>
              </div>
            ) : (
              <>
                <form onSubmit={handleClaimEmail} className="flex flex-col sm:flex-row items-stretch gap-2 max-w-md mx-auto">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    className="input-glass flex-1 text-center sm:text-left"
                    aria-label="Email address"
                    required
                  />
                  <button
                    type="submit"
                    disabled={claimLoading}
                    className="btn-primary whitespace-nowrap"
                  >
                    {claimLoading ? "..." : "Watch my page"}
                  </button>
                </form>
                {claimError && (
                  <p className="text-xs text-score-low mt-2 text-center">{claimError}</p>
                )}
                <p className="text-xs text-text-muted text-center mt-4">
                  Free. No spam. Just drift alerts.
                </p>

                {/* Hide founding count until 10+ claimed for better social proof */}
                {foundingStatus && !foundingStatus.isFull && foundingStatus.claimed >= 10 && (
                  <div className="mt-4 text-center">
                    <div className="flex items-center justify-center gap-0.5 mb-2">
                      {Array.from({ length: Math.min(foundingStatus.total, 50) }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < foundingStatus.claimed ? "bg-accent" : "bg-border-subtle"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-text-muted">
                      <span className="font-semibold text-accent">{foundingStatus.remaining}</span> spots — daily scans, free
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (analysis.status === "failed") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <p className="text-text-primary font-semibold text-xl">
            Analysis failed
          </p>
          <p className="text-base text-text-secondary mt-2">
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
          <p className="text-text-primary font-semibold text-xl">
            Something went wrong
          </p>
          <p className="text-base text-text-secondary mt-2">
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
  const isChronicle = analysis.parent_analysis_id && analysis.changes_summary && isChronicleFormat(analysis.changes_summary);
  const pageCtx = analysis.page_context;

  return (
    <main className="min-h-screen text-text-primary">
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10">
        {/* Page context banner — shown when analysis belongs to a registered page */}
        {pageCtx && (
          <div className="analysis-context-shell pt-6 pb-3">
            {/* Chronicle scans: Page-centric header */}
            {isChronicle ? (
              <>
              <nav className="analysis-context-breadcrumb">
                <Link href="/dashboard">Your pages</Link>
                <span>/</span>
                <span>{getDomain(analysis.url)}</span>
              </nav>
              <div className="analysis-context-bar">
                <div className="analysis-context-main">
                  <h1
                    className="analysis-context-domain"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {getDomain(analysis.url)}
                  </h1>
                  <div className="analysis-context-meta">
                    <ScanPicker
                      currentScanNumber={pageCtx.scan_number}
                      totalScans={pageCtx.total_scans}
                      pageId={pageCtx.page_id}
                      currentAnalysisId={analysis.id}
                    />
                    <Link
                      href={`/pages/${pageCtx.page_id}`}
                      className="analysis-context-link"
                    >
                      View history
                    </Link>
                  </div>
                </div>

                {analysis.screenshot_url && (
                  <div className="flex items-end gap-1.5">
                    <button
                      onClick={() => setShowScreenshot("desktop")}
                      className="analysis-context-thumb-corner"
                      title="View desktop screenshot"
                    >
                      <img
                        src={analysis.screenshot_url}
                        alt="Desktop screenshot"
                        className="analysis-context-thumb-img"
                      />
                    </button>
                    {analysis.mobile_screenshot_url && (
                      <button
                        onClick={() => setShowScreenshot("mobile")}
                        className="analysis-context-thumb-mobile"
                        title="View mobile screenshot"
                      >
                        <img
                          src={analysis.mobile_screenshot_url}
                          alt="Mobile screenshot"
                          className="analysis-context-thumb-img"
                        />
                      </button>
                    )}
                  </div>
                )}

                <span className="analysis-context-date">
                  {new Date(analysis.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              </>
            ) : (
              /* Initial audit: Original header style */
              <div className="space-y-2">
                {/* Breadcrumb — just two segments */}
                <nav className="flex items-center gap-2 text-sm">
                  <Link
                    href="/dashboard"
                    className="text-text-muted hover:text-accent transition-colors"
                  >
                    Your pages
                  </Link>
                  <span className="text-text-muted">/</span>
                  <span className="text-text-primary">
                    {getDomain(analysis.url)}
                  </span>
                </nav>

                {/* Page header — scan info left, actions right */}
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-semibold text-text-primary">
                      Scan #{pageCtx.scan_number}
                    </span>
                    {analysis.deploy_context ? (
                      <>
                        <span className="text-text-muted">·</span>
                        <button
                          onClick={() => setDeployExpanded(!deployExpanded)}
                          className="flex items-center gap-1 text-text-muted hover:text-accent transition-colors"
                        >
                          <span>Deploy {analysis.deploy_context.commit_sha.slice(0, 7)}</span>
                          <svg
                            className={`w-3 h-3 transition-transform ${deployExpanded ? 'rotate-180' : ''}`}
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                          >
                            <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      </>
                    ) : analysis.trigger_type && analysis.trigger_type !== "manual" ? (
                      <>
                        <span className="text-text-muted">·</span>
                        <span className="text-text-muted">
                          {analysis.trigger_type === "daily" && "Daily scan"}
                          {analysis.trigger_type === "weekly" && "Weekly scan"}
                        </span>
                      </>
                    ) : null}
                    <span className="text-text-muted">·</span>
                    <span className="text-text-muted">
                      {new Date(analysis.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  {/* Actions — History + Prev/Next */}
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/pages/${pageCtx.page_id}`}
                      className="text-sm text-text-muted hover:text-accent transition-colors"
                    >
                      History
                    </Link>
                    <span className="text-border-subtle">·</span>
                    {pageCtx.prev_analysis_id ? (
                      <Link
                        href={`/analysis/${pageCtx.prev_analysis_id}`}
                        className="text-sm text-text-muted hover:text-accent transition-colors flex items-center gap-1"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M13 15l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Prev
                      </Link>
                    ) : (
                      <span className="text-sm text-text-muted opacity-50">Prev</span>
                    )}
                    {pageCtx.next_analysis_id ? (
                      <Link
                        href={`/analysis/${pageCtx.next_analysis_id}`}
                        className="text-sm text-text-muted hover:text-accent transition-colors flex items-center gap-1"
                      >
                        Next
                        <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M7 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </Link>
                    ) : (
                      <span className="text-sm text-text-muted opacity-50">Next</span>
                    )}
                  </div>
                </div>

                {/* Deploy context expanded dropdown */}
                {analysis.deploy_context && deployExpanded && (
                  <div className="glass-card p-4 max-w-md">
                    <p className="font-medium text-text-primary text-sm">
                      &ldquo;{analysis.deploy_context.commit_message}&rdquo;
                    </p>
                    <p className="text-xs text-text-muted mt-1">
                      {analysis.deploy_context.commit_author} committed {timeAgo(analysis.deploy_context.commit_timestamp)}
                    </p>

                    {analysis.deploy_context.changed_files.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border-outer">
                        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
                          Changed files
                        </p>
                        <ul className="space-y-0.5">
                          {analysis.deploy_context.changed_files.slice(0, 3).map((file: string, i: number) => (
                            <li key={i} className="text-xs font-mono text-text-secondary truncate">
                              {file}
                            </li>
                          ))}
                          {analysis.deploy_context.changed_files.length > 3 && (
                            <li className="text-xs text-text-muted">
                              +{analysis.deploy_context.changed_files.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

{/* Initial Audit Layout — hidden for Chronicle scans */}
        {!isChronicle && (
          <>
        {/* Hero Section */}
        <NewHeroSection
          structured={s}
          domain={getDomain(analysis.url)}
          createdAt={analysis.created_at}
          screenshotUrl={analysis.screenshot_url}
          mobileScreenshotUrl={analysis.mobile_screenshot_url}
          onScreenshotClick={(view) => setShowScreenshot(view)}
          claimStatus={analysis.claim_status}
          onShareLink={handleShareLink}
          linkCopied={linkCopied}
          claimEmailSent={claimEmailSent}
          claimEmail={claimEmail}
          setClaimEmail={setClaimEmail}
          claimLoading={claimLoading}
          onClaimEmail={handleClaimEmail}
          claimError={claimError}
          claimedPageId={analysis.claim_status?.claimed_page_id}
          pageUrl={analysis.url}
        />

        <hr className="section-divider" />

        {/* Findings Section */}
        {s.findings && s.findings.length > 0 && (
          <>
            <FindingsSection findings={s.findings} analysisId={analysis.id} domain={getDomain(analysis.url)} />
            <hr className="section-divider" />
          </>
        )}

        {/* Headline Rewrite Spotlight */}
        {s.headlineRewrite && (
          <>
            <section className="result-section">
              <div className="section-header">
                <div>
                  <h2
                    className="text-4xl font-bold text-text-primary"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Headline rewrite
                  </h2>
                  <p className="text-sm text-text-muted mt-1">
                    One change that could shift perception immediately.
                  </p>
                </div>
              </div>
              {(() => {
                // Type-safe headline rewrite handling
                const headlineRewrite = s.headlineRewrite as {
                  current: string;
                  suggested: string;
                  currentAnnotation?: string;
                  suggestedAnnotation?: string;
                  reasoning?: string;
                };
                const annotation = headlineRewrite.currentAnnotation;
                const explanation = headlineRewrite.suggestedAnnotation || headlineRewrite.reasoning || "";

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
                    {/* Left: the rewrite card */}
                    <div className="glass-card-elevated p-6">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Current</p>
                      <p className="headline-rewrite-current text-base leading-relaxed mb-2">
                        {headlineRewrite.current}
                      </p>
                      {/* New format: show currentAnnotation as diagnosis */}
                      {annotation && (
                        <div className="mt-2 mb-4 flex items-start gap-2 p-3 rounded-lg bg-[rgba(194,59,59,0.05)] border border-[rgba(194,59,59,0.1)]">
                          <svg className="w-4 h-4 text-score-low flex-shrink-0 mt-0.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <circle cx="8" cy="8" r="6" />
                            <path d="M8 5v3" strokeLinecap="round" />
                            <circle cx="8" cy="11" r="0.5" fill="currentColor" />
                          </svg>
                          <p className="text-sm text-text-secondary leading-relaxed">
                            {annotation}
                          </p>
                        </div>
                      )}
                      {!annotation && <div className="mb-2" />}

                      <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1.5">Suggested</p>
                      <div className="headline-rewrite-suggested relative">
                        <p
                          className="text-base font-bold leading-relaxed pr-8"
                          style={{ fontFamily: "var(--font-display)" }}
                        >
                          {headlineRewrite.suggested}
                        </p>
                        <button
                          onClick={() => navigator.clipboard.writeText(headlineRewrite.suggested)}
                          className="absolute top-3 right-3 text-text-muted hover:text-accent transition-colors p-1 rounded-md
                                     hover:bg-[rgba(255,90,54,0.08)] active:scale-[0.95]"
                          title="Copy headline"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
                            <path d="M10.5 5.5V3.5a1.5 1.5 0 00-1.5-1.5H3.5A1.5 1.5 0 002 3.5V9a1.5 1.5 0 001.5 1.5h2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Right: reasoning/annotation */}
                    <div className="flex flex-col justify-center">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Why this works</p>
                      <p
                        className="text-xl lg:text-2xl text-text-primary leading-snug"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {explanation}
                      </p>
                    </div>
                  </div>
                );
              })()}
            </section>

            <hr className="section-divider" />
          </>
        )}

        {/* Bottom Line — merged Summary + Wayback value bridge (only for unclaimed initial audits) */}
        {!analysis.claim_status?.claimed_by_current_user && !analysis.claim_status?.is_claimed && (
          <>
            <BottomLineSection url={analysis.url} summary={s.summary} screenshotUrl={analysis.screenshot_url} />
            <hr className="section-divider" />
          </>
        )}
          </>
        )}

        {/* Chronicle Layout for new format N+1 scans */}
        {analysis.parent_analysis_id && analysis.changes_summary && isChronicleFormat(analysis.changes_summary) && (
          <ChronicleLayout
            changesSummary={analysis.changes_summary}
            deployContext={analysis.deploy_context}
            baselineDate={pageCtx?.baseline_date}
            triggerType={analysis.trigger_type}
            screenshotUrl={analysis.screenshot_url}
            mobileScreenshotUrl={analysis.mobile_screenshot_url}
            pageUrl={analysis.url}
            createdAt={analysis.created_at}
            onViewFullScreenshot={() => setShowScreenshot("desktop")}
          />
        )}

        {/* Zone 6: Claim CTA — not shown when current user owns this page */}
        {!analysis.claim_status?.claimed_by_current_user && (
        <section id="claim-cta" className="py-10">
          <div className="glass-card-elevated p-6 md:p-8 max-w-[540px] mx-auto">
            {analysis.claim_status?.is_claimed ? (
              /* Domain already claimed by another user */
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(0,0,0,0.05)] mb-4">
                  <svg className="w-6 h-6 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p
                  className="text-2xl font-bold text-text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Already being monitored
                </p>
                <p className="text-base text-text-secondary mt-2">
                  Someone else is watching {getDomain(analysis.url)}. You can still view this audit and share it.
                </p>
              </div>
            ) : claimEmailSent ? (
              /* Post-submit state */
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(255,90,54,0.1)] mb-4">
                  <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p
                  className="text-2xl font-bold text-text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  You&apos;re tracking this page
                </p>
                <p className="text-base text-text-secondary mt-2">
                  Check your inbox for the magic link. Make your changes, then we&apos;ll show you what moved.
                </p>
              </div>
            ) : (
              /* Claim form */
              <div className="text-center">
                {/* Headline + subhead */}
                <h2
                  className="text-2xl md:text-3xl font-bold text-text-primary"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {analysis.changes_summary
                    ? "Want to know if your changes helped?"
                    : "This is your page today. What happens next?"}
                </h2>
                <p className="text-base text-text-secondary mt-2 mb-6">
                  {analysis.changes_summary
                    ? "We\u2019ll re-scan after you make changes and show you what improved."
                    : "Loupe re-scans automatically and tells you what changed \u2014 and whether it helped or hurt."}
                </p>

                {/* Email form — the hero */}
                <form onSubmit={handleClaimEmail} className="flex flex-col sm:flex-row items-stretch gap-3 mb-3">
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={claimEmail}
                    onChange={(e) => setClaimEmail(e.target.value)}
                    className="input-glass flex-1 text-center sm:text-left"
                    aria-label="Email address"
                    required
                  />
                  <button
                    type="submit"
                    disabled={claimLoading}
                    className="btn-primary whitespace-nowrap"
                  >
                    {claimLoading ? "Sending..." : "Track this page"}
                  </button>
                </form>

                {/* Error message */}
                {claimError && (
                  <p className="text-sm text-score-low mt-2 mb-4">{claimError}</p>
                )}

                {/* Trust line */}
                {!claimError && (
                  <p className="text-sm text-text-muted mb-6">
                    Free forever. No credit card.
                  </p>
                )}

                {/* Founding 50 — hide until 10+ claimed for better social proof */}
                {foundingStatus && !foundingStatus.isFull && foundingStatus.claimed >= 10 && !analysis.changes_summary && (
                  <div className="pt-4 border-t border-border-outer">
                    {/* Label */}
                    <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-2">
                      Founding 50
                    </p>
                    {/* Dots */}
                    <div className="flex items-center justify-center gap-0.5 mb-2">
                      {Array.from({ length: foundingStatus.total }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i < foundingStatus.claimed
                              ? "bg-accent"
                              : "bg-[rgba(0,0,0,0.1)]"
                          }`}
                        />
                      ))}
                    </div>
                    {/* Value line */}
                    <p className="text-sm text-text-muted">
                      {foundingStatus.remaining} spots left — free Pro (<span className="font-semibold text-text-secondary">$19/mo</span>) for life
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-center gap-3 text-sm text-text-muted mt-6">
            <button
              onClick={handleShareLink}
              className="hover:text-accent transition-colors"
            >
              {linkCopied ? "Copied!" : "Copy link"}
            </button>
            <span className="text-border-subtle">·</span>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                `"${s.verdict}"\n\nGot this from my @getloupe audit:`
              )}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : `https://getloupe.io/analysis/${id}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-accent transition-colors"
            >
              Post on X
            </a>
            <span className="text-border-subtle">·</span>
            <PdfDownloadButton
              analysis={{
                id: analysis.id,
                url: analysis.url,
                created_at: analysis.created_at,
                structured_output: s,
              }}
            />
            <span className="text-border-subtle">·</span>
            <Link href="/" className="hover:text-accent transition-colors">
              New audit
            </Link>
          </div>
        </section>
        )}
      </div>

      {/* Screenshot modal */}
      {showScreenshot && analysis.screenshot_url && (
        <ScreenshotModal
          url={analysis.screenshot_url}
          mobileUrl={analysis.mobile_screenshot_url}
          pageUrl={analysis.url}
          initialView={showScreenshot}
          onClose={() => setShowScreenshot(false)}
        />
      )}

      {/* Claim error modal */}
      <ClaimModal
        type={claimModalType}
        onClose={() => setClaimModalType(null)}
        domain={getDomain(analysis.url)}
        onShare={handleShareLink}
      />
    </main>
  );
}
