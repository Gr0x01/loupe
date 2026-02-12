"use client";

interface ProgressGaugesProps {
  validated: number;
  watching: number;
  open: number;
  /** Scale cap for progress bars */
  scaleCap?: number;
}

function GaugeRow({
  count,
  label,
  tone,
  maxCount,
}: {
  count: number;
  label: string;
  tone: "validated" | "watching" | "open";
  maxCount: number;
}) {
  const ratio = maxCount > 0 ? count / maxCount : 0;
  const minVisibleRatio = count > 0 ? 0.24 : 0;
  const fillRatio = count > 0 ? Math.max(minVisibleRatio, ratio) : 0;

  return (
    <div
      className={`progress-gauge-row progress-gauge-row-${tone}`}
      role="img"
      aria-label={`${count} ${label}`}
    >
      <span
        className={`progress-gauge-indicator progress-gauge-indicator-${tone}`}
        aria-hidden="true"
      />
      <span className="progress-gauge-label">{label}</span>
      <div className="progress-gauge-track" aria-hidden="true">
        <span
          className={`progress-gauge-fill progress-gauge-fill-${tone}`}
          style={{ width: `${fillRatio * 100}%` }}
        />
      </div>
      <span className="progress-gauge-count">{count}</span>
    </div>
  );
}

export function ProgressGauges({
  validated,
  watching,
  open,
  scaleCap = 5,
}: ProgressGaugesProps) {
  const hasAny = validated > 0 || watching > 0 || open > 0;
  const maxCount = Math.max(validated, watching, open, scaleCap);

  if (!hasAny) return null;

  return (
    <div className="progress-gauges">
      <GaugeRow
        count={validated}
        label="confirmed"
        tone="validated"
        maxCount={maxCount}
      />
      <GaugeRow
        count={watching}
        label="tracking"
        tone="watching"
        maxCount={maxCount}
      />
      <GaugeRow
        count={open}
        label="unresolved"
        tone="open"
        maxCount={maxCount}
      />
    </div>
  );
}
