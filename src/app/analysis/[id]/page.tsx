"use client";

import { useEffect, useState, useCallback, useRef, useId } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// --- Types ---

interface Finding {
  type: "strength" | "issue" | "suggestion";
  title: string;
  detail: string;
  impact?: "high" | "medium" | "low";
  fix?: string;
  methodology?: string;
  element?: string;
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
  verdict?: string;
  categories: Category[];
  summary: string;
  topActions: (TopAction | string)[];
  whatsWorking?: string[];
  whatsNot?: string[];
  headlineRewrite?: HeadlineRewrite | null;
}

// Updated ChangesSummary with new schema
interface FindingEvaluation {
  title: string;
  element: string;
  previous_status: "issue" | "suggestion";
  evaluation: "resolved" | "improved" | "unchanged" | "regressed" | "new";
  quality_assessment: string;
  detail: string;
}

interface ChangesSummary {
  // New schema fields
  findings_evaluations?: FindingEvaluation[];
  analytics_insights?: string;
  // Legacy schema fields (for backwards compatibility)
  findings_status?: {
    title: string;
    element: string;
    previous_status: string;
    current_status: "resolved" | "persists" | "regressed" | "new";
    detail: string;
  }[];
  score_delta: number;
  category_deltas: { name: string; previous: number; current: number; delta: number }[];
  running_summary: string;
  progress: {
    total_original: number;
    resolved: number;
    improved?: number;
    unchanged?: number;
    persisting?: number; // Legacy field
    regressed?: number;
    new_issues: number;
  };
}

interface PageContext {
  page_id: string;
  page_name: string | null;
  scan_number: number;
  prev_analysis_id: string | null;
  next_analysis_id: string | null;
}

interface DeployContext {
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  commit_timestamp: string;
  changed_files: string[];
}

interface MetricsSnapshot {
  pageviews: number;
  unique_visitors: number;
  bounce_rate: number;
  period_days: number;
  captured_at: string;
}

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
  deploy_context: DeployContext | null;
  trigger_type: "manual" | "daily" | "weekly" | "deploy" | null;
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

// --- Helpers ---

function scoreColor(score: number) {
  if (score >= 80) return "text-score-high";
  if (score >= 60) return "text-score-mid";
  return "text-score-low";
}

function scoreCssColor(score: number) {
  if (score >= 80) return "var(--score-high)";
  if (score >= 60) return "var(--score-mid)";
  return "var(--score-low)";
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
  if (score >= 85) return "Your page is dialed in";
  if (score >= 60) return "Your page is leaking conversions";
  return "Your page is working against you";
}

function letterGrade(score: number): string {
  if (score >= 93) return "A+";
  if (score >= 85) return "A";
  if (score >= 78) return "B+";
  if (score >= 70) return "B";
  if (score >= 63) return "C+";
  if (score >= 55) return "C";
  if (score >= 45) return "D";
  return "F";
}

function derivePercentile(score: number): number {
  // Deterministic pseudo-random offset from score
  const seed = ((score * 7 + 13) % 17) - 8; // range roughly -8 to +8
  const raw = score * 0.8 + seed;
  return Math.min(95, Math.max(5, Math.round(raw)));
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

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
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

// Score arc — thick half-gauge
function ScoreArc({ score, grade, className }: { score: number; grade: string; className?: string }) {
  const displayScore = useCountUp(score);
  const color = scoreCssColor(score);
  const arcId = useId();

  const cx = 150;
  const cy = 130;
  const r = 90;
  const strokeW = 26;
  const halfCirc = Math.PI * r;
  const filled = (displayScore / 100) * halfCirc;

  const shadowR = r;

  return (
    <div className={`relative flex-shrink-0 ${className || "w-56 h-48"}`}>
      <svg className="w-full h-full" viewBox="0 0 300 195" overflow="visible">
        <defs>
          {/* Filled arc gradient */}
          <linearGradient id={`${arcId}-arc`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#7B3FA0" />
            <stop offset="50%" stopColor="#6366B8" />
            <stop offset="100%" stopColor="#7BA4D4" />
          </linearGradient>
          {/* Shadow gradient — same hues but transparent */}
          <linearGradient id={`${arcId}-shadow`} x1="0%" y1="50%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="rgba(123,63,160,0.4)" />
            <stop offset="50%" stopColor="rgba(99,102,184,0.35)" />
            <stop offset="100%" stopColor="rgba(123,164,212,0.3)" />
          </linearGradient>
          {/* Blur filter for the shadow arc */}
          <filter id={`${arcId}-blur`} x="-20%" y="-20%" width="140%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {/* Inset shadow for the track — dark on inner top edge */}
          <filter id={`${arcId}-inset`} x="-20%" y="-30%" width="140%" height="160%">
            <feComponentTransfer in="SourceAlpha">
              <feFuncA type="table" tableValues="1 0" />
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="2.5" />
            <feOffset dx="0" dy="2" />
            <feFlood floodColor="rgba(0,0,0,0.12)" />
            <feComposite in2="SourceAlpha" operator="in" />
            <feMerge>
              <feMergeNode in="SourceGraphic" />
              <feMergeNode />
            </feMerge>
          </filter>
        </defs>

        {/* Track — light lavender with inset shadow */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#E4E3EF" strokeWidth={strokeW} strokeLinecap="round"
          filter={`url(#${arcId}-inset)`}
        />

        {/* Color-matched blurred shadow arc — offset down */}
        <path
          d={`M ${cx - shadowR} ${cy + 6} A ${shadowR} ${shadowR} 0 0 1 ${cx + shadowR} ${cy + 6}`}
          fill="none" stroke={`url(#${arcId}-shadow)`} strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${halfCirc}`}
          filter={`url(#${arcId}-blur)`}
          className="transition-all duration-1000 ease-out"
        />

        {/* Filled arc — solid gradient, no white overlay */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={`url(#${arcId}-arc)`} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={`${filled} ${halfCirc}`}
          className="transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Score text */}
      <div className="absolute inset-0 flex items-end justify-center" style={{ paddingBottom: "10%" }}>
        <div className="flex flex-col items-center">
          <span className="text-5xl font-black leading-none" style={{ fontFamily: "var(--font-instrument-serif)", color }}>
            {grade}
          </span>
          <span className="text-sm text-text-muted tabular-nums font-semibold mt-0.5">{displayScore}/100</span>
        </div>
      </div>
    </div>
  );
}

function FindingCard({
  finding,
  expanded,
  onToggle,
  shareId,
}: {
  finding: Finding;
  expanded: boolean;
  onToggle: () => void;
  shareId: string;
}) {
  const [copied, setCopied] = useState(false);
  const [fixCopied, setFixCopied] = useState(false);

  const cardClass = {
    issue: "finding-issue",
    suggestion: "finding-suggestion",
    strength: "finding-strength",
  }[finding.type];

  const impactBadgeClass = finding.impact
    ? `impact-badge impact-badge-${finding.impact}`
    : null;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}#${shareId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyFix = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (finding.fix) {
      navigator.clipboard.writeText(finding.fix);
      setFixCopied(true);
      setTimeout(() => setFixCopied(false), 2000);
    }
  };

  return (
    <div
      id={shareId}
      className={`${cardClass} group transition-all duration-150 cursor-pointer`}
      onClick={onToggle}
    >
      {/* Collapsed header — always visible */}
      <div className="flex items-center gap-3 p-4">
        <p
          className="flex-1 text-lg font-semibold text-text-primary leading-snug"
          style={{ fontFamily: "var(--font-instrument-serif)" }}
        >
          {finding.title}
        </p>
        {impactBadgeClass && (
          <span className={impactBadgeClass}>
            {finding.impact}
          </span>
        )}
        {/* Share button — hover reveal */}
        <button
          onClick={handleShare}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-[rgba(91,46,145,0.08)]"
          title={copied ? "Copied!" : "Copy link"}
        >
          {copied ? (
            <svg className="w-4 h-4 text-score-high" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3.5 8.5 6.5 11.5 12.5 4.5" />
            </svg>
          ) : (
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8v5a1 1 0 001 1h6a1 1 0 001-1V8" />
              <polyline points="11 4 8 1 5 4" />
              <line x1="8" y1="1" x2="8" y2="10" />
            </svg>
          )}
        </button>
        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-text-muted transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
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
          expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 pt-1 space-y-4">
          {/* Detail text */}
          <p className="text-[0.9375rem] text-text-primary leading-relaxed">
            {finding.detail}
          </p>

          {/* Fix block */}
          {finding.fix && (
            <div className="fix-block">
              <div className="fix-block-header">
                <span className="fix-block-label">How to fix</span>
                <button
                  onClick={handleCopyFix}
                  className="fix-block-copy"
                  title={fixCopied ? "Copied!" : "Copy"}
                >
                  {fixCopied ? (
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
              <p className="fix-block-text">{finding.fix}</p>
            </div>
          )}
        </div>
      </div>
    </div>
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
  deployContext?: DeployContext | null;
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
  const total = progress.total_original || 1;

  // Calculate percentages for each segment
  const resolved = progress.resolved || 0;
  const improved = progress.improved || 0;
  const unchanged = progress.unchanged || progress.persisting || 0;
  const regressed = progress.regressed || 0;

  const resolvedPct = (resolved / total) * 100;
  const improvedPct = (improved / total) * 100;
  const unchangedPct = (unchanged / total) * 100;
  const regressedPct = (regressed / total) * 100;

  // Build segments array (only include non-zero segments)
  const segments: { color: string; pct: number; label: string; count: number }[] = [];
  if (resolved > 0) segments.push({ color: "var(--score-high)", pct: resolvedPct, label: "resolved", count: resolved });
  if (improved > 0) segments.push({ color: "var(--score-mid)", pct: improvedPct, label: "improved", count: improved });
  if (unchanged > 0) segments.push({ color: "#8E8EA0", pct: unchangedPct, label: "unchanged", count: unchanged });
  if (regressed > 0) segments.push({ color: "var(--score-low)", pct: regressedPct, label: "regressed", count: regressed });

  return (
    <div>
      {/* Segmented bar */}
      <div className="progress-segmented">
        {segments.map((seg, i) => (
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
        {progress.new_issues > 0 && (
          <span className="progress-legend-item">
            <span className="progress-legend-dot" style={{ backgroundColor: "var(--score-low)" }} />
            <span className="font-semibold">{progress.new_issues}</span> new
          </span>
        )}
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
      className="fixed inset-0 z-[100] modal-overlay flex items-center justify-center p-4"
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
            <span className="text-xs text-text-muted font-mono ml-2 truncate">
              {getDomain(pageUrl)}
            </span>
          </div>
          <button
            onClick={onClose}
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
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showScreenshot, setShowScreenshot] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimEmail, setClaimEmail] = useState("");
  const [claimEmailSent, setClaimEmailSent] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());
  const [expandedEvaluations, setExpandedEvaluations] = useState<Set<number>>(new Set());
  const [deployExpanded, setDeployExpanded] = useState(false);
  const [foundingStatus, setFoundingStatus] = useState<{
    claimed: number;
    total: number;
    remaining: number;
    isFull: boolean;
  } | null>(null);

  // Auto-expand first finding when category changes
  useEffect(() => {
    if (activeCategory && analysis?.structured_output) {
      const cat = analysis.structured_output.categories.find((c) => c.name === activeCategory);
      if (cat && cat.findings.length > 0) {
        const sortedFindings = [...cat.findings].sort(
          (a, b) => typePriority(a.type) - typePriority(b.type)
        );
        const firstFindingId = `finding-${activeCategory.replace(/\s+/g, "-").toLowerCase()}-0`;
        setExpandedFindings(new Set([firstFindingId]));
      }
    }
  }, [activeCategory, analysis?.structured_output]);

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
      const res = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: claimEmail,
          redirectTo: `${window.location.origin}/auth/callback?claim=${analysis.id}`,
        }),
      });
      if (res.ok) {
        setClaimEmailSent(true);
      } else {
        setClaimError("Failed to send link. Try again.");
      }
    } catch {
      setClaimError("Network error. Try again.");
    }
    setClaimLoading(false);
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
    !analysis ||
    analysis.status === "pending" ||
    analysis.status === "processing"
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="glass-spinner mx-auto" />
          <p className="text-text-primary font-semibold text-lg mt-6">
            Analyzing your page
          </p>
          <p className="text-base text-text-muted mt-2 animate-pulse">
            {LOADING_STEPS[loadingStep]}
          </p>
          {analysis?.url && (
            <p className="text-sm text-text-muted mt-4 font-mono truncate">
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
  const activeCat = s.categories.find((c) => c.name === activeCategory);
  const activeCatFindings = activeCat
    ? [...activeCat.findings].sort(
        (a, b) => typePriority(a.type) - typePriority(b.type)
      )
    : [];

  const grade = letterGrade(s.overallScore);
  const percentile = derivePercentile(s.overallScore);
  const hexColor = scoreCssColor(s.overallScore);

  const pageCtx = analysis.page_context;

  // Get findings evaluations (new schema) or convert from legacy
  const findingsEvaluations: FindingEvaluation[] = analysis.changes_summary?.findings_evaluations ||
    (analysis.changes_summary?.findings_status?.map(f => ({
      title: f.title,
      element: f.element,
      previous_status: f.previous_status as "issue" | "suggestion",
      evaluation: (f.current_status === "persists" ? "unchanged" : f.current_status) as FindingEvaluation["evaluation"],
      quality_assessment: "",
      detail: f.detail,
    })) || []);

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

{/* Zone 1: Hero Scorecard */}
        <section className="py-8 lg:py-12">
          <div className="glass-card-elevated mx-auto overflow-hidden">
            {/* Card header — domain + timestamp + metrics */}
            <div className="flex items-center justify-between px-8 pt-7 pb-0">
              <div className="flex items-center gap-3">
                <span className="url-badge">{getDomain(analysis.url)}</span>
                <span className="text-sm text-text-muted">{timeAgo(analysis.created_at)}</span>
              </div>
              <div className="flex items-center gap-4">
                {/* PostHog metrics pill */}
                {analysis.metrics_snapshot && (
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span title="Pageviews (last 7 days)">
                      <span className="font-semibold text-text-secondary">{formatNumber(analysis.metrics_snapshot.pageviews)}</span> views
                    </span>
                    <span className="text-[rgba(0,0,0,0.1)]">|</span>
                    <span title="Unique visitors (last 7 days)">
                      <span className="font-semibold text-text-secondary">{formatNumber(analysis.metrics_snapshot.unique_visitors)}</span> visitors
                    </span>
                    <span className="text-[rgba(0,0,0,0.1)]">|</span>
                    <span title="Bounce rate (last 7 days)">
                      <span className="font-semibold text-text-secondary">{analysis.metrics_snapshot.bounce_rate}%</span> bounce
                    </span>
                  </div>
                )}
                <span className="text-xs font-semibold text-text-muted uppercase tracking-widest">Loupe Audit</span>
              </div>
            </div>

            {/* Card body — 3-column on desktop: ring | verdict | categories */}
            <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8 px-8 py-8">
              {/* Score gauge */}
              <ScoreArc score={s.overallScore} grade={grade} className="w-48 h-44 flex-shrink-0" />

              {/* Verdict + percentile */}
              <div className="flex-1 text-center lg:text-left min-w-0">
                <p
                  className="hero-reveal-verdict text-2xl sm:text-3xl font-bold leading-tight text-text-primary"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  {s.verdict || verdictLabel(s.overallScore)}
                </p>

                {/* Percentile */}
                <div className="hero-reveal-percentile mt-5">
                  <p className="text-sm text-text-muted mb-1.5">
                    Scores higher than {percentile}% of pages audited
                  </p>
                  <div className="percentile-track">
                    <div
                      className="percentile-fill"
                      style={{ width: `${percentile}%`, backgroundColor: hexColor }}
                    >
                      <div className="percentile-dot" style={{ backgroundColor: hexColor }} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Category breakdown — right column on desktop, below on mobile */}
              <div className="w-full lg:w-[240px] flex-shrink-0 lg:border-l lg:border-border-outer lg:pl-8 border-t lg:border-t-0 border-border-outer pt-5 lg:pt-0">
                <div className="space-y-3">
                  {s.categories.map((cat) => (
                    <div key={cat.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide truncate">{cat.name}</span>
                        <span className={`text-sm font-bold tabular-nums ml-2 ${scoreColor(cat.score)}`}>{cat.score}</span>
                      </div>
                      <div className="progress-track !h-[3px]">
                        <div
                          className="progress-fill"
                          style={{
                            width: `${cat.score}%`,
                            backgroundColor: scoreCssColor(cat.score),
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card footer — actions */}
            <div className="hero-reveal-actions flex items-center justify-between border-t border-border-outer px-8 py-4 bg-[rgba(0,0,0,0.015)]">
              <Link
                href="/"
                className="text-sm text-text-muted hover:text-accent transition-colors"
              >
                Audit another page
              </Link>
              <button
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="btn-primary text-sm py-2.5 px-5"
              >
                Share your score
              </button>
            </div>
          </div>
        </section>

        <hr className="section-divider" />

        {/* Zone 2: Quick Diagnosis */}
        {((s.whatsWorking?.length ?? 0) > 0 || (s.whatsNot?.length ?? 0) > 0) && (
          <>
            <section className="result-section">
              <div className="section-header">
                <div>
                  <h2
                    className="text-4xl font-bold text-text-primary"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    Quick diagnosis
                  </h2>
                  <p className="text-sm text-text-muted mt-1">
                    What&apos;s helping conversions, what&apos;s hurting them.
                  </p>
                </div>
                {/* Screenshot thumbnail — far right */}
                {analysis.screenshot_url && (
                  <button
                    onClick={() => setShowScreenshot(true)}
                    className="hidden md:block ml-auto flex-shrink-0 w-[100px] rounded-lg overflow-hidden border border-[rgba(0,0,0,0.08)]
                               hover:border-[rgba(91,46,145,0.3)] transition-colors cursor-pointer"
                  >
                    <img
                      src={analysis.screenshot_url}
                      alt="Page screenshot"
                      loading="lazy"
                      className="w-full h-[60px] object-cover object-top"
                    />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* What's working */}
                <div className="glass-card p-6">
                  <p className="text-xs font-semibold text-score-high uppercase tracking-wide mb-5">
                    Working
                  </p>
                  <ul className="space-y-5">
                    {(s.whatsWorking || []).map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg className="w-[18px] h-[18px] mt-1 flex-shrink-0 text-score-high" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="4 9.5 7.5 13 14 5" />
                        </svg>
                        <span className="text-lg text-text-primary leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Where you're leaking */}
                <div className="glass-card p-6">
                  <p className="text-xs font-semibold text-score-low uppercase tracking-wide mb-5">
                    Where you&apos;re leaking
                  </p>
                  <ul className="space-y-5">
                    {(s.whatsNot || []).map((item, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <svg className="w-[18px] h-[18px] mt-1 flex-shrink-0 text-score-low" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="5" y1="5" x2="13" y2="13" />
                          <line x1="13" y1="5" x2="5" y2="13" />
                        </svg>
                        <span className="text-lg text-text-primary leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              {/* Bridge text + inline claim teaser */}
              <div className="mt-12 text-center">
                <p
                  className="text-xl text-text-primary"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  This is your page today.
                </p>
                <p
                  className="text-xl text-text-secondary italic"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  But pages don&apos;t stay still.
                </p>

                {/* Soft claim teaser */}
                <div className="mt-6 py-5 px-6 rounded-xl bg-[rgba(91,46,145,0.06)] max-w-md mx-auto">
                  {claimEmailSent ? (
                    <div>
                      <p className="text-base font-medium text-text-primary">Claim link sent</p>
                      <p className="text-sm text-text-muted mt-1">Check your inbox.</p>
                    </div>
                  ) : (
                    <>
                      <p className="text-base text-text-secondary mb-3">
                        Claim {getDomain(analysis.url)} to get notified when it changes.
                      </p>
                      <form onSubmit={handleClaimEmail} className="flex items-stretch gap-2">
                        <input
                          type="email"
                          placeholder="you@company.com"
                          value={claimEmail}
                          onChange={(e) => setClaimEmail(e.target.value)}
                          className="input-glass flex-1 text-sm py-2"
                          aria-label="Email address"
                          required
                        />
                        <button
                          type="submit"
                          disabled={claimLoading}
                          className="text-accent font-medium hover:bg-[rgba(91,46,145,0.12)] px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
                        >
                          {claimLoading ? "..." : "Claim →"}
                        </button>
                      </form>
                      {claimError && (
                        <p className="text-xs text-score-low mt-2">{claimError}</p>
                      )}
                      {foundingStatus && foundingStatus.remaining <= 20 && !claimError && (
                        <p className="text-xs text-text-muted mt-3">
                          {foundingStatus.remaining} founding spots left
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            </section>

            <hr className="section-divider" />
          </>
        )}

        {/* Zone 3: Top Actions */}
        {s.topActions.length > 0 && (
          <>
            <section className="result-section">
              <div className="section-header">
                <div>
                  <h2
                    className="text-4xl font-bold text-text-primary"
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    Where you&apos;re losing visitors
                  </h2>
                  <p className="text-sm text-text-muted mt-1">
                    Ranked by conversion impact. Start at the top.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16">
                {/* #1 — left column, hero action in card */}
                {s.topActions[0] && (
                  <div className="glass-card p-6 flex items-start gap-5">
                    <span
                      className="text-[4.5rem] leading-none font-bold text-[rgba(91,46,145,0.18)] flex-shrink-0 -mt-2"
                      style={{ fontFamily: "var(--font-instrument-serif)" }}
                    >
                      1
                    </span>
                    <div className="pt-2">
                      <p className="text-xl text-text-primary font-semibold leading-relaxed">
                        {getActionText(s.topActions[0])}
                      </p>
                      {getActionImpact(s.topActions[0]) && (
                        <p className="text-sm text-text-muted mt-2">
                          {getActionImpact(s.topActions[0])}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* #2 and #3 — right column, stacked */}
                {s.topActions.length > 1 && (
                  <div className="space-y-8">
                    {s.topActions.slice(1, 3).map((action, i) => (
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
                )}
              </div>
            </section>

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
                    style={{ fontFamily: "var(--font-instrument-serif)" }}
                  >
                    Headline rewrite
                  </h2>
                  <p className="text-sm text-text-muted mt-1">
                    One change that could shift perception immediately.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-start">
                {/* Left: the rewrite card */}
                <div className="glass-card-elevated p-6">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Current</p>
                  <p className="headline-rewrite-current text-base leading-relaxed mb-4">
                    {s.headlineRewrite.current}
                  </p>
                  <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-1.5">Suggested</p>
                  <div className="headline-rewrite-suggested relative">
                    <p
                      className="text-base font-bold leading-relaxed pr-8"
                      style={{ fontFamily: "var(--font-instrument-serif)" }}
                    >
                      {s.headlineRewrite.suggested}
                    </p>
                    <button
                      onClick={() => navigator.clipboard.writeText(s.headlineRewrite!.suggested)}
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

                {/* Right: reasoning */}
                <div className="lg:pt-6">
                  <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Why this works</p>
                  <p className="text-lg text-text-primary leading-relaxed">
                    {s.headlineRewrite.reasoning}
                  </p>
                </div>
              </div>
            </section>

            <hr className="section-divider" />
          </>
        )}

        {/* Zone 4: Category Grid */}
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

        <hr className="section-divider" />

        {/* Zone 5: Findings Panel */}
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
                {s.categories.map((cat) => {
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
              {activeCategory && CATEGORY_EXPLAINERS[activeCategory] && (
                <div className="hidden lg:block mt-4 explainer-card">
                  <p className="text-sm text-text-secondary leading-relaxed">
                    {CATEGORY_EXPLAINERS[activeCategory]}
                  </p>
                </div>
              )}
            </div>

            {/* Right: findings for active category */}
            <div className="lg:col-span-9 space-y-2">
              {activeCatFindings.length > 0 ? (
                activeCatFindings.map((finding, i) => {
                  const findingId = `finding-${activeCategory.replace(/\s+/g, "-").toLowerCase()}-${i}`;
                  return (
                    <FindingCard
                      key={findingId}
                      finding={finding}
                      expanded={expandedFindings.has(findingId)}
                      onToggle={() => toggleFinding(findingId)}
                      shareId={findingId}
                    />
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
            You just fixed these. How will you know if they break next week?
          </p>
        </section>

        <hr className="section-divider" />

        {/* Comparison View — REDESIGNED "What Changed" section */}
        {analysis.changes_summary && (
          <>
            <section className="result-section">
              {/* Section Header with running summary */}
              <div className="section-header flex-col !items-start gap-2">
                <h2
                  className="text-4xl font-bold text-text-primary"
                  style={{ fontFamily: "var(--font-instrument-serif)" }}
                >
                  What changed
                </h2>
                {analysis.changes_summary.running_summary && (
                  <p className="text-base text-text-secondary mt-1">
                    {analysis.changes_summary.running_summary}
                  </p>
                )}
              </div>

              {/* Deploy Context Banner (if deploy-triggered and in changes section) */}
              {analysis.trigger_type === "deploy" && analysis.deploy_context && (
                <div className="deploy-context-banner flex items-center gap-4 mb-6">
                  <div className="evaluation-icon evaluation-icon-improved">
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <circle cx="8" cy="8" r="3" />
                      <path d="M8 1v4M8 11v4M1 8h4M11 8h4" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      &ldquo;{analysis.deploy_context.commit_message}&rdquo;
                    </p>
                    <p className="text-xs text-text-muted">
                      <span className="font-mono">{analysis.deploy_context.commit_sha.slice(0, 7)}</span>
                      {" by "}{analysis.deploy_context.commit_author}
                      {" "}
                      {timeAgo(analysis.deploy_context.commit_timestamp)}
                    </p>
                  </div>
                  {analysis.deploy_context.changed_files.length > 0 && (
                    <div className="hidden sm:block text-right flex-shrink-0">
                      <p className="text-xs text-text-muted mb-0.5">Changed</p>
                      <p className="text-xs font-mono text-text-secondary">
                        {analysis.deploy_context.changed_files.slice(0, 2).map(f => f.split('/').pop()).join(', ')}
                        {analysis.deploy_context.changed_files.length > 2 && ` +${analysis.deploy_context.changed_files.length - 2}`}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Analytics Insights Callout (if present) */}
              {analysis.changes_summary.analytics_insights && (
                <div className="analytics-insight-card mb-6">
                  <div className="flex items-start gap-4">
                    <div className="evaluation-icon evaluation-icon-improved flex-shrink-0">
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="2 12 6 8 9 11 14 4" />
                        <polyline points="10 4 14 4 14 8" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">
                        Analytics correlation
                      </p>
                      <p
                        className="text-lg text-text-primary leading-relaxed"
                        style={{ fontFamily: "var(--font-instrument-serif)" }}
                      >
                        {analysis.changes_summary.analytics_insights}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Score + Progress Hero Card */}
              <div className="glass-card-elevated p-6 md:p-8 mb-6">
                <div className="flex flex-col sm:flex-row items-start gap-8">
                  {/* Score change */}
                  <div className="flex-shrink-0">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Score</p>
                    <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-instrument-serif)" }}>
                      <span className="text-text-muted">{analysis.parent_structured_output?.overallScore ?? "?"}</span>
                      <span className="text-text-muted font-normal text-xl mx-2">&rarr;</span>
                      <span className={scoreColor(s.overallScore)}>{s.overallScore}</span>
                      {analysis.changes_summary.score_delta !== 0 && (
                        <span className={`text-lg ml-2 ${analysis.changes_summary.score_delta > 0 ? "text-score-high" : "text-score-low"}`}>
                          {analysis.changes_summary.score_delta > 0 ? "+" : ""}{analysis.changes_summary.score_delta}
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Segmented Progress bar */}
                  <div className="flex-1 w-full">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Progress</p>
                    <SegmentedProgressBar progress={analysis.changes_summary.progress} />
                  </div>
                </div>
              </div>

              {/* Finding Evaluations List */}
              <div className="space-y-2">
                {findingsEvaluations.map((evaluation, i) => (
                  <EvaluationCard
                    key={i}
                    evaluation={evaluation}
                    expanded={expandedEvaluations.has(i)}
                    onToggle={() => toggleEvaluation(i)}
                    deployContext={analysis.deploy_context}
                  />
                ))}
              </div>

              {/* Category deltas */}
              {analysis.changes_summary.category_deltas.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-6">
                  {analysis.changes_summary.category_deltas.map((cd) => (
                    <div key={cd.name} className="glass-card p-4">
                      <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">{cd.name}</p>
                      <p className="text-lg font-bold">
                        <span className="text-text-muted">{cd.previous}</span>
                        <span className="text-text-muted mx-1">&rarr;</span>
                        <span className={scoreColor(cd.current)}>{cd.current}</span>
                        {cd.delta !== 0 && (
                          <span className={`text-sm ml-1.5 ${cd.delta > 0 ? "text-score-high" : "text-score-low"}`}>
                            {cd.delta > 0 ? "+" : ""}{cd.delta}
                          </span>
                        )}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <hr className="section-divider" />
          </>
        )}

        {/* Zone 6: Claim CTA */}
        <section id="claim-cta" className="py-10">
          <div className="glass-card-elevated p-6 md:p-8 max-w-[540px] mx-auto">
            {claimEmailSent ? (
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
                  Claim link sent
                </p>
                <p className="text-base text-text-secondary mt-2">
                  Check your inbox for the magic link.
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
                    ? "Keep tracking"
                    : <>Claim {getDomain(analysis.url)}</>}
                </h2>
                <p className="text-base text-text-secondary mt-2 mb-6">
                  {analysis.changes_summary
                    ? "We\u2019re watching. You\u2019ll know when something shifts."
                    : "We\u2019ll watch it and alert you when it changes."}
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
                    {claimLoading ? "Sending..." : "Claim it"}
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
              onClick={() => navigator.clipboard.writeText(window.location.href)}
              className="hover:text-accent transition-colors"
            >
              Copy link
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
