"use client";

import type { WatchingItem } from "@/lib/types/analysis";

interface WatchingStripProps {
  items: WatchingItem[];
}

export function WatchingStrip({ items }: WatchingStripProps) {
  if (items.length === 0) return null;

  return (
    <div className="chronicle-watching-strip">
      <p className="chronicle-watching-strip-label">Still tracking</p>
      <div className="chronicle-watching-strip-pills">
        {items.map((item) => {
          const daysLeft = Math.max(0, item.daysNeeded - item.daysOfData);
          return (
            <div key={item.id || item.element} className="watching-pill">
              <span className="watching-pill-dot" />
              <span className="watching-pill-element">{item.element}</span>
              <span className="watching-pill-days">
                {daysLeft > 0 ? `results in ${daysLeft}d` : "results soon"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
