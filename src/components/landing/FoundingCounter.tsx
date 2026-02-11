"use client";

import { useEffect, useRef } from "react";

interface FoundingCounterProps {
  claimed: number;
  total: number;
}

export default function FoundingCounter({ claimed, total }: FoundingCounterProps) {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pct = Math.round((claimed / total) * 100);
    const raf = requestAnimationFrame(() => {
      if (fillRef.current) {
        fillRef.current.style.width = `${pct}%`;
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [claimed, total]);

  return (
    <div className="mt-3 landing-hero-founding">
      <div className="founding-counter-pill">
        <div className="founding-counter-track">
          <div
            ref={fillRef}
            className="founding-counter-fill"
            style={{ width: "0%" }}
          />
        </div>
        <span className="text-[12px] font-medium text-coral">
          {claimed} of {total} founding spots claimed
        </span>
      </div>
    </div>
  );
}
