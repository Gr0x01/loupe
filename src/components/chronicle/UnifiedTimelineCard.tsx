"use client";

import { useEffect, useRef, useState } from "react";
import type { TimelineItemType } from "@/lib/types/analysis";

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
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getStatusLabel(type: TimelineItemType, daysRemaining?: number): string {
  switch (type) {
    case "validated":
      return "Impact confirmed";
    case "regressed":
      return "Performance dropped";
    case "watching":
      return daysRemaining
        ? `Results in ${daysRemaining}d`
        : "Measuring impact";
    default:
      return "";
  }
}

function getTypeLabel(type: TimelineItemType): string {
  switch (type) {
    case "validated":
      return "Confirmed";
    case "regressed":
      return "Dropped";
    case "watching":
      return "Tracking";
    default:
      return "Open";
  }
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
  daysRemaining,
  detectedAt,
  hypothesis,
  changeId,
  onHypothesisSaved,
}: UnifiedTimelineCardProps) {
  const [localHypothesis, setLocalHypothesis] = useState(hypothesis);
  const statusLabel = getStatusLabel(type, daysRemaining);
  const typeLabel = getTypeLabel(type);
  const formattedDate = formatDate(detectedAt);
  const hasDiff = Boolean(before && after);
  const hasOutcome = type === "validated" || type === "regressed";
  const canInputHypothesis = type === "watching" && changeId && !localHypothesis;

  return (
    <article
      id={id}
      className={`unified-timeline-card unified-timeline-card-${type}`}
    >
      <div className={`unified-timeline-card-accent unified-timeline-card-accent-${type}`} />
      <div className="unified-timeline-card-body">
      {/* Header: element name + state badge */}
      <div className="unified-timeline-card-header">
        <div className="unified-timeline-card-heading">
          <span className="unified-timeline-card-element">{element}</span>
          {title && !hasOutcome && (
            <p className="unified-timeline-card-title">{title}</p>
          )}
        </div>
        {hasOutcome && (
          <div className="unified-timeline-card-meta">
            <span className={`unified-timeline-card-state unified-timeline-card-state-${type}`}>
              {typeLabel}
            </span>
          </div>
        )}
      </div>

      {/* Hypothesis — display saved or show input for watching cards */}
      {localHypothesis && (
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

      {/* Footer — watching shows days left, others show date */}
      <div className="unified-timeline-card-footer">
        {type === "watching" ? (
          <span className="unified-timeline-card-status">{statusLabel}</span>
        ) : (
          formattedDate && (
            <span className="unified-timeline-card-date">{formattedDate}</span>
          )
        )}
      </div>
      </div>
    </article>
  );
}
