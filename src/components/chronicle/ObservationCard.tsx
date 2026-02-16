"use client";

import type { ValidatedItem } from "@/lib/types/analysis";

interface ObservationCardProps {
  observations: Array<{ changeId: string; text: string }>;
  validatedItems?: ValidatedItem[];
}

export function ObservationCard({ observations, validatedItems = [] }: ObservationCardProps) {
  if (!observations.length) return null;

  // Map changeId → element name for richer display
  const itemMap = new Map<string, ValidatedItem>();
  for (const item of validatedItems) {
    if (item.id) itemMap.set(item.id, item);
  }

  return (
    <section className="dossier-observations">
      <h3 className="dossier-observations-label">Analyst notes</h3>
      <div className="dossier-observations-list">
        {observations.map((obs) => {
          const item = itemMap.get(obs.changeId);
          const elementName = item?.element;
          return (
            <div key={obs.changeId} className="dossier-observation">
              <div className="dossier-observation-accent" />
              <div className="dossier-observation-body">
                {elementName && (
                  <span className="dossier-observation-element">{elementName}</span>
                )}
                <p className="dossier-observation-text">{obs.text}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
