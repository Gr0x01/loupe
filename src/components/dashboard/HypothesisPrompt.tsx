"use client";

import { useState } from "react";

interface HypothesisPromptProps {
  changeId: string;
  elementName: string;
  onSubmit: () => void;
  onDismiss: () => void;
}

export function HypothesisPrompt({
  changeId,
  elementName,
  onSubmit,
  onDismiss,
}: HypothesisPromptProps) {
  const [hypothesis, setHypothesis] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const trimmed = hypothesis.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/changes/${changeId}/hypothesis`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hypothesis: trimmed }),
      });
      if (res.ok) {
        onSubmit();
      } else if (res.status === 404) {
        onDismiss();
      }
    } catch {
      // Silent fail — not critical
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-card p-4 sm:p-5 mb-6">
      <p className="text-sm font-medium text-ink-700 mb-3">
        We noticed <span className="font-semibold text-ink-900">{elementName}</span> changed.
        What were you testing?
      </p>
      <div className="flex items-stretch gap-3">
        <input
          type="text"
          value={hypothesis}
          onChange={(e) => setHypothesis(e.target.value)}
          placeholder="e.g. Testing outcome-focused language to increase signups"
          className="input-glass flex-1 text-sm"
          maxLength={500}
          onKeyDown={(e) => {
            if (e.key === "Enter" && hypothesis.trim()) handleSubmit();
          }}
          autoFocus
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !hypothesis.trim()}
          className="btn-primary text-sm whitespace-nowrap"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs text-ink-400 hover:text-ink-600 mt-2 transition-colors"
      >
        Dismiss
      </button>
    </div>
  );
}
