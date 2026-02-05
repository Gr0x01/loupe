"use client";

import { useEffect, useState, useCallback, useRef, useId, useMemo } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type {
  FindingEvaluation,
  PageContext,
  DeployContextAPI,
  MetricsSnapshot,
  ClaimStatus,
  AnalysisResult,
  ChangesSummary,
  Finding,
  ElementType,
} from "@/lib/types/analysis";
import { ChronicleLayout } from "@/components/chronicle";

// Type guard for new analysis format (Phase 2.1+)
function isNewAnalysisFormat(s: unknown): s is AnalysisResult["structured"] {
  return (
    typeof s === "object" &&
    s !== null &&
    "findingsCount" in s &&
    "verdict" in s &&
    "projectedImpactRange" in s
  );
}

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

// Legacy structured output format (pre-Phase 2.1)
interface LegacyStructuredOutput {
  overallScore?: number;
  whatsWorking?: string[];
  whatsNot?: string[];
  topActions?: Array<{ title: string; description: string; tag?: string }>;
  categories?: Array<{
    name: string;
    score: number;
    findings: Array<{
      type: "issue" | "suggestion" | "strength";
      title: string;
      description: string;
      fix?: string;
      element?: string;
      methodology?: string;
    }>;
  }>;
  headlineRewrite?: {
    current: string;
    suggested: string;
    reasoning?: string;
    currentAnnotation?: string;
    suggestedAnnotation?: string;
  };
}

// Combined type for structured output (supports both old and new formats)
type StructuredOutput = AnalysisResult["structured"] | LegacyStructuredOutput;

interface Analysis {
  id: string;
  url: string;
  status: "pending" | "processing" | "complete" | "failed";
  screenshot_url: string | null;
  structured_output: StructuredOutput | null;
  error_message: string | null;
  created_at: string;
  parent_analysis_id: string | null;
  changes_summary: ChangesSummary | null;
  parent_structured_output: StructuredOutput | null;
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

// Evaluation status configuration for the 5 states
const EVALUATION_CONFIG = {
  resolved: {
    label: "Resolved",
    iconClass: "evaluation-icon-resolved",
    badgeClass: "evaluation-badge-resolved",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
      </svg>
    ),
    color: "var(--score-high)",
  },
  improved: {
    label: "Improved",
    iconClass: "evaluation-icon-improved",
    badgeClass: "evaluation-badge-improved",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12l4-4 4-4" />
        <path d="M4 12h8" />
      </svg>
    ),
    color: "var(--score-mid)",
  },
  unchanged: {
    label: "Unchanged",
    iconClass: "evaluation-icon-unchanged",
    badgeClass: "evaluation-badge-unchanged",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="8" x2="13" y2="8" />
      </svg>
    ),
    color: "#8E8EA0",
  },
  regressed: {
    label: "Regressed",
    iconClass: "evaluation-icon-regressed",
    badgeClass: "evaluation-badge-regressed",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 4l-4 4-4 4" />
        <path d="M12 4H4" />
      </svg>
    ),
    color: "var(--score-low)",
  },
  new: {
    label: "New",
    iconClass: "evaluation-icon-new",
    badgeClass: "evaluation-badge-new",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="3" x2="8" y2="13" />
        <line x1="3" y1="8" x2="13" y2="8" />
      </svg>
    ),
    color: "var(--score-low)",
  },
  // Legacy status mapping
  persists: {
    label: "Unchanged",
    iconClass: "evaluation-icon-unchanged",
    badgeClass: "evaluation-badge-unchanged",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="3" y1="8" x2="13" y2="8" />
      </svg>
    ),
    color: "#8E8EA0",
  },
} as const;

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

// Legacy format helpers
type LegacyAction = { title: string; description: string; tag?: string };

function getTopActionsHeader(score: number): { title: string; subtitle: string } | null {
  if (score >= 80) return { title: "Fine-tuning opportunities", subtitle: "Small tweaks for marginal gains." };
  if (score >= 60) return { title: "Where you're losing visitors", subtitle: "Ranked by conversion impact. Start at the top." };
  return { title: "Critical issues to fix", subtitle: "These problems are likely costing you conversions." };
}

function getActionText(action: LegacyAction | undefined): string {
  if (!action) return "";
  return action.title || action.description;
}

function getActionImpact(action: LegacyAction | undefined): string | null {
  if (!action?.tag) return null;
  return action.tag;
}

function CelebrationState({ score }: { score: number }) {
  return (
    <section className="result-section text-center">
      <h2 className="text-3xl font-bold text-text-primary mb-4" style={{ fontFamily: "var(--font-instrument-serif)" }}>
        Excellent work!
      </h2>
      <p className="text-lg text-text-secondary">
        Your page scored {score}. There are no major issues to address.
      </p>
    </section>
  );
}

function TopActionsExpandable({ actions, score }: { actions: LegacyAction[]; score: number }) {
  const header = getTopActionsHeader(score);
  return (
    <section className="result-section">
      <div className="section-header">
        <div>
          <h2 className="text-4xl font-bold text-text-primary" style={{ fontFamily: "var(--font-instrument-serif)" }}>
            {header?.title || "Actions to take"}
          </h2>
          <p className="text-sm text-text-muted mt-1">{header?.subtitle}</p>
        </div>
      </div>
      <ul className="space-y-4">
        {actions.map((action, i) => (
          <li key={i} className="glass-card p-4 flex items-start gap-4">
            <span className="text-2xl font-bold text-[rgba(91,46,145,0.2)]" style={{ fontFamily: "var(--font-instrument-serif)" }}>{i + 1}</span>
            <div>
              <p className="text-lg text-text-primary font-semibold">{action.title}</p>
              {action.description && <p className="text-sm text-text-secondary mt-1">{action.description}</p>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function scoreColor(score: number): string {
  if (score >= 80) return "text-score-high";
  if (score >= 60) return "text-score-mid";
  return "text-score-low";
}

function scoreCssColor(score: number): string {
  if (score >= 80) return "var(--score-high)";
  if (score >= 60) return "var(--score-mid)";
  return "var(--score-low)";
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

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
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
    <div className="text-center">
      <h1
        className="hero-reveal-verdict-new text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight text-text-primary max-w-2xl mx-auto"
        style={{ fontFamily: "var(--font-instrument-serif)" }}
      >
        {verdict}
      </h1>
      {verdictContext && (
        <p className="hero-reveal-context text-base sm:text-lg text-text-secondary mt-4 max-w-xl mx-auto leading-relaxed">
          {verdictContext}
        </p>
      )}
    </div>
  );
}

function ImpactBar({ projectedImpactRange }: { projectedImpactRange: string }) {
  // Parse "15-30%" to get min/max values
  const match = projectedImpactRange.match(/(\d+)-?(\d+)?%?/);
  const minImpact = match ? parseInt(match[1], 10) : 15;
  const maxImpact = match && match[2] ? parseInt(match[2], 10) : minImpact + 15;

  // Calculate visual fill percentages (current = 100 - maxImpact, potential = range)
  const currentFill = Math.max(30, 100 - maxImpact); // At least 30% fill for visual balance
  const potentialFill = maxImpact - minImpact + minImpact; // Full potential range

  return (
    <div className="hero-reveal-impact w-full max-w-md mx-auto">
      <div className="impact-bar-track flex">
        <div
          className="impact-bar-fill"
          style={{ width: `${currentFill}%` }}
        />
        <div
          className="impact-bar-potential"
          style={{ width: `${potentialFill}%` }}
        />
      </div>
      <div className="flex justify-between mt-2 text-sm">
        <span className="text-text-muted">You now</span>
        <span className="text-accent font-semibold">
          Potential +{projectedImpactRange}
        </span>
      </div>
    </div>
  );
}

function OpportunityCount({ count }: { count: number }) {
  const displayCount = useCountUp(count);
  return (
    <p className="hero-reveal-count text-lg text-text-secondary">
      <span className="font-bold text-text-primary tabular-nums">{displayCount}</span>
      {" "}change{count !== 1 ? "s" : ""} to close the gap
    </p>
  );
}

function DomainBadge({ domain }: { domain: string }) {
  return (
    <div className="hero-reveal-badge flex items-center justify-center gap-2 text-sm text-text-muted">
      <span className="url-badge py-1.5 px-3">{domain}</span>
      <span className="text-text-muted">·</span>
      <span className="text-xs font-semibold uppercase tracking-widest">Audited by Loupe</span>
    </div>
  );
}

interface NewHeroSectionProps {
  structured: StructuredOutput;
  domain: string;
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
}

function NewHeroSection({
  structured,
  domain,
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
}: NewHeroSectionProps) {
  // Check if we have the new analysis format
  const isNew = isNewAnalysisFormat(structured);

  return (
    <section className="py-8 lg:py-12">
      <div className="glass-card-elevated mx-auto overflow-hidden">
        {/* Main content — centered vertical stack */}
        <div className="px-8 py-10 space-y-8 flex flex-col items-center">
          {isNew ? (
            <>
              {/* Verdict — the star */}
              <VerdictDisplay
                verdict={structured.verdict}
                verdictContext={structured.verdictContext}
              />

              {/* Impact bar */}
              <ImpactBar projectedImpactRange={structured.projectedImpactRange} />

              {/* Opportunity count */}
              <OpportunityCount count={structured.findingsCount} />
            </>
          ) : (
            /* Legacy hero for old analyses */
            <div className="text-center">
              <h1
                className="text-3xl md:text-4xl font-bold text-text-primary mb-4"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Audit Complete
              </h1>
              {(structured as LegacyStructuredOutput).overallScore !== undefined && (
                <p className="text-6xl font-black text-accent">
                  {(structured as LegacyStructuredOutput).overallScore}
                </p>
              )}
            </div>
          )}

          {/* Domain badge */}
          <DomainBadge domain={domain} />
        </div>

        {/* Card footer — email capture (reused from legacy) */}
        <div className="hero-reveal-actions border-t border-border-outer px-8 py-4 bg-[rgba(0,0,0,0.015)]">
          {claimStatus?.claimed_by_current_user ? (
            /* Current user already watching */
            <div className="flex items-center justify-between">
              <button onClick={onShareLink} className="text-sm text-text-muted hover:text-accent transition-colors">
                {linkCopied ? "Copied!" : "Share"}
              </button>
              <Link
                href={`/pages/${claimedPageId}`}
                className="text-sm text-accent hover:underline"
              >
                You&apos;re already watching this → View page
              </Link>
            </div>
          ) : claimStatus?.is_claimed ? (
            /* Domain claimed by someone else */
            <div className="flex items-center justify-between">
              <button onClick={onShareLink} className="text-sm text-text-muted hover:text-accent transition-colors">
                {linkCopied ? "Copied!" : "Share"}
              </button>
              <span className="text-sm text-text-muted">Already being monitored by someone else</span>
            </div>
          ) : claimEmailSent ? (
            /* Success state */
            <div className="flex items-center justify-between">
              <button onClick={onShareLink} className="text-sm text-text-muted hover:text-accent transition-colors">
                {linkCopied ? "Copied!" : "Share"}
              </button>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-score-high" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
                <span className="text-sm text-text-primary">You&apos;re in — check your inbox</span>
              </div>
            </div>
          ) : (
            /* Default state */
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                {/* Left: Share */}
                <button onClick={onShareLink} className="text-sm text-text-muted hover:text-accent transition-colors order-2 sm:order-1">
                  {linkCopied ? "Copied!" : "Share"}
                </button>

                {/* Right: hook + form */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 order-1 sm:order-2">
                  <p className="text-sm text-text-secondary">
                    We&apos;ll watch for changes →
                  </p>
                  <form onSubmit={onClaimEmail} className="flex items-stretch gap-2">
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={claimEmail}
                      onChange={(e) => setClaimEmail(e.target.value)}
                      className="input-glass text-sm py-2 w-44"
                      aria-label="Email address"
                      required
                    />
                    <button
                      type="submit"
                      disabled={claimLoading}
                      className="btn-primary text-sm py-2 px-4 whitespace-nowrap"
                    >
                      {claimLoading ? "..." : "Watch"}
                    </button>
                  </form>
                </div>
              </div>
              {claimError && <p className="text-xs text-score-low mt-2 text-right">{claimError}</p>}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// Finding Card for prediction-based format
function FindingCard({
  finding,
  expanded,
  onToggle,
}: {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
}) {
  const [suggestionCopied, setSuggestionCopied] = useState(false);
  const [assumptionOpen, setAssumptionOpen] = useState(false);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const handleCopySuggestion = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(finding.suggestion);
    setSuggestionCopied(true);
    setTimeout(() => setSuggestionCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  const impactLabel = {
    high: "HIGH IMPACT",
    medium: "MEDIUM IMPACT",
    low: "LOW IMPACT",
  }[finding.impact];

  const elementIcon = ELEMENT_ICONS[finding.elementType] || ELEMENT_ICONS.other;

  // Collapsed view shows title + prediction
  if (!expanded) {
    return (
      <div
        className="new-finding-card new-finding-card-collapsed group cursor-pointer"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={false}
        aria-label={`${finding.title}. ${finding.impact} impact. Click to expand.`}
      >
        <div className="flex items-center gap-3">
          <span className={getImpactBadgeClass(finding.impact)}>
            {finding.impact.toUpperCase()}
          </span>
          <p
            className="flex-1 text-base font-semibold text-text-primary leading-snug"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            {finding.title}
          </p>
          <div className="prediction-badge-mini">
            <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="2 12 6 8 9 11 14 4" />
              <polyline points="10 4 14 4 14 8" />
            </svg>
            <span>+{finding.prediction.range}</span>
          </div>
          <svg
            className="w-5 h-5 text-text-muted transition-transform"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="5 8 10 13 15 8" />
          </svg>
        </div>
      </div>
    );
  }

  // Expanded view
  return (
    <div className="new-finding-card new-finding-card-expanded">
      {/* Header with impact badge */}
      <div
        className="flex items-center justify-between mb-4 cursor-pointer"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={true}
        aria-label="Click to collapse finding"
      >
        <span className={getImpactBadgeClass(finding.impact)}>
          {impactLabel}
        </span>
        <svg
          className="w-5 h-5 text-text-muted rotate-180 transition-transform"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5 8 10 13 15 8" />
        </svg>
      </div>

      {/* Title */}
      <h3
        className="text-xl font-bold text-text-primary mb-5"
        style={{ fontFamily: "var(--font-instrument-serif)" }}
      >
        {finding.title}
      </h3>

      {/* Current value block */}
      <div className="new-finding-current mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="new-finding-element-icon">{elementIcon}</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Current</span>
        </div>
        <p className="text-base text-text-secondary leading-relaxed">
          &ldquo;{finding.currentValue}&rdquo;
        </p>
      </div>

      {/* Suggestion block */}
      <div className="new-finding-suggestion mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-accent uppercase tracking-wide">Suggestion</span>
          <button
            onClick={handleCopySuggestion}
            className="new-finding-copy-btn"
            title={suggestionCopied ? "Copied!" : "Copy suggestion"}
            aria-label={suggestionCopied ? "Copied to clipboard" : "Copy suggestion to clipboard"}
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
        <p
          className="text-base font-semibold text-text-primary leading-relaxed"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          &ldquo;{finding.suggestion}&rdquo;
        </p>
      </div>

      {/* Prediction line */}
      <div className="prediction-badge mb-5">
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="2 12 6 8 9 11 14 4" />
          <polyline points="10 4 14 4 14 8" />
        </svg>
        <span className="font-bold">+{finding.prediction.range}</span>
        <span className="text-text-secondary">{finding.prediction.friendlyText}</span>
      </div>

      {/* Expandable sections */}
      <div className="flex items-center gap-3 pt-3 border-t border-border-outer">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAssumptionOpen(!assumptionOpen);
          }}
          className="new-finding-toggle-btn"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${assumptionOpen ? "rotate-180" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
          Why this matters
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setMethodologyOpen(!methodologyOpen);
          }}
          className="new-finding-toggle-btn"
        >
          <svg
            className={`w-3.5 h-3.5 transition-transform ${methodologyOpen ? "rotate-180" : ""}`}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="4 6 8 10 12 6" />
          </svg>
          Methodology
        </button>
      </div>

      {/* Assumption expanded content */}
      {assumptionOpen && (
        <div className="mt-3 p-3 bg-[rgba(0,0,0,0.02)] rounded-lg">
          <p className="text-sm text-text-secondary leading-relaxed">{finding.assumption}</p>
        </div>
      )}

      {/* Methodology expanded content */}
      {methodologyOpen && (
        <div className="mt-3 p-3 bg-[rgba(0,0,0,0.02)] rounded-lg">
          <p className="text-sm text-text-secondary leading-relaxed">{finding.methodology}</p>
        </div>
      )}
    </div>
  );
}

// Findings Section for new format
function FindingsSection({ findings }: { findings: Finding[] }) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    // First finding expanded by default
    new Set(findings[0] ? [findings[0].id] : [])
  );

  const toggleFinding = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (findings.length === 0) return null;

  return (
    <section className="result-section">
      <div className="section-header">
        <div>
          <h2
            className="text-4xl font-bold text-text-primary"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            What to fix
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Ranked by conversion impact. Start at the top.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {findings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            expanded={expandedIds.has(finding.id)}
            onToggle={() => toggleFinding(finding.id)}
          />
        ))}
      </div>
    </section>
  );
}

// Evaluation Card for the "What Changed" section
function EvaluationCard({
  evaluation,
  expanded,
  onToggle,
  deployContext,
}: {
  evaluation: FindingEvaluation;
  expanded: boolean;
  onToggle: () => void;
  deployContext?: DeployContextAPI | null;
}) {
  const config = EVALUATION_CONFIG[evaluation.evaluation];

  // Check if any changed files might correlate with this finding's element
  const correlatedFile = deployContext?.changed_files.find(file => {
    const element = evaluation.element.toLowerCase();
    const fileName = file.toLowerCase();
    // Simple heuristic: check if the element name appears in the file path
    return fileName.includes(element.replace(/\s+/g, '')) ||
           element.includes(fileName.split('/').pop()?.replace(/\.(tsx?|jsx?)$/, '') || '');
  });

  return (
    <div
      className="evaluation-card group"
      onClick={onToggle}
    >
      {/* Header — always visible */}
      <div className="flex items-start gap-3 p-4">
        <span className={`evaluation-icon ${config.iconClass}`}>
          {config.icon}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p
              className="text-[1.0625rem] font-semibold text-text-primary leading-snug"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              {evaluation.title}
            </p>
            <span className={`evaluation-badge ${config.badgeClass}`}>
              {config.label}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="element-badge">{evaluation.element}</span>
            {correlatedFile && (
              <span className="element-badge text-accent border-accent-border">
                {correlatedFile.split('/').pop()}
              </span>
            )}
          </div>
        </div>
        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-text-muted transition-transform duration-200 flex-shrink-0 ${expanded ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="5 8 10 13 15 8" />
        </svg>
      </div>

      {/* Expandable content */}
      <div
        className={`overflow-hidden transition-all duration-200 ease-out ${
          expanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-border-outer mt-2">
          {/* Quality assessment — the key insight */}
          {evaluation.quality_assessment && (
            <div className="pt-3">
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
                Assessment
              </p>
              <p
                className="text-[0.9375rem] text-text-primary leading-relaxed"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                {evaluation.quality_assessment}
              </p>
            </div>
          )}
          {/* Detail */}
          {evaluation.detail && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
                Detail
              </p>
              <p className="text-[0.875rem] text-text-secondary leading-relaxed">
                {evaluation.detail}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Segmented Progress Bar component
function SegmentedProgressBar({
  progress,
}: {
  progress: ChangesSummary["progress"];
}) {
  const total = (progress.validated || 0) + (progress.watching || 0) + (progress.open || 0) || 1;

  // Calculate percentages for each segment
  const validated = progress.validated || 0;
  const watching = progress.watching || 0;
  const open = progress.open || 0;

  const validatedPct = (validated / total) * 100;
  const watchingPct = (watching / total) * 100;
  const openPct = (open / total) * 100;

  // Build segments array (only include non-zero segments)
  const segments: { color: string; pct: number; label: string; count: number }[] = [];
  if (validated > 0) segments.push({ color: "var(--score-high)", pct: validatedPct, label: "validated", count: validated });
  if (watching > 0) segments.push({ color: "var(--score-mid)", pct: watchingPct, label: "watching", count: watching });
  if (open > 0) segments.push({ color: "#8E8EA0", pct: openPct, label: "open", count: open });

  return (
    <div>
      {/* Segmented bar */}
      <div className="progress-segmented">
        {segments.map((seg) => (
          <div
            key={seg.label}
            className="progress-segment"
            style={{
              width: `${seg.pct}%`,
              backgroundColor: seg.color,
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="progress-legend">
        {segments.map((seg) => (
          <span key={seg.label} className="progress-legend-item">
            <span className="progress-legend-dot" style={{ backgroundColor: seg.color }} />
            <span className="font-semibold">{seg.count}</span> {seg.label}
          </span>
        ))}
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
  const [isClosing, setIsClosing] = useState(false);

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

  return (
    <div
      className={`screenshot-modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleClose}
    >
      <div
        className={`screenshot-modal-content ${isClosing ? "closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="browser-chrome flex items-center justify-between sticky top-0 rounded-t-[20px]">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="browser-dot" />
              <div className="browser-dot" />
              <div className="browser-dot" />
            </div>
            <span className="text-xs text-text-muted font-mono ml-2 truncate">
              {getDomain(pageUrl)}
            </span>
          </div>
          <button
            onClick={handleClose}
            className="text-text-muted hover:text-text-primary transition-colors text-sm font-medium"
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewLoading = searchParams.get("preview") === "loading";
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimEmailSent, setClaimEmailSent] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [deployExpanded, setDeployExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<number>>(new Set());
  const [foundingStatus, setFoundingStatus] = useState<{
    claimed: number;
    total: number;
    remaining: number;
    isFull: boolean;
  } | null>(null);

  // Set default active category when analysis loads (legacy format)
  useEffect(() => {
    if (analysis?.structured_output && !activeCategory) {
      const legacy = analysis.structured_output as LegacyStructuredOutput;
      if (legacy.categories && legacy.categories.length > 0) {
        setActiveCategory(legacy.categories[0].name);
      }
    }
  }, [analysis, activeCategory]);

  // Toggle functions for legacy findings and evaluations
  const toggleFinding = useCallback((findingId: string) => {
    setExpandedFindings((prev) => {
      const next = new Set(prev);
      if (next.has(findingId)) {
        next.delete(findingId);
      } else {
        next.add(findingId);
      }
      return next;
    });
  }, []);

  const toggleEvaluation = useCallback((index: number) => {
    setExpandedEvaluations((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  // Derive active category findings for legacy format
  const activeCatFindings = useMemo(() => {
    if (!analysis?.structured_output || !activeCategory) return [];
    const legacy = analysis.structured_output as LegacyStructuredOutput;
    const cat = legacy.categories?.find((c) => c.name === activeCategory);
    if (!cat) return [];
    // Sort findings by type priority (issues first, then suggestions, then strengths)
    return [...cat.findings].sort((a, b) => {
      const priority = { issue: 0, suggestion: 1, strength: 2 };
      return (priority[a.type] ?? 3) - (priority[b.type] ?? 3);
    });
  }, [analysis, activeCategory]);

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
    if (!claimEmail || !analysis) return;
    setClaimLoading(true);
    setClaimError("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: claimEmail.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?claim=${analysis.id}`,
        },
      });
      if (!error) {
        setClaimEmailSent(true);
      } else {
        console.error("Magic link error:", error.message);
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
    setTimeout(() => setLinkCopied(false), 2000);
  };

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
      }
    }
    poll();
    interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [fetchAnalysis]);

  // Loading step cycle (cycles through analysis stages)
  useEffect(() => {
    if (
      previewLoading ||
      analysis?.status === "pending" ||
      analysis?.status === "processing"
    ) {
      const timer = setInterval(() => {
        setLoadingStep((s) => (s + 1) % ANALYSIS_STAGES.length);
      }, 3500);
      return () => clearInterval(timer);
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

  if (
    previewLoading ||
    !analysis ||
    analysis.status === "pending" ||
    analysis.status === "processing"
  ) {
    const currentStageIndex = loadingStep % ANALYSIS_STAGES.length;

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
              <div className="flex gap-1.5 w-full max-w-[200px] mx-auto mb-2">
                {ANALYSIS_STAGES.map((stage, i) => (
                  <div
                    key={stage.id}
                    className="h-1.5 flex-1 rounded-full bg-bg-inset overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        i < currentStageIndex
                          ? "w-full bg-accent"
                          : i === currentStageIndex
                          ? "w-1/2 bg-accent animate-pulse"
                          : "w-0"
                      }`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-base text-text-secondary">
                {ANALYSIS_STAGES[currentStageIndex].label}...
              </p>
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
                <p className="text-sm text-text-primary font-medium leading-snug transition-opacity duration-300">
                  &ldquo;{DRIFT_EXAMPLES[loadingStep % DRIFT_EXAMPLES.length]}&rdquo;
                </p>
              </div>
            </div>

            {/* Value prop + Email capture */}
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
                <p
                  className="text-xl font-bold text-text-primary text-center mb-1"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  We just captured your page
                </p>
                <p className="text-base text-text-secondary text-center mb-5">
                  We&apos;ll email you when something shifts.
                </p>

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

                {foundingStatus && !foundingStatus.isFull && (
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
  const isChronicle = analysis.changes_summary && isChronicleFormat(analysis.changes_summary);
  // Boolean check without type narrowing (to preserve legacy s type in !isNewFormat branches)
  const isNewFormat = Boolean(s && "findingsCount" in s && "verdict" in s && "projectedImpactRange" in s);

  const pageCtx = analysis.page_context;

  return (
    <main className="min-h-screen text-text-primary">
      <div className="max-w-[1080px] mx-auto px-6 lg:px-10">
        {/* Page context banner — shown when analysis belongs to a registered page */}
        {pageCtx && (
          <div className="pt-6 pb-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Link
                  href={`/pages/${pageCtx.page_id}`}
                  className="text-sm text-text-muted hover:text-accent transition-colors flex items-center gap-1.5"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M13 15l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {pageCtx.page_name || getDomain(analysis.url)}
                </Link>
                <span className="text-text-muted">/</span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-text-primary">
                    Scan #{pageCtx.scan_number}
                  </span>
                  {/* Trigger type indicator */}
                  {analysis.deploy_context ? (
                    <button
                      onClick={() => setDeployExpanded(!deployExpanded)}
                      className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent transition-colors mt-0.5"
                    >
                      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="8" r="3" />
                        <path d="M8 1v4M8 11v4M1 8h4M11 8h4" strokeLinecap="round" />
                      </svg>
                      <span>Triggered by deploy</span>
                      <span className="font-mono text-text-secondary">{analysis.deploy_context.commit_sha.slice(0, 7)}</span>
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
                  ) : analysis.trigger_type && analysis.trigger_type !== "manual" ? (
                    <span className="flex items-center gap-1.5 text-xs text-text-muted mt-0.5">
                      <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="8" cy="8" r="6" />
                        <path d="M8 4v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span>
                        {analysis.trigger_type === "daily" && "Daily scan"}
                        {analysis.trigger_type === "weekly" && "Weekly scan"}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Prev/Next navigation */}
              <div className="flex items-center gap-2">
                {pageCtx.prev_analysis_id ? (
                  <Link
                    href={`/analysis/${pageCtx.prev_analysis_id}`}
                    className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M13 15l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Prev
                  </Link>
                ) : (
                  <span className="text-sm text-text-muted py-1.5 px-3 opacity-50">Prev</span>
                )}
                {pageCtx.next_analysis_id ? (
                  <Link
                    href={`/analysis/${pageCtx.next_analysis_id}`}
                    className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1"
                  >
                    Next
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M7 5l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                ) : (
                  <span className="text-sm text-text-muted py-1.5 px-3 opacity-50">Next</span>
                )}
              </div>
            </div>

            {/* Deploy context expanded dropdown */}
            {analysis.deploy_context && deployExpanded && (
              <div className="mt-3 glass-card p-4 max-w-md">
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
                      {analysis.deploy_context.changed_files.slice(0, 3).map((file, i) => (
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

{/* Initial Audit Layout — hidden for Chronicle scans */}
        {!isChronicle && (
          <>
        {/* Hero Section */}
        <NewHeroSection
          structured={s}
          domain={getDomain(analysis.url)}
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
        />

        <hr className="section-divider" />

        {/* Findings Section */}
        {isNewAnalysisFormat(s) && s.findings && s.findings.length > 0 && (
          <>
            <FindingsSection findings={s.findings} />
            <hr className="section-divider" />
          </>
        )}

        {/* ZONE3_REMOVE_START */}
        {false && (() => {
          const legacy = s as LegacyStructuredOutput;
          const actionsCount = legacy.topActions?.length ?? 0;
          const header = getTopActionsHeader(legacy.overallScore ?? 0);

          // Score 95+ with no actions → celebration state
          if (actionsCount === 0 && (legacy.overallScore ?? 0) >= 95) {
            return (
              <>
                <CelebrationState score={legacy.overallScore ?? 0} />
                <hr className="section-divider" />
              </>
            );
          }

          // No actions and score < 95 → hide section entirely
          if (actionsCount === 0) {
            return null;
          }

          // 4+ actions → use expandable component
          if (actionsCount >= 4) {
            return (
              <>
                <TopActionsExpandable actions={legacy.topActions ?? []} score={legacy.overallScore ?? 0} />
                <hr className="section-divider" />
              </>
            );
          }

          // 1 action → single full-width hero card
          if (actionsCount === 1) {
            return (
              <>
                <section className="result-section">
                  <div className="section-header">
                    <div>
                      <h2
                        className="text-4xl font-bold text-text-primary"
                        style={{ fontFamily: "var(--font-instrument-serif)" }}
                      >
                        {header?.title || "Where you're losing visitors"}
                      </h2>
                      <p className="text-sm text-text-muted mt-1">
                        {header?.subtitle || "Ranked by conversion impact. Start at the top."}
                      </p>
                    </div>
                  </div>
                  <div className="glass-card p-6 flex items-start gap-5">
                    <span
                      className="text-[4.5rem] leading-none font-bold text-[rgba(91,46,145,0.18)] flex-shrink-0 -mt-2"
                      style={{ fontFamily: "var(--font-instrument-serif)" }}
                    >
                      1
                    </span>
                    <div className="pt-2">
                      <p className="text-xl text-text-primary font-semibold leading-relaxed">
                        {getActionText(legacy.topActions?.[0])}
                      </p>
                      {getActionImpact(legacy.topActions?.[0]) && (
                        <p className="text-sm text-text-muted mt-2">
                          {getActionImpact(legacy.topActions?.[0])}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
                <hr className="section-divider" />
              </>
            );
          }

          // 2-3 actions → standard hero left, stacked right layout
          return (
            <>
              <section className="result-section">
                <div className="section-header">
                  <div>
                    <h2
                      className="text-4xl font-bold text-text-primary"
                      style={{ fontFamily: "var(--font-instrument-serif)" }}
                    >
                      {header?.title || "Where you're losing visitors"}
                    </h2>
                    <p className="text-sm text-text-muted mt-1">
                      {header?.subtitle || "Ranked by conversion impact. Start at the top."}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
                  {/* #1 — left column, hero action in card */}
                  <div className="glass-card p-6 flex items-start gap-5">
                    <span
                      className="text-[4.5rem] leading-none font-bold text-[rgba(91,46,145,0.18)] flex-shrink-0 -mt-2"
                      style={{ fontFamily: "var(--font-instrument-serif)" }}
                    >
                      1
                    </span>
                    <div className="pt-2">
                      <p className="text-xl text-text-primary font-semibold leading-relaxed">
                        {getActionText(legacy.topActions?.[0])}
                      </p>
                      {getActionImpact(legacy.topActions?.[0]) && (
                        <p className="text-sm text-text-muted mt-2">
                          {getActionImpact(legacy.topActions?.[0])}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* #2 and #3 — right column, stacked */}
                  <div className="space-y-8">
                    {(legacy.topActions ?? []).slice(1, 3).map((action, i) => (
                      <div key={i} className="flex items-start gap-4">
                        <span
                          className="text-[2.5rem] leading-none font-bold text-[rgba(91,46,145,0.12)] flex-shrink-0 -mt-1"
                          style={{ fontFamily: "var(--font-instrument-serif)" }}
                        >
                          {i + 2}
                        </span>
                        <p className="text-lg text-text-primary leading-relaxed pt-1">
                          {getActionText(action)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
              <hr className="section-divider" />
            </>
          );
        })()}

        {/* Headline Rewrite Spotlight */}
        {s.headlineRewrite && (
          <>
            <section className="result-section">
              <div className="section-header">
                <div>
                  <h2
                    className="text-4xl font-bold text-text-primary"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
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
                      {/* New format: show currentAnnotation */}
                      {annotation && (
                        <p className="text-sm text-text-muted mb-4 italic">
                          {annotation}
                        </p>
                      )}
                      {!annotation && <div className="mb-2" />}

                      <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1.5">Suggested</p>
                      <div className="headline-rewrite-suggested relative">
                        <p
                          className="text-base font-bold leading-relaxed pr-8"
                          style={{ fontFamily: "var(--font-instrument-serif)" }}
                        >
                          {headlineRewrite.suggested}
                        </p>
                        <button
                          onClick={() => navigator.clipboard.writeText(headlineRewrite.suggested)}
                          className="absolute top-3 right-3 text-text-muted hover:text-accent transition-colors p-1 rounded-md
                                     hover:bg-[rgba(91,46,145,0.08)] active:scale-[0.95]"
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
                    <div className="lg:pt-6">
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Why this works</p>
                      <p className="text-lg text-text-primary leading-relaxed">
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

        {/* Summary Section */}
        {isNewAnalysisFormat(s) && s.summary && (
          <>
            <section className="result-section">
              <div className="section-header">
                <div>
                  <h2
                    className="text-4xl font-bold text-text-primary"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    Summary
                  </h2>
                </div>
              </div>
              <div className="pull-quote-card">
                <p
                  className="text-lg text-text-primary leading-relaxed"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {s.summary}
                </p>
              </div>
            </section>

            <hr className="section-divider" />
          </>
        )}

        {/* ZONE4_REMOVE_START */}
        {false && (s as LegacyStructuredOutput).categories && (
          <section className="result-section">
            <div className="section-header">
              <h2
                className="text-4xl font-bold text-text-primary"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                The full picture
              </h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {((s as LegacyStructuredOutput).categories ?? []).map((cat) => {
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
                  className={`relative text-left p-5 cursor-pointer transition-all duration-150 active:scale-[0.98] ${
                    isActive ? "glass-card-active" : "glass-card"
                  }`}
                >
                  {/* Attention dot for low scores */}
                  {cat.score < 60 && !isActive && (
                    <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-score-low opacity-80" />
                  )}

                  <p className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-2">
                    {cat.name}
                  </p>

                  {/* Score with subtle glow */}
                  <div className="relative inline-block mb-3">
                    <p
                      className={`text-4xl font-black ${scoreColor(cat.score)}`}
                      style={{ fontFamily: "var(--font-instrument-serif)" }}
                    >
                      {cat.score}
                    </p>
                    <div
                      className="absolute inset-0 -z-10 blur-xl opacity-20 rounded-full scale-[2]"
                      style={{ backgroundColor: scoreCssColor(cat.score) }}
                    />
                  </div>

                  <div className="progress-track mb-3">
                    <div
                      className="progress-fill"
                      style={{
                        width: `${cat.score}%`,
                        backgroundColor: scoreCssColor(cat.score),
                        "--fill-glow": cat.score >= 80
                          ? "rgba(26,140,91,0.25)"
                          : cat.score >= 60
                            ? "rgba(160,107,0,0.25)"
                            : "rgba(194,59,59,0.25)",
                      } as React.CSSProperties}
                    />
                  </div>

                  {/* Semantic finding badges */}
                  <div className="flex items-center gap-3">
                    {issueCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-score-low">
                        <span className="w-1.5 h-1.5 rounded-full bg-score-low" />
                        {issueCount}
                      </span>
                    )}
                    {strengthCount > 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-score-high">
                        <span className="w-1.5 h-1.5 rounded-full bg-score-high" />
                        {strengthCount}
                      </span>
                    )}
                    {issueCount === 0 && strengthCount === 0 && (
                      <span className="text-xs text-text-muted">
                        {cat.findings.length} finding{cat.findings.length !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                </button>
              );
              })}
            </div>
          </section>
        )}

        {/* ZONE5_REMOVE_START */}
        {false && (s as LegacyStructuredOutput).categories && (
          <>
            <hr className="section-divider" />

            {/* Zone 5: Findings Panel (legacy format only) */}
            <section className="result-section" id="findings">
              <div className="section-header">
                <h2
                  className="text-4xl font-bold text-text-primary"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  What we found
                </h2>
              </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left sidebar: category nav */}
            <div className="lg:col-span-3 lg:sticky lg:top-6 lg:self-start">
              <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0">
                {((s as LegacyStructuredOutput).categories ?? []).map((cat) => {
                  const issueCount = cat.findings.filter((f) => f.type === "issue").length;
                  const suggestionCount = cat.findings.filter((f) => f.type === "suggestion").length;
                  const strengthCount = cat.findings.filter((f) => f.type === "strength").length;
                  const total = issueCount + suggestionCount + strengthCount || 1;
                  const issuePct = (issueCount / total) * 100;
                  const suggestionPct = (suggestionCount / total) * 100;
                  const strengthPct = (strengthCount / total) * 100;

                  return (
                    <button
                      key={cat.name}
                      onClick={() => setActiveCategory(cat.name)}
                      className={`sidebar-nav-item whitespace-nowrap text-left text-sm ${
                        activeCategory === cat.name ? "sidebar-nav-item-active" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span>{cat.name}</span>
                        <span className={`font-bold ${scoreColor(cat.score)}`}>
                          {cat.score}
                        </span>
                      </div>
                      {/* Mini bar — issues (red), suggestions (amber), strengths (green) */}
                      <div className="sidebar-mini-bar">
                        {issueCount > 0 && (
                          <div
                            className="sidebar-mini-bar-segment"
                            style={{
                              width: `${issuePct}%`,
                              backgroundColor: "var(--score-low)",
                            }}
                          />
                        )}
                        {suggestionCount > 0 && (
                          <div
                            className="sidebar-mini-bar-segment"
                            style={{
                              width: `${suggestionPct}%`,
                              backgroundColor: "var(--score-mid)",
                            }}
                          />
                        )}
                        {strengthCount > 0 && (
                          <div
                            className="sidebar-mini-bar-segment"
                            style={{
                              width: `${strengthPct}%`,
                              backgroundColor: "var(--score-high)",
                            }}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </nav>
              {activeCategory && CATEGORY_EXPLAINERS[activeCategory as keyof typeof CATEGORY_EXPLAINERS] && (
                <div className="hidden lg:block mt-4 explainer-card">
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {CATEGORY_EXPLAINERS[activeCategory as keyof typeof CATEGORY_EXPLAINERS]}
                  </p>
                </div>
              )}
            </div>

            {/* Right: findings for active category */}
            <div className="lg:col-span-9 space-y-2">
              {activeCatFindings.length > 0 ? (
                activeCatFindings.map((finding, i) => {
                  const findingId = `finding-${(activeCategory ?? "").replace(/\s+/g, "-").toLowerCase()}-${i}`;
                  const typeColors = {
                    issue: "border-l-score-low bg-[rgba(194,59,59,0.03)]",
                    suggestion: "border-l-accent bg-[rgba(91,46,145,0.03)]",
                    strength: "border-l-score-high bg-[rgba(26,140,91,0.03)]",
                  };
                  const typeLabels = { issue: "Issue", suggestion: "Suggestion", strength: "Strength" };
                  const isExpanded = expandedFindings.has(findingId);
                  return (
                    <div
                      key={findingId}
                      id={findingId}
                      className={`glass-card border-l-4 ${typeColors[finding.type]} p-5 transition-all duration-150`}
                    >
                      <button
                        onClick={() => toggleFinding(findingId)}
                        className="w-full text-left flex items-start justify-between gap-4"
                      >
                        <div className="flex-1">
                          <span className="text-xs font-semibold uppercase tracking-wide text-text-muted">
                            {typeLabels[finding.type]}
                          </span>
                          <p className="text-lg text-text-primary font-semibold mt-1">{finding.title}</p>
                        </div>
                        <svg
                          className={`w-5 h-5 text-text-muted transition-transform ${isExpanded ? "rotate-180" : ""}`}
                          viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"
                        >
                          <path d="M5 7l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      {isExpanded && (
                        <div className="mt-4 space-y-4">
                          <p className="text-base text-text-secondary">{finding.description}</p>
                          {finding.fix && (
                            <div className="bg-[rgba(91,46,145,0.04)] border border-[rgba(91,46,145,0.15)] rounded-lg p-4">
                              <p className="text-sm font-semibold text-accent mb-1">Fix:</p>
                              <p className="text-base text-text-primary">{finding.fix}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <p className="text-text-muted text-base">
                    Select a category to view findings.
                  </p>
                </div>
              )}
            </div>
          </div>

            <p className="bridge-text mt-6">
              This is your page today. After your next deploy, it won&apos;t be.
            </p>
          </section>

          <hr className="section-divider" />
          </>
        )}
          </>
        )}

        {/* Chronicle Layout for new format N+1 scans */}
        {analysis.changes_summary && isChronicleFormat(analysis.changes_summary) && (
          <ChronicleLayout
            url={analysis.url}
            changesSummary={analysis.changes_summary}
            deployContext={analysis.deploy_context}
            baselineDate={analysis.parent_structured_output ? analysis.created_at : undefined}
          />
        )}

        {/* Zone 6: Claim CTA */}
        <section id="claim-cta" className="py-10">
          <div className="glass-card-elevated p-6 md:p-8 max-w-[540px] mx-auto">
            {analysis.claim_status?.claimed_by_current_user ? (
              /* Current user already watching this domain */
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(91,46,145,0.1)] mb-4">
                  <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p
                  className="text-2xl font-bold text-text-primary"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  You&apos;re watching this
                </p>
                <p className="text-base text-text-secondary mt-2 mb-4">
                  {getDomain(analysis.url)} is already on your watchlist.
                </p>
                <Link
                  href={`/pages/${analysis.claim_status.claimed_page_id}`}
                  className="btn-primary inline-block"
                >
                  Go to your page
                </Link>
              </div>
            ) : analysis.claim_status?.is_claimed ? (
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
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
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
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[rgba(91,46,145,0.1)] mb-4">
                  <svg className="w-6 h-6 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p
                  className="text-2xl font-bold text-text-primary"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  You&apos;re in
                </p>
                <p className="text-base text-text-secondary mt-2">
                  Check your inbox for the magic link to start watching.
                </p>
              </div>
            ) : (
              /* Claim form */
              <div className="text-center">
                {/* Headline + subhead */}
                <h2
                  className="text-2xl md:text-3xl font-bold text-text-primary"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {analysis.changes_summary
                    ? "Keep watching"
                    : <>Watch {getDomain(analysis.url)}</>}
                </h2>
                <p className="text-base text-text-secondary mt-2 mb-6">
                  {analysis.changes_summary
                    ? "We\u2019re monitoring. You\u2019ll know when something shifts."
                    : "We\u2019ll catch the changes you miss before your visitors do."}
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
                    {claimLoading ? "Sending..." : "Start watching"}
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

                {/* Founding 50 */}
                {foundingStatus && !foundingStatus.isFull && !analysis.changes_summary && (
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

          {/* Footer links */}
          <div className="flex items-center justify-center gap-6 text-sm text-text-muted mt-6">
            <button
              onClick={handleShareLink}
              className="hover:text-accent transition-colors"
            >
              {linkCopied ? "Copied!" : "Copy link"}
            </button>
            <Link href="/" className="hover:text-accent transition-colors">
              Audit another page
            </Link>
          </div>

          {/* Timestamp */}
          <p className="text-xs text-text-muted text-center mt-4">
            Snapshot from {new Date(analysis.created_at).toLocaleDateString()}
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
