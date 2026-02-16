"use client";

import { useEffect, useRef, useState } from "react";
import type { TimelineItemType, ChangeCheckpointSummary } from "@/lib/types/analysis";
import { track } from "@/lib/analytics/track";

const ALL_HORIZONS = [7, 14, 30, 60, 90] as const;

interface UnifiedTimelineCardProps {
  id: string;
  type: TimelineItemType;
  element: string;
  title: string;
  description?: string;
  before?: string;
  after?: string;
  change?: string;
  friendlyText?: string;
  daysRemaining?: number;
  detectedAt?: string;
  hypothesis?: string;
  /** detected_change ID — needed for hypothesis save */
  changeId?: string;
  onHypothesisSaved?: (changeId: string, hypothesis: string) => void;
  /** Multi-horizon checkpoint data */
  checkpoints?: ChangeCheckpointSummary[];
  /** Checkpoint ID for outcome feedback */
  checkpointId?: string;
  /** Horizon days for the checkpoint */
  horizonDays?: number;
  /** Existing feedback if already submitted */
  existingFeedback?: { feedback_type: string } | null;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function HypothesisInput({
  changeId,
  onSaved,
}: {
  changeId: string;
  onSaved: (hypothesis: string) => void;
}) {
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const collapse = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setExpanded(false);
    }, 140);
  };

  useEffect(() => {
    if (!expanded || closing) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        collapse();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded, closing]);

  if (!expanded) {
    return (
      <button
        className="unified-timeline-card-hypothesis-prompt"
        onClick={() => setExpanded(true)}
      >
        What were you testing?
      </button>
    );
  }

  const handleSubmit = async () => {
    const trimmed = value.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/changes/${changeId}/hypothesis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hypothesis: trimmed }),
      });
      if (res.ok) {
        onSaved(trimmed);
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={wrapperRef} className={`unified-timeline-card-hypothesis-input ${closing ? "unified-timeline-card-hypothesis-input-closing" : ""}`}>
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleSubmit();
          if (e.key === "Escape") collapse();
        }}
        placeholder='e.g. "Testing shorter headline"'
        className="unified-timeline-card-hypothesis-field"
        maxLength={500}
        disabled={saving}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || saving}
        className="unified-timeline-card-hypothesis-save"
      >
        {saving ? "..." : "Save"}
      </button>
    </div>
  );
}

function OutcomeFeedbackUI({
  checkpointId,
  changeId,
  horizonDays,
  existingFeedback,
}: {
  checkpointId: string;
  changeId: string;
  horizonDays: number;
  existingFeedback?: { feedback_type: string } | null;
}) {
  const [state, setState] = useState<"idle" | "text" | "submitted">(
    existingFeedback ? "submitted" : "idle"
  );
  const [saving, setSaving] = useState(false);
  const [textValue, setTextValue] = useState("");
  const [closing, setClosing] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const submit = async (feedbackType: "accurate" | "inaccurate", feedbackText?: string) => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch("/api/feedback/outcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkpointId,
          changeId,
          feedbackType,
          feedbackText: feedbackText?.trim() || null,
        }),
      });
      if (res.ok || res.status === 409) {
        // 409 = already submitted (race/stale cache) — treat as success
        setState("submitted");
        if (res.ok) {
          track("outcome_feedback_submitted", { feedback_type: feedbackType, horizon_days: horizonDays });
        }
      }
    } catch {
      // silent fail
    } finally {
      setSaving(false);
    }
  };

  const collapse = () => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      setState("idle");
    }, 140);
  };

  useEffect(() => {
    if (state !== "text" || closing) return;
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        collapse();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [state, closing]);

  if (state === "submitted") {
    return (
      <p className="unified-timeline-card-feedback-done">Feedback received</p>
    );
  }

  if (state === "text") {
    return (
      <div
        ref={wrapperRef}
        className={`unified-timeline-card-feedback-text ${closing ? "unified-timeline-card-feedback-text-closing" : ""}`}
      >
        <input
          autoFocus
          type="text"
          value={textValue}
          onChange={(e) => setTextValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit("inaccurate", textValue);
            if (e.key === "Escape") collapse();
          }}
          placeholder="What was wrong? (optional)"
          className="unified-timeline-card-hypothesis-field"
          maxLength={500}
          disabled={saving}
        />
        <button
          onClick={() => submit("inaccurate", textValue)}
          disabled={saving}
          className="unified-timeline-card-hypothesis-save"
        >
          {saving ? "..." : "Send"}
        </button>
      </div>
    );
  }

  return (
    <div className="unified-timeline-card-feedback-row">
      <span className="unified-timeline-card-feedback-label">Was this accurate?</span>
      <button
        className="unified-timeline-card-feedback-btn unified-timeline-card-feedback-btn-accurate"
        onClick={() => submit("accurate")}
        disabled={saving}
        title="Yes, accurate"
      >
        Accurate
      </button>
      <button
        className="unified-timeline-card-feedback-btn unified-timeline-card-feedback-btn-inaccurate"
        onClick={() => setState("text")}
        disabled={saving}
        title="No, inaccurate"
      >
        Not accurate
      </button>
    </div>
  );
}

function getChipClass(assessment: string): string {
  switch (assessment) {
    case "improved": return "dossier-chip-emerald";
    case "regressed": return "dossier-chip-coral";
    case "neutral":
    case "inconclusive":
    default: return "dossier-chip-gray";
  }
}

function CheckpointChips({
  checkpoints,
  compact = false,
}: {
  checkpoints: ChangeCheckpointSummary[];
  compact?: boolean;
}) {
  const byHorizon = new Map(checkpoints.map((cp) => [cp.horizon_days, cp]));

  return (
    <div className={`dossier-checkpoint-chips ${compact ? "dossier-checkpoint-chips-compact" : ""}`}>
      {ALL_HORIZONS.map((h) => {
        const cp = byHorizon.get(h);
        if (!cp) {
          return (
            <span key={h} className="dossier-chip dossier-chip-future">
              {h}d
            </span>
          );
        }
        return (
          <span
            key={h}
            className={`dossier-chip ${getChipClass(cp.assessment)}`}
            title={cp.reasoning || `${cp.assessment} at ${h}d`}
          >
            {h}d
          </span>
        );
      })}
    </div>
  );
}

function EvidencePanel({
  checkpoints,
  hypothesis,
  feedback,
}: {
  checkpoints: ChangeCheckpointSummary[];
  hypothesis?: string;
  feedback?: {
    checkpointId: string;
    changeId: string;
    horizonDays: number;
    existingFeedback?: { feedback_type: string } | null;
  } | null;
}) {
  const [open, setOpen] = useState(false);

  // Only show completed checkpoints (not pending)
  const completed = checkpoints.filter((cp) => cp.reasoning);
  if (completed.length === 0) return null;

  return (
    <div className="dossier-evidence-panel">
      <button
        className={`dossier-evidence-toggle ${open ? "dossier-evidence-toggle-open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        {open ? "Hide evidence" : "View evidence"}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="dossier-evidence-content">
          {hypothesis && (
            <p className="dossier-evidence-hypothesis">
              Your test: &ldquo;{hypothesis}&rdquo;
            </p>
          )}
          {completed.map((cp) => (
            <div key={cp.horizon_days} className="dossier-evidence-checkpoint">
              <div className="dossier-evidence-checkpoint-header">
                <span className={`dossier-chip ${getChipClass(cp.assessment)}`}>
                  {cp.horizon_days}d
                </span>
                {cp.confidence != null && (
                  <span className="dossier-evidence-confidence">
                    {Math.round(cp.confidence * 100)}% confidence
                  </span>
                )}
                <span className="dossier-evidence-date">
                  {formatDate(cp.computed_at)}
                </span>
              </div>
              {cp.reasoning && (
                <p className="dossier-evidence-reasoning">{cp.reasoning}</p>
              )}
              {cp.metrics_json?.metrics && cp.metrics_json.metrics.length > 0 && (
                <div className="dossier-evidence-metrics">
                  {cp.metrics_json.metrics.map((m) => (
                    <span key={m.name} className={`dossier-evidence-metric dossier-evidence-metric-${m.assessment}`}>
                      {m.name}: {m.before} &rarr; {m.after}{" "}
                      <strong>{m.change_percent > 0 ? "+" : ""}{m.change_percent}%</strong>
                    </span>
                  ))}
                </div>
              )}
              {cp.data_sources.length > 0 && (
                <div className="dossier-evidence-sources">
                  {cp.data_sources.map((src) => (
                    <span key={src} className="dossier-evidence-source-badge">{src}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
          {feedback && (
            <div className="dossier-evidence-feedback">
              <OutcomeFeedbackUI
                checkpointId={feedback.checkpointId}
                changeId={feedback.changeId}
                horizonDays={feedback.horizonDays}
                existingFeedback={feedback.existingFeedback}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * For validated/regressed cards, the layout is inverted:
 * outcome (friendlyText + delta) is the hero, diff is supporting context.
 * For watching/change cards, the layout stays diff-first.
 */
export function UnifiedTimelineCard({
  id,
  type,
  element,
  title,
  before,
  after,
  change,
  friendlyText,
  detectedAt,
  hypothesis,
  changeId,
  onHypothesisSaved,
  checkpoints,
  checkpointId,
  horizonDays,
  existingFeedback,
}: UnifiedTimelineCardProps) {
  const [localHypothesis, setLocalHypothesis] = useState(hypothesis);
  const formattedDate = formatDate(detectedAt);
  const hasDiff = Boolean(before && after);
  const hasOutcome = type === "validated" || type === "regressed";
  const hasCheckpoints = Boolean(checkpoints && checkpoints.length > 0);
  const showHeaderMeta =
    (hasOutcome && hasCheckpoints) ||
    type === "watching" ||
    (type === "change" && Boolean(formattedDate));
  const canInputHypothesis = type === "watching" && changeId && !localHypothesis;
  const feedbackConfig =
    hasOutcome && checkpointId && changeId && horizonDays != null
      ? {
          checkpointId,
          changeId,
          horizonDays,
          existingFeedback,
        }
      : null;

  return (
    <article
      id={id}
      className={`unified-timeline-card unified-timeline-card-${type}`}
    >
      <div className={`unified-timeline-card-accent unified-timeline-card-accent-${type}`} />
      <div className="unified-timeline-card-body">
      {/* Header: element name + trajectory chips (or fallback state badge) */}
      <div className="unified-timeline-card-header">
        <div className="unified-timeline-card-heading">
          <span className="unified-timeline-card-element">{element}</span>
          {title && !hasOutcome && (
            <p className="unified-timeline-card-title">{title}</p>
          )}
        </div>
        {showHeaderMeta ? (
          <div className="unified-timeline-card-meta">
            {type === "change" && formattedDate ? (
              <span className="unified-timeline-card-date">{formattedDate}</span>
            ) : (
              <CheckpointChips checkpoints={checkpoints || []} compact />
            )}
          </div>
        ) : null}
      </div>

      {/* Hypothesis — show inline for non-outcome cards only */}
      {!hasOutcome && localHypothesis && (
        <p className="unified-timeline-card-hypothesis">
          Your test: &ldquo;{localHypothesis}&rdquo;
        </p>
      )}
      {canInputHypothesis && (
        <HypothesisInput
          changeId={changeId}
          onSaved={(h) => {
            setLocalHypothesis(h);
            onHypothesisSaved?.(changeId, h);
          }}
        />
      )}

      {/* Validated/regressed: outcome is the hero */}
      {hasOutcome && (
        <div className="unified-timeline-card-outcome">
          {change && (
            <span
              className={`unified-timeline-card-outcome-delta ${
                type === "validated"
                  ? "unified-timeline-card-outcome-delta-positive"
                  : "unified-timeline-card-outcome-delta-negative"
              }`}
            >
              {type === "validated" ? "\u2191" : "\u2193"}
              {change.replace(/[+-]/, "")}
            </span>
          )}
          {friendlyText && (
            <p className="unified-timeline-card-outcome-text">{friendlyText}</p>
          )}
        </div>
      )}

      {/* Outcome cards: evidence stays in body, chips move to header */}
      {hasOutcome && hasCheckpoints && checkpoints && (
        <EvidencePanel
          checkpoints={checkpoints}
          hypothesis={localHypothesis}
          feedback={feedbackConfig}
        />
      )}

      {/* Diff: before → after (supporting context for outcome cards, primary for others) */}
      {hasDiff && (
        <div className={`unified-timeline-card-diff ${hasOutcome ? "unified-timeline-card-diff-secondary" : ""}`}>
          <span className="unified-timeline-card-before">&ldquo;{before}&rdquo;</span>
          <span className="unified-timeline-card-arrow">&rarr;</span>
          <span className="unified-timeline-card-after">&ldquo;{after}&rdquo;</span>
        </div>
      )}

      {/* FriendlyText for non-outcome cards (watching/change) */}
      {!hasOutcome && friendlyText && (
        <p className="unified-timeline-card-friendly">{friendlyText}</p>
      )}

      {/* Footer — keep date on outcome cards only */}
      {hasOutcome && (
        <div className="unified-timeline-card-footer">
          {formattedDate && (
            <span className="unified-timeline-card-date">{formattedDate}</span>
          )}
        </div>
      )}
      </div>
    </article>
  );
}
