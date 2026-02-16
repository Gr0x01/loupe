/**
 * Canonical type definitions for Loupe analysis data.
 * Import from here for type-safe usage across the codebase.
 */

export type MetricType =
  | "bounce_rate"
  | "conversion_rate"
  | "time_on_page"
  | "ctr"
  | "scroll_depth"
  | "form_completion";

export interface Prediction {
  metric: MetricType;
  direction: "up" | "down";
  /** Expected improvement range, e.g., "8-15%" */
  range: string;
  /** Human-friendly prediction text, e.g., "More people stick around" */
  friendlyText: string;
}

export type ElementType =
  | "headline"
  | "cta"
  | "copy"
  | "layout"
  | "social-proof"
  | "form"
  | "image"
  | "navigation"
  | "pricing"
  | "other";

export interface Finding {
  id: string; // Unique identifier for tracking (e.g., "f1", "f2")
  title: string;
  element: string; // Display-ready label: "Your Headline", "Your CTA Button"
  elementType: ElementType; // For icon selection in UI
  currentValue: string; // The actual text/element on page
  suggestion: string; // Copy-paste ready, NO "Try:" prefix
  prediction: Prediction;
  assumption: string; // Why this matters (expandable)
  methodology: string; // Framework used (expandable)
  impact: "high" | "medium" | "low";
}

export interface HeadlineRewrite {
  current: string;
  suggested: string;
  currentAnnotation: string; // "Generic. Says nothing about what you do."
  suggestedAnnotation: string; // "Specific outcome + time contrast = curiosity"
}

export interface AnalysisResult {
  output: string;
  structured: {
    verdict: string; // Specific, quotable ("Your CTA is buried below 4 screens")
    verdictContext: string; // Brief explanation for the verdict
    findingsCount: number;
    projectedImpactRange: string; // "15-30%"
    headlineRewrite: HeadlineRewrite | null;
    findings: Finding[];
    summary: string;
  };
}

export interface FindingEvaluation {
  title: string;
  element: string;
  previous_status: "issue" | "suggestion";
  evaluation: "resolved" | "improved" | "unchanged" | "regressed" | "new";
  quality_assessment: string; // Nuanced evaluation of the change quality
  detail: string;
}

// N+1 scan types for Chronicle experience
export interface Change {
  element: string; // Display-ready label
  description: string; // What changed
  before: string; // Previous value
  after: string; // New value
  detectedAt: string; // ISO timestamp
  /** Scope of the change - for smart aggregation */
  scope?: "element" | "section" | "page";
}

export interface ChronicleCorrelationMetric {
  name: string;
  friendlyName: string;
  before: number;
  after: number;
  change: string; // "+12%" or "-8%"
  assessment: "improved" | "regressed" | "neutral";
}

export interface Correlation {
  hasEnoughData: boolean;
  insights: string; // Narrative connecting changes to metrics
  metrics: ChronicleCorrelationMetric[];
}

export interface ChronicleSuggestion {
  title: string;
  element: string;
  observation: string; // What we noticed
  prediction: Prediction;
  suggestedFix: string; // Copy-paste ready
  impact: "high" | "medium" | "low";
}

// Progress tracking item types for Chronicle experience
export interface ValidatedItem {
  id: string;
  element: string; // "Your Headline"
  title: string; // "Headline updated"
  metric: string; // "bounce_rate"
  friendlyText: string; // "More people sticking around"
  change: string; // "+8%"
  status?: "validated" | "regressed"; // Canonical DB status (polarity-aware)
}

export interface WatchingItem {
  id: string;
  element: string;
  title: string;
  daysOfData: number; // How many days collected
  daysNeeded: number; // Typically 7-14
  firstDetectedAt?: string; // ISO timestamp - when change was first detected
}

// ============================================
// Detected Changes (persistent change tracking)
// ============================================

export type DetectedChangeStatus =
  | "watching"      // Collecting data, awaiting correlation
  | "validated"     // Metrics improved after change
  | "regressed"     // Metrics worsened after change
  | "inconclusive"  // Not enough data or neutral result
  | "reverted";     // Change was undone in subsequent deploy

export interface DetectedChange {
  id: string;
  page_id: string;
  user_id: string;

  // Change identification
  element: string;
  element_type?: string;
  scope: "element" | "section" | "page";

  // Before/after state
  before_value: string;
  after_value: string;
  description?: string;

  // Timing (anchor for correlation)
  first_detected_at: string;
  first_detected_analysis_id?: string;

  // Correlation tracking
  status: DetectedChangeStatus;
  correlation_metrics?: CorrelationMetrics;
  correlation_unlocked_at?: string;

  // Source context
  deploy_id?: string;

  // Intent capture
  hypothesis?: string;
  hypothesis_at?: string;
  observation_text?: string;

  // Provenance (fingerprint matching, Phase 3)
  matched_change_id?: string;
  match_confidence?: number;
  match_rationale?: string;
  fingerprint_version?: number;

  created_at: string;
  updated_at: string;
}

export interface CorrelationMetrics {
  metrics: Array<{
    name: string;
    before: number;
    after: number;
    change_percent: number;
    assessment: "improved" | "regressed" | "neutral";
  }>;
  overall_assessment: "improved" | "regressed" | "neutral" | "inconclusive";
  reason?: string; // e.g., "analytics_disconnected"
}

// Absolute period comparison for correlation (not relative days)
export interface AbsolutePeriodComparison {
  metric: string;
  before_start: string; // ISO date
  before_end: string;
  after_start: string;
  after_end: string;
  before_value: number;
  after_value: number;
  change_percent: number;
  direction: "up" | "down" | "flat";
}

export interface OpenItem {
  id: string;
  element: string;
  title: string;
  impact: "high" | "medium" | "low";
}

export interface ChangesSummary {
  verdict: string; // Punchy, quotable summary
  changes: Change[];
  suggestions: ChronicleSuggestion[];
  correlation: Correlation | null;
  progress: {
    validated: number; // Confirmed positive impact
    watching: number; // Collecting data
    open: number; // Not yet addressed
    // Item-level detail (optional for backward compat)
    validatedItems?: ValidatedItem[];
    watchingItems?: WatchingItem[];
    openItems?: OpenItem[];
  };
  running_summary: string;
  tool_calls_made?: string[];
  /** IDs of pending changes that were reverted (from LLM revert detection) */
  revertedChangeIds?: string[];
  /** LLM-generated observations for resolved correlations */
  observations?: Array<{ changeId: string; text: string }>;
  /** LLM-generated strategy narrative from checkpoint evidence */
  strategy_narrative?: string;
  /** Internal: set when post-analysis pipeline failed */
  _error?: string;
}

export interface CommitData {
  sha: string;
  message: string;
  author: string;
  timestamp: string;
  files: string[];
}

export interface DeployContext {
  commitSha: string;
  commitMessage: string;
  commitAuthor: string;
  commitTimestamp: string;
  changedFiles: string[];
  /** All commits from the push (null for old deploys) */
  commits?: CommitData[];
  /** Top 1-3 commits most relevant to the page being analyzed */
  relevantCommits?: CommitData[];
}

// ============================================
// Helper types for frontend compatibility
// ============================================

/**
 * Page context for analysis navigation
 */
export interface PageContext {
  page_id: string;
  page_name: string | null;
  scan_number: number;
  total_scans: number;
  prev_analysis_id: string | null;
  next_analysis_id: string | null;
  /** ISO timestamp of the first scan (baseline) for this page */
  baseline_date: string;
  /** Map of detected_change ID → hypothesis text (only present when hypotheses exist) */
  hypothesis_map?: Record<string, string>;
}

/**
 * Deploy context as returned from API (snake_case)
 */
export interface DeployContextAPI {
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  commit_timestamp: string;
  changed_files: string[];
}

/**
 * Metrics snapshot from analytics
 */
export interface MetricsSnapshot {
  pageviews: number;
  unique_visitors: number;
  bounce_rate: number;
  period_days: number;
  captured_at: string;
}

/**
 * Claim status for analysis ownership
 */
export interface ClaimStatus {
  is_claimed: boolean;
  claimed_by_current_user: boolean;
  claimed_page_id: string | null;
}

// ============================================
// Quick Diff types (lightweight deploy detection)
// ============================================

export interface QuickDiffChange {
  element: string;
  scope: "element" | "section" | "page";
  before: string;
  after: string;
  description?: string;
}

export interface QuickDiffResult {
  hasChanges: boolean;
  changes: QuickDiffChange[];
}

// ============================================
// Dashboard zone types
// ============================================

export type AttentionReason =
  | "negative_correlation" // Metric worsened after change
  | "recent_change" // Change detected, watching for impact
  | "high_impact_suggestions" // Open high-impact suggestions
  | "no_scans_yet" // New page, no baseline
  | "scan_failed"; // Last scan failed

export interface AttentionStatus {
  needs_attention: boolean;
  reason: AttentionReason | null;
  headline: string | null; // "Headline changed Tuesday"
  subheadline: string | null; // "People leaving more (+8%)"
  severity: "high" | "medium" | "low" | null;
}

export interface DashboardPageData {
  id: string;
  url: string;
  name: string | null;
  scan_frequency: string;
  metric_focus: string | null;
  created_at: string;
  last_scan: {
    id: string;
    status: string;
    created_at: string;
  } | null;
  attention_status: AttentionStatus;
}

// ============================================
// API Response types
// ============================================

export interface ChangeCheckpointSummary {
  horizon_days: number;
  assessment: string;
  computed_at: string;
}

export interface ChangesApiResponse {
  changes: (DetectedChange & { domain?: string; page_name?: string; checkpoints?: ChangeCheckpointSummary[] })[];
  stats: {
    totalValidated: number;
    totalRegressed: number;
    cumulativeImprovement: number;
  };
  pagination: {
    nextCursor?: string;
    hasMore: boolean;
  };
}

// ============================================
// Chronicle UI types
// ============================================

export type TimelineItemType = "validated" | "regressed" | "watching" | "change";

// ============================================
// Canonical Change Intelligence (RFC-0001)
// ============================================

export type HorizonDays = 7 | 14 | 30 | 60 | 90;
export type CheckpointAssessment = "improved" | "regressed" | "neutral" | "inconclusive";
export type AnalyticsProvider = "posthog" | "ga4" | "supabase" | "none";

export interface CheckpointMetrics {
  metrics: Array<{
    name: string;
    before: number;
    after: number;
    change_percent: number;
    assessment: "improved" | "regressed" | "neutral";
  }>;
  overall_assessment: CheckpointAssessment;
  reason?: string;
}

export interface ChangeCheckpoint {
  id: string;
  change_id: string;
  horizon_days: HorizonDays;
  window_before_start: string;
  window_before_end: string;
  window_after_start: string;
  window_after_end: string;
  metrics_json: CheckpointMetrics;
  assessment: CheckpointAssessment;
  confidence: number | null;
  provider: AnalyticsProvider;
  computed_at: string;
}

export type SuggestionStatus = "open" | "addressed" | "dismissed";

export interface TrackedSuggestion {
  id: string;
  page_id: string;
  user_id: string;
  title: string;
  element: string;
  suggested_fix: string;
  impact: "high" | "medium" | "low";
  status: SuggestionStatus;
  times_suggested: number;
  first_suggested_at: string;
  addressed_at: string | null;
  dismissed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StatusTransition {
  newStatus: DetectedChangeStatus;
  reason: string;
}

export type LifecycleActorType = "system" | "user" | "llm";

export interface ChangeLifecycleEvent {
  id: string;
  change_id: string;
  from_status: DetectedChangeStatus;
  to_status: DetectedChangeStatus;
  reason: string;
  actor_type: LifecycleActorType;
  actor_id: string | null;
  checkpoint_id: string | null;
  created_at: string;
}
