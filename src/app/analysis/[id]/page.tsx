"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChronicleSkeleton } from "@/components/chronicle";
import { track, identify } from "@/lib/analytics/track";
import { useAnalysis } from "@/lib/hooks/use-data";
import type {
  PageContext,
  DeployContextAPI,
  MetricsSnapshot,
  ClaimStatus,
  AnalysisResult,
  ChangesSummary,
  Finding,
  TrackedSuggestion,
} from "@/lib/types/analysis";
import { ChronicleLayout, DossierSidebar } from "@/components/chronicle";
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

// Examples showing change → outcome connection (not just change detection)
const OUTCOME_EXAMPLES = [
  "Your headline changed Jan 28. Signups are up 23% since then.",
  "Pricing layout rebuilt by your AI tool. Checkouts dropped 8% over 14 days.",
  "CTA copy changed 3 deploys ago. We\u2019re still measuring \u2014 7-day checkpoint Tuesday.",
  "Social proof section disappeared. Bounce rate up 12% in the same window.",
  "You moved the CTA above the fold. Time to first click improved by 30%.",
];

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

function getPageLabel(url: string) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "");
    if (!path || path === "") return u.hostname;
    return u.hostname + path;
  } catch {
    return url;
  }
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

// Collapsed Finding Card - compact for 2-column grid
function CollapsedFindingCard({
  finding,
  onToggle,
}: {
  finding: Finding;
  onToggle: () => void;
}) {
  const impactLabel = {
    high: "High",
    medium: "Medium",
    low: "Low",
  }[finding.impact];
  const diagnosisSource = finding.methodology.trim();
  const diagnosisSummary = diagnosisSource.length > 30
    ? `${diagnosisSource.slice(0, 30).trimEnd()}...`
    : diagnosisSource;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  // Truncate currentValue for preview
  const problemPreview = finding.currentValue.length > 45
    ? finding.currentValue.slice(0, 45).trim() + "..."
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
      <div className={`finding-card-accent finding-card-accent-${finding.impact}`} />
      <div className="finding-card-body">
        <p className="finding-collapsed-meta">
          <span className={`finding-impact-inline finding-impact-inline-${finding.impact}`}>
            {impactLabel}
          </span>
          <span className="finding-meta-separator" aria-hidden="true">•</span>
          <span className="finding-diagnosis-inline">
            {diagnosisSummary || finding.element}
          </span>
        </p>

        {/* Title */}
        <h3
          className="finding-collapsed-title"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {finding.title}
        </h3>

        {/* Problem preview - what's wrong on their page */}
        <p className="finding-problem-preview">
          &ldquo;{problemPreview}&rdquo;
        </p>

        {/* Prediction with friendly text */}
        <div className="finding-collapsed-lift">
          <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="2 12 6 8 9 11 14 4" />
            <polyline points="10 4 14 4 14 8" />
          </svg>
          <span className="finding-collapsed-lift-range">+{finding.prediction.range}</span>
          <span className="finding-collapsed-lift-text">{finding.prediction.friendlyText}</span>
        </div>

      </div>
    </div>
  );
}

// Feedback types for finding cards - accuracy-based for LLM calibration
type FindingFeedbackType = 'accurate' | 'inaccurate' | null;

function CurrentVsRecommended({
  currentLabel,
  currentText,
  currentNote,
  recommendedLabel,
  recommendedText,
  copied,
  onCopy,
  copyTitle,
  copyAriaLabel,
  containerClassName = "",
}: {
  currentLabel: string;
  currentText: string;
  currentNote?: string;
  recommendedLabel: string;
  recommendedText: string;
  copied: boolean;
  onCopy: (e: React.MouseEvent) => void;
  copyTitle: string;
  copyAriaLabel: string;
  containerClassName?: string;
}) {
  return (
    <div className={`finding-expanded-comparison ${containerClassName}`.trim()}>
      <div className="finding-content-box finding-content-current">
        <span className="finding-content-label">{currentLabel}</span>
        <p className="finding-content-text">
          &ldquo;{currentText}&rdquo;
        </p>
        {currentNote && <p className="finding-content-note">{currentNote}</p>}
      </div>

      <div className="fix-block finding-content-fix">
        <div className="fix-block-header">
          <span className="fix-block-label">{recommendedLabel}</span>
          <button
            onClick={onCopy}
            className="fix-block-copy"
            title={copyTitle}
            aria-label={copyAriaLabel}
          >
            {copied ? (
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
        <p className="fix-block-text">
          &ldquo;{recommendedText}&rdquo;
        </p>
      </div>
    </div>
  );
}

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
  const methodologyPreview = finding.methodology.trim();
  const diagnosisSummary = methodologyPreview.length > 48
    ? `${methodologyPreview.slice(0, 48).trimEnd()}...`
    : methodologyPreview;

  // Determine if card should be dimmed (inaccurate feedback)
  const isDimmed = feedback === 'inaccurate';

  return (
    <div className={`new-finding-card-expanded ${isDimmed ? 'finding-card-dimmed' : ''}`}>
      {/* Header row: impact + element context + close */}
      <div className="finding-expanded-header">
        <p className="finding-expanded-meta-line">
          <span className={`finding-impact-inline finding-impact-inline-${finding.impact}`}>
            {impactLabel}
          </span>
          <span className="finding-meta-separator" aria-hidden="true">•</span>
          <span className="finding-diagnosis-inline">
            {diagnosisSummary ? `Diagnosis: ${diagnosisSummary}` : finding.element}
          </span>
        </p>
        <button
          onClick={onToggle}
          className="finding-card-close-btn"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 6l8 8M14 6l-8 8" />
          </svg>
        </button>
      </div>

      {/* Title */}
      <h3
        className="finding-expanded-title"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {finding.title}
      </h3>

      {/* Two-column content: Current | Suggestion — matching structure */}
      <CurrentVsRecommended
        currentLabel="Current wording"
        currentText={finding.currentValue}
        recommendedLabel="Recommended change"
        recommendedText={finding.suggestion}
        copied={suggestionCopied}
        onCopy={handleCopySuggestion}
        copyTitle={suggestionCopied ? "Copied!" : "Copy"}
        copyAriaLabel={suggestionCopied ? "Copied to clipboard" : "Copy suggestion"}
      />

      {/* Prediction line - full width */}
      <div className="finding-prediction-row">
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 12 6 8 9 11 14 4" />
          <polyline points="10 4 14 4 14 8" />
        </svg>
        <span className="finding-prediction-kicker">Modeled lift</span>
        <span className="font-bold">+{finding.prediction.range}</span>
        <span className="text-text-secondary">{finding.prediction.friendlyText}</span>
      </div>

      {/* Footer: Why this matters + Feedback */}
      <div className="pt-4 border-t border-border-outer">
        <div className="finding-footer-row">
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
              Why this should work
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
              <div className="finding-assumption-panel">
                <p className="text-sm text-text-secondary leading-relaxed">{finding.assumption}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Sticky bottom claim bar — appears after scrolling past hero (mobile only)
function StickyClaimBar({
  domain,
  findingsCount,
  impactRange,
  email,
  onEmailChange,
  onSubmit,
  loading,
  sent,
}: {
  domain: string;
  findingsCount: number;
  impactRange: string;
  email: string;
  onEmailChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  sent: boolean;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const claimSection = document.getElementById("claim-cta");
      let claimInView = false;
      if (claimSection) {
        const rect = claimSection.getBoundingClientRect();
        claimInView = rect.top < window.innerHeight && rect.bottom > 0;
      }
      setVisible(scrollY > 600 && !claimInView && !sent);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sent]);

  return (
    <div className={`claim-sticky-bar ${visible ? "claim-sticky-visible" : ""}`}>
      <div className="claim-sticky-inner">
        <div className="claim-sticky-info">
          <div className="claim-sticky-dot" />
          <p className="claim-sticky-text">
            {findingsCount} prediction{findingsCount !== 1 ? "s" : ""} to verify
            <span>·</span>
            +{impactRange} projected
          </p>
        </div>
        <form onSubmit={onSubmit} className="claim-sticky-form">
          <input
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="input-glass"
            aria-label="Email address"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "..." : "Start watching"}
          </button>
        </form>
      </div>
    </div>
  );
}

// Findings Section for new format - 2-column grid layout
function FindingsSection({ findings, analysisId, domain, showCheckpointPreview }: { findings: Finding[]; analysisId: string; domain: string; showCheckpointPreview?: boolean }) {
  const [expandedId, setExpandedId] = useState<string | null>(findings[0]?.id ?? null);
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
      <div className="section-header findings-section-header">
        <div className="findings-section-copy">
          <h2
            className="text-4xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            What to change
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Ranked by expected impact. Change any of these and we&apos;ll measure what happens.
          </p>
          {showCheckpointPreview && (
            <p className="findings-horizon-inline" aria-label="Tracking checkpoints at 1, 7, 14, and 30 days">
              <span className="findings-horizon-label-inline">Tracking checkpoints:</span>
              <span className="findings-horizon-chips" aria-hidden="true">
                <span className="findings-horizon-chip findings-horizon-chip-now">1d</span>
                <span className="findings-horizon-chip">7d</span>
                <span className="findings-horizon-chip">14d</span>
                <span className="findings-horizon-chip">30d</span>
              </span>
            </p>
          )}
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

// Headline Rewrite Section — single-column before/after flow
function HeadlineRewriteSection({ headlineRewrite }: {
  headlineRewrite: {
    current: string;
    suggested: string;
    currentAnnotation?: string;
    suggestedAnnotation?: string;
    reasoning?: string;
  };
}) {
  const [copied, setCopied] = useState(false);
  const annotation = headlineRewrite.currentAnnotation;
  const explanation = headlineRewrite.suggestedAnnotation || headlineRewrite.reasoning || "";

  const handleCopy = () => {
    navigator.clipboard.writeText(headlineRewrite.suggested);
    setCopied(true);
    track("suggestion_copied", { element_type: "headline", domain: "" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
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

      <div className="headline-rewrite-layout">
        {/* Left: the rewrite card */}
        <div className="headline-rewrite-card">
          <CurrentVsRecommended
            currentLabel="Current wording"
            currentText={headlineRewrite.current}
            currentNote={annotation}
            recommendedLabel="Recommended change"
            recommendedText={headlineRewrite.suggested}
            copied={copied}
            onCopy={(e) => {
              e.stopPropagation();
              handleCopy();
            }}
            copyTitle={copied ? "Copied!" : "Copy headline"}
            copyAriaLabel={copied ? "Copied to clipboard" : "Copy suggested headline"}
            containerClassName="headline-rewrite-comparison"
          />
        </div>

        {/* Right: why this works — open text, no card */}
        {explanation && (
          <div className="headline-rewrite-why">
            <p className="headline-rewrite-why-label">Why this should work</p>
            <p
              className="headline-rewrite-why-text"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {explanation}
            </p>
          </div>
        )}
      </div>
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
        className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
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
        className={`screenshot-modal-content ${isClosing ? "closing" : ""}${activeView === "mobile" ? " screenshot-modal-mobile" : ""}`}
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
        <Image
          src={currentUrl}
          alt={`${activeView === "mobile" ? "Mobile" : "Desktop"} screenshot of ${pageUrl}`}
          width={activeView === "mobile" ? 390 : 1440}
          height={activeView === "mobile" ? 844 : 900}
          priority
          sizes="(max-width: 768px) 100vw, 80vw"
          className="w-full rounded-b-[20px]"
          style={{ height: "auto" }}
        />
      </div>
    </div>
  );
}

// --- Page ---

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const previewLoading = searchParams.get("preview") === "loading";
  const [isCachedResult] = useState(() => searchParams.get("cached") === "1");

  // Use SWR hook for analysis fetching with automatic polling
  const { data: analysis, error: analysisError, isLoading } = useAnalysis(id);
  const error = analysisError?.message || "";

  const [progress, setProgress] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [exampleIndex, setExampleIndex] = useState(0);
  const loadingStartTime = useRef(0);
  const hasTrackedCompletion = useRef(false);
  const hasTrackedView = useRef(false);
  const [showScreenshot, setShowScreenshot] = useState<false | "desktop" | "mobile">(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [submittedClaimAnalysisId, setSubmittedClaimAnalysisId] = useState<string | null>(null);
  const [claimEmailSent, setClaimEmailSent] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const claimModalType: ClaimModalType = searchParams.get("already_claimed") === "true"
    ? "already_claimed"
    : null;

  // Tracked suggestions: null = not loaded yet, [] = loaded but empty
  const [trackedSuggestions, setTrackedSuggestions] = useState<TrackedSuggestion[] | null>(null);

  // Fetch tracked suggestions when analysis loads with a page context
  useEffect(() => {
    if (!analysis?.page_context?.page_id || analysis.status !== "complete") return;
    const pageId = analysis.page_context.page_id;
    fetch(`/api/suggestions?page_id=${pageId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.suggestions) {
          setTrackedSuggestions(data.suggestions);
        } else {
          // Fetch failed or returned no data — stay null so ephemeral fallback applies
        }
      })
      .catch(() => {});
  }, [analysis?.page_context?.page_id, analysis?.status]);

  const handleSuggestionAction = useCallback(async (suggestionId: string, status: "addressed" | "dismissed") => {
    const res = await fetch(`/api/suggestions/${suggestionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update suggestion: ${res.status}`);
    }
    setTrackedSuggestions((prev) => (prev ?? []).filter((s) => s.id !== suggestionId));
  }, []);

  // Reset tracking refs when navigating between analyses
  useEffect(() => {
    hasTrackedCompletion.current = false;
    hasTrackedView.current = false;
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

  // Strip ?cached=1 param after capturing it in state
  useEffect(() => {
    if (isCachedResult) {
      const url = new URL(window.location.href);
      url.searchParams.delete("cached");
      window.history.replaceState({}, "", url.toString());
    }
  }, [isCachedResult]);

  const handleClaimModalClose = () => {
    if (claimModalType !== "already_claimed") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("already_claimed");
    window.history.replaceState({}, "", url.toString());
  };

  const handleClaimEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimEmail || !analysis || claimLoading || submittedClaimAnalysisId === analysis.id) return;
    setSubmittedClaimAnalysisId(analysis.id);
    setClaimLoading(true);
    setClaimError("");
    track("page_claim_attempted", { domain: getDomain(analysis.url), url: analysis.url });
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
        // Link anonymous PostHog identity to authenticated user
        const data = await res.json();
        if (data.userId) identify(data.userId, { email: claimEmail.trim() });
      } else {
        const data = await res.json();
        console.error("Claim link error:", data.error);
        if (res.status === 409) {
          setClaimError("This page is already being tracked by another account.");
        } else if (data.upgrade) {
          setClaimError("Page limit reached. Upgrade to track more pages.");
        } else {
          setClaimError("Something went wrong. Try again.");
        }
        setSubmittedClaimAnalysisId(null);
      }
    } catch {
      setClaimError("Network error. Try again.");
      setSubmittedClaimAnalysisId(null);
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

      // Dedup audit_completed per analysis per session (prevents inflation from re-visits)
      const dedupKey = `loupe_audit_tracked_${analysis.id}`;
      if (!sessionStorage.getItem(dedupKey)) {
        sessionStorage.setItem(dedupKey, "1");
        track("audit_completed", {
          domain: getDomain(analysis.url),
          url: analysis.url,
          findings_count: analysis.structured_output.findingsCount ?? 0,
          impact_range: analysis.structured_output.projectedImpactRange ?? "0%",
        });
      }

      // Auto-handle email typed during loading screen
      const email = claimEmail.trim();
      if (email && !claimEmailSent && submittedClaimAnalysisId !== analysis.id) {
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
        if (isValid) {
          // Valid email — auto-submit claim link
          track("page_claim_attempted", { domain: getDomain(analysis.url), url: analysis.url });
          fetch("/api/auth/claim-link", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, analysisId: analysis.id }),
          }).then((res) => {
            if (res.ok) {
              setClaimEmailSent(true);
              setSubmittedClaimAnalysisId(analysis.id);
              // Link anonymous PostHog identity to authenticated user
              return res.json();
            } else {
              // Claim failed — save as lead so email isn't lost
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
          }).then((data) => {
            if (data?.userId) identify(data.userId, { email });
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
  }, [analysis?.status, analysis?.structured_output, analysis?.id, analysis?.url, claimEmail, claimEmailSent, submittedClaimAnalysisId]);

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
        setExampleIndex((s) => (s + 1) % OUTCOME_EXAMPLES.length);
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
    return <ChronicleSkeleton />;
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
                  {OUTCOME_EXAMPLES.map((example, i) => (
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
                  <span className="font-medium text-text-primary">You&apos;re tracking this page</span>
                </div>
                <p className="text-sm text-text-muted">Check your email to sign in to your dashboard.</p>
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
                    {claimLoading ? "..." : "Watch for results"}
                  </button>
                </form>
                {claimError && (
                  <p className="text-xs text-score-low mt-2 text-center">{claimError}</p>
                )}
                <p className="text-xs text-text-muted text-center mt-4">
                  Free for one page. No credit card.
                </p>

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
  const showClaimCTAs = !analysis.claim_status?.claimed_by_current_user && !analysis.claim_status?.is_claimed;

  // Findings counts for scan-1 dossier sidebar
  const findingsCounts = s.findings ? {
    high: s.findings.filter((f: Finding) => f.impact === "high").length,
    medium: s.findings.filter((f: Finding) => f.impact === "medium").length,
    low: s.findings.filter((f: Finding) => f.impact === "low").length,
  } : { high: 0, medium: 0, low: 0 };

  return (
    <main className="min-h-screen text-text-primary">
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10">
        {/* Page context breadcrumb — shown when analysis belongs to a registered page */}
        {pageCtx && (
          <div className="analysis-context-shell pt-4 pb-0">
            <nav className="analysis-context-breadcrumb">
              <Link href="/dashboard">Your pages</Link>
              <span>/</span>
              <span>{getPageLabel(analysis.url)}</span>
            </nav>
          </div>
        )}

        {/* Two-way layout: Chronicle (scan 2+) | Dossier (all scan 1) */}
        {isChronicle ? (
          <ChronicleLayout
            changesSummary={analysis.changes_summary as ChangesSummary}
            deployContext={analysis.deploy_context}
            baselineDate={pageCtx?.baseline_date}
            triggerType={analysis.trigger_type}
            screenshotUrl={analysis.screenshot_url}
            mobileScreenshotUrl={analysis.mobile_screenshot_url}
            pageUrl={analysis.url}
            createdAt={analysis.created_at}
            onViewFullScreenshot={(view) => setShowScreenshot(view || "desktop")}
            scanNumber={pageCtx?.scan_number}
            totalScans={pageCtx?.total_scans}
            pageId={pageCtx?.page_id}
            currentAnalysisId={analysis.id}
            hypothesisMap={pageCtx?.hypothesis_map}
            feedbackMap={pageCtx?.feedback_map}
            checkpointMap={pageCtx?.checkpoint_map}
            trackedSuggestions={trackedSuggestions ?? undefined}
            onSuggestionAddress={(id) => handleSuggestionAction(id, "addressed")}
            onSuggestionDismiss={(id) => handleSuggestionAction(id, "dismissed")}
            maxHorizonDays={pageCtx?.max_horizon_days}
          />
        ) : (
          /* Scan 1 (claimed or unclaimed) — dossier layout */
          <div className="dossier-layout">
            {/* Mobile: sidebar as top card */}
            <div className="md:hidden">
              <DossierSidebar
                screenshotUrl={analysis.screenshot_url}
                mobileScreenshotUrl={analysis.mobile_screenshot_url}
                pageUrl={analysis.url}
                baselineDate={pageCtx?.baseline_date}
                metricFocus={null}
                scanNumber={1}
                totalScans={pageCtx?.total_scans || 1}
                progress={{ validated: 0, watching: 0, open: 0 }}
                onViewFullScreenshot={(view) => setShowScreenshot(view || "desktop")}
                findingsCounts={findingsCounts}
                auditSummary={s.summary}
                cachedAt={isCachedResult && !analysis.claim_status?.is_claimed ? analysis.created_at : null}
                claimCTA={showClaimCTAs ? {
                  email: claimEmail,
                  onEmailChange: setClaimEmail,
                  onSubmit: handleClaimEmail,
                  loading: claimLoading,
                  sent: claimEmailSent,
                  error: claimError,
                } : undefined}
                mobile
              />
            </div>

            {/* Desktop: sticky sidebar */}
            <aside className="dossier-sidebar hidden md:block">
              <DossierSidebar
                screenshotUrl={analysis.screenshot_url}
                mobileScreenshotUrl={analysis.mobile_screenshot_url}
                pageUrl={analysis.url}
                baselineDate={pageCtx?.baseline_date}
                metricFocus={null}
                scanNumber={1}
                totalScans={pageCtx?.total_scans || 1}
                progress={{ validated: 0, watching: 0, open: 0 }}
                onViewFullScreenshot={(view) => setShowScreenshot(view || "desktop")}
                findingsCounts={findingsCounts}
                auditSummary={s.summary}
                cachedAt={isCachedResult && !analysis.claim_status?.is_claimed ? analysis.created_at : null}
                claimCTA={showClaimCTAs ? {
                  email: claimEmail,
                  onEmailChange: setClaimEmail,
                  onSubmit: handleClaimEmail,
                  loading: claimLoading,
                  sent: claimEmailSent,
                  error: claimError,
                } : undefined}
              />
            </aside>

            {/* Feed: scan-1 content */}
            <div className="dossier-feed">
              {/* Verdict */}
              <section className="dossier-verdict-section">
                <VerdictDisplay verdict={s.verdict} verdictContext={s.verdictContext} />
                <p className="text-base text-text-primary mt-4">
                  <span className="text-accent font-semibold">+{s.projectedImpactRange}</span>
                  {" "}potential
                  <span className="text-text-muted mx-2">·</span>
                  <span className="font-bold">{s.findingsCount}</span>
                  {" "}opportunit{s.findingsCount !== 1 ? "ies" : "y"}
                </p>
              </section>

              {/* Headline Rewrite */}
              {s.headlineRewrite && (
                <>
                  <hr className="section-divider" />
                  <HeadlineRewriteSection
                    headlineRewrite={s.headlineRewrite as {
                      current: string;
                      suggested: string;
                      currentAnnotation?: string;
                      suggestedAnnotation?: string;
                      reasoning?: string;
                    }}
                  />
                </>
              )}

              {/* Findings */}
              {s.findings && s.findings.length > 0 && (
                <>
                  <hr className="section-divider" />
                  <FindingsSection findings={s.findings} analysisId={analysis.id} domain={getDomain(analysis.url)} showCheckpointPreview={showClaimCTAs} />
                </>
              )}

              {/* Post-signup preview — replaces bottom line for unclaimed pages */}
              {showClaimCTAs && s.findings && s.findings.length > 0 ? (
                <>
                  <hr className="section-divider" />
                  <section className="next-proof-section">
                    <div className="next-proof-header">
                      <span
                        className="next-proof-badge"
                        style={{ background: 'var(--blue-subtle)', color: 'var(--blue)' }}
                      >
                        What you get after signup
                      </span>
                    </div>

                    <h2
                      className="next-proof-headline"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      Turn {s.findingsCount} prediction{s.findingsCount !== 1 ? 's' : ''} into evidence.
                    </h2>

                    <p className="next-proof-sub">
                      Ship a change, then Loupe re-scans and checks your metrics so you can see what actually&nbsp;moved.
                    </p>

                    <div className="next-proof-grid">
                      <div className="next-proof-panel">
                        <p className="next-proof-panel-label">Verification timeline</p>
                        <div className="whats-next-timeline">
                          <div className="whats-next-timeline-track">
                            <div className="whats-next-marker whats-next-marker-today">
                              <div className="whats-next-marker-dot whats-next-marker-dot-active" />
                              <span className="whats-next-marker-label">Today</span>
                              <span className="whats-next-marker-desc">Audit complete</span>
                            </div>
                            {[
                              { day: 7, label: 'D+7', desc: 'First signal' },
                              { day: 14, label: 'D+14', desc: 'Pattern' },
                              { day: 30, label: 'D+30', desc: 'Verdict' },
                            ].map((h) => (
                              <div key={h.day} className="whats-next-marker whats-next-marker-future">
                                <div className="whats-next-marker-dot" />
                                <span className="whats-next-marker-label">{h.label}</span>
                                <span className="whats-next-marker-desc">{h.desc}</span>
                              </div>
                            ))}
                          </div>
                          <div className="whats-next-timeline-line" />
                        </div>
                        <p className="next-proof-panel-copy">
                          Day 7 gives early direction, day 14 shows trend, day 30 gives a stronger read.
                        </p>
                      </div>

                      <div className="next-proof-panel">
                        <p className="next-proof-panel-label">Example tracked outcome</p>
                        <div className="outcome-preview-card outcome-preview-card-embedded">
                          <div className="outcome-preview-accent" />
                          <div className="outcome-preview-body">
                            <div className="outcome-preview-header">
                              <span className="outcome-preview-element">
                                {s.findings[0]?.element ?? 'Headline'}
                              </span>
                              <div className="outcome-preview-chips">
                                <span className="dossier-chip dossier-chip-emerald">7d</span>
                                <span className="dossier-chip dossier-chip-emerald">14d</span>
                                <span className="dossier-chip dossier-chip-emerald">30d</span>
                              </div>
                            </div>

                            <div className="outcome-preview-diff">
                              <span className="outcome-preview-before">
                                &ldquo;{(s.findings[0]?.currentValue ?? '').length > 60
                                  ? s.findings[0].currentValue.slice(0, 60).trim() + '...'
                                  : s.findings[0]?.currentValue}&rdquo;
                              </span>
                              <span className="outcome-preview-arrow">&rarr;</span>
                              <span className="outcome-preview-after">
                                &ldquo;{(s.findings[0]?.suggestion ?? '').length > 60
                                  ? s.findings[0].suggestion.slice(0, 60).trim() + '...'
                                  : s.findings[0]?.suggestion}&rdquo;
                              </span>
                            </div>

                            <div className="outcome-preview-evidence">
                              <span className="outcome-preview-evidence-label">View evidence</span>
                              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                              </svg>
                            </div>
                          </div>
                        </div>
                        <p className="next-proof-panel-copy">
                          Preview using your top finding. Actual outcomes use your real metrics.
                        </p>
                      </div>
                    </div>
                  </section>
                </>
              ) : s.summary ? (
                <>
                  <hr className="section-divider" />
                  <section className="bottom-line-section">
                    <p className="bottom-line-label">The bottom line</p>
                    <blockquote className="bottom-line-quote">
                      <span className="bottom-line-mark" aria-hidden="true">&ldquo;</span>
                      <p className="bottom-line-text">{s.summary}</p>
                    </blockquote>
                  </section>
                </>
              ) : null}
            </div>
          </div>
        )}

      </div>
      {/* END max-w container — CTA is full-bleed */}

      {/* Zone 6: Claim CTA — not shown when current user owns this page */}
      {!analysis.claim_status?.claimed_by_current_user && (
        <section id="claim-cta" className="claim-bottom-section">
          <div className="claim-bottom-inner">
            {analysis.claim_status?.is_claimed ? (
              /* Domain already claimed by another user */
              <div className="claim-bottom-claimed">
                <div className="claim-bottom-claimed-icon">
                  <svg className="w-6 h-6 text-ink-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <p
                  className="text-2xl font-bold text-ink-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Already being monitored
                </p>
                <p className="text-base text-ink-500 mt-2">
                  Someone else is watching {getDomain(analysis.url)}. You can still view this audit and share it.
                </p>
              </div>
            ) : claimEmailSent ? (
              /* Post-submit state */
              <div className="claim-bottom-sent">
                <div className="claim-bottom-sent-icon">
                  <svg className="w-6 h-6" style={{ color: "var(--coral)" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p
                  className="text-2xl font-bold text-ink-900"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  You&apos;re tracking this page
                </p>
                <p className="text-base text-ink-500 mt-2">
                  We&apos;ll email you when something changes. Check your inbox to sign in to your dashboard.
                </p>
              </div>
            ) : (
              /* Claim form — two-column on desktop */
              <div className="claim-bottom-grid">
                {/* Left: headline + subhead */}
                <div>
                  <p className="claim-bottom-label">Track your predictions</p>
                  <h2
                    className="claim-bottom-headline"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {s.findings && s.findings.length > 0
                      ? <>You&apos;re about to fix &ldquo;{s.findings[0].title}&rdquo;. Will you know if it&nbsp;worked?</>
                      : "Something on this page will change. You should know when it does."}
                  </h2>
                  <p className="claim-bottom-sub">
                    Loupe re-scans after every deploy and checks your metrics at 7, 14, and 30 days.
                  </p>
                  <div className="claim-bottom-badges">
                    <span className="claim-bottom-badge claim-bottom-badge-blue">Change detection</span>
                    <span className="claim-bottom-badge claim-bottom-badge-emerald">Metric correlation</span>
                    <span className="claim-bottom-badge claim-bottom-badge-violet">Free for one page</span>
                  </div>
                </div>

                {/* Right: form */}
                <div>
                  <form onSubmit={handleClaimEmail} className="claim-bottom-form">
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={claimEmail}
                      onChange={(e) => setClaimEmail(e.target.value)}
                      aria-label="Email address"
                      required
                    />
                    <button
                      type="submit"
                      disabled={claimLoading}
                      className="btn-primary w-full"
                    >
                      {claimLoading ? "Sending..." : "Start watching"}
                    </button>
                  </form>

                  {claimError && (
                    <p className="text-sm text-score-low mt-2">{claimError}</p>
                  )}

                  {!claimError && (
                    <p className="claim-bottom-trust">
                      Free for one page · No credit card
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Share actions */}
            <div className="claim-bottom-actions">
              <button onClick={handleShareLink}>
                {linkCopied ? "Copied!" : "Copy link"}
              </button>
              <span className="claim-bottom-sep">·</span>
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(
                  `"${s.verdict}"\n\nGot this from my @getloupe audit:`
                )}&url=${encodeURIComponent(typeof window !== "undefined" ? window.location.href : `https://getloupe.io/analysis/${id}`)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Post on X
              </a>
              <span className="claim-bottom-sep">·</span>
              <PdfDownloadButton
                analysis={{
                  id: analysis.id,
                  url: analysis.url,
                  created_at: analysis.created_at,
                  structured_output: s,
                }}
              />
              <span className="claim-bottom-sep">·</span>
              <Link href="/">New audit</Link>
            </div>
          </div>
        </section>
      )}

      {/* Sticky claim bar — persistent bottom reminder */}
      {showClaimCTAs && !isChronicle && (
        <StickyClaimBar
          domain={getDomain(analysis.url)}
          findingsCount={s.findingsCount ?? 0}
          impactRange={s.projectedImpactRange || "0%"}
          email={claimEmail}
          onEmailChange={setClaimEmail}
          onSubmit={handleClaimEmail}
          loading={claimLoading}
          sent={claimEmailSent}
        />
      )}

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
        onClose={handleClaimModalClose}
        domain={getDomain(analysis.url)}
        onShare={handleShareLink}
      />
    </main>
  );
}
