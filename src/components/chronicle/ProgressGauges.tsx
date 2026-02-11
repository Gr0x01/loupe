"use client";

interface ProgressGaugesProps {
  validated: number;
  watching: number;
  open: number;
  /** Maximum dots to show per row (additional shown as number) */
  maxDots?: number;
}

function GaugeRow({
  count,
  label,
  dotClass,
  maxDots = 5,
}: {
  count: number;
  label: string;
  dotClass: string;
  maxDots?: number;
}) {
  if (count === 0) return null;

  const dotsToShow = Math.min(count, maxDots);
  const emptyDots = Math.max(0, maxDots - dotsToShow);

  return (
    <div
      className="progress-gauge-row"
      role="img"
      aria-label={`${count} ${label}`}
    >
      <div className="progress-gauge-dots" aria-hidden="true">
        {/* Filled dots */}
        {Array.from({ length: dotsToShow }).map((_, i) => (
          <span key={`filled-${i}`} className={`progress-gauge-dot ${dotClass}`} />
        ))}
        {/* Empty dots (only show if count < maxDots) */}
        {emptyDots > 0 &&
          Array.from({ length: emptyDots }).map((_, i) => (
            <span key={`empty-${i}`} className="progress-gauge-dot progress-gauge-dot-empty" />
          ))}
      </div>
      <span className="progress-gauge-label">
        <span className="progress-gauge-count">{count}</span> {label}
      </span>
    </div>
  );
}

export function ProgressGauges({
  validated,
  watching,
  open,
  maxDots = 5,
}: ProgressGaugesProps) {
  const hasAny = validated > 0 || watching > 0 || open > 0;

  if (!hasAny) return null;

  return (
    <div className="progress-gauges">
      <GaugeRow
        count={validated}
        label="validated"
        dotClass="progress-gauge-dot-validated"
        maxDots={maxDots}
      />
      <GaugeRow
        count={watching}
        label="watching"
        dotClass="progress-gauge-dot-watching"
        maxDots={maxDots}
      />
      <GaugeRow
        count={open}
        label="open"
        dotClass="progress-gauge-dot-open"
        maxDots={maxDots}
      />
    </div>
  );
}
