"use client";

import type { ValidatedItem } from "@/lib/types/analysis";

interface ObservationCardProps {
  observations: Array<{ changeId: string; text: string }>;
  validatedItems?: ValidatedItem[];
}

export function ObservationCard({ observations, validatedItems = [] }: ObservationCardProps) {
  if (!observations.length) return null;

  // Map changeId → element name for richer display
  const elementMap = new Map<string, string>();
  for (const item of validatedItems) {
    if (item.id) elementMap.set(item.id, item.element);
  }

  return (
    <section className="dossier-observations">
      <h3 className="dossier-observations-label">Analyst notes</h3>
      <div className="dossier-observations-list">
        {observations.map((obs) => {
          const elementName = elementMap.get(obs.changeId);
          return (
            <div key={obs.changeId} className="dossier-observation">
              {elementName && (
                <span className="dossier-observation-element">{elementName}</span>
              )}
              <p className="dossier-observation-text">{obs.text}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
