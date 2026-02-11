"use client";

import { useMemo } from "react";
import type { Change, ValidatedItem, WatchingItem, TimelineItemType } from "@/lib/types/analysis";
import { UnifiedTimelineCard } from "./UnifiedTimelineCard";

interface UnifiedTimelineProps {
  changes: Change[];
  validatedItems?: ValidatedItem[];
  watchingItems?: WatchingItem[];
  /** Set to true if post-analysis had an error */
  hasError?: boolean;
}

interface TimelineItem {
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
}

/**
 * Generate a stable ID for timeline items
 */
function getTimelineItemId(item: Change | ValidatedItem | WatchingItem, type: string): string {
  if ("id" in item && item.id) {
    return `timeline-${type}-${item.id}`;
  }
  // For changes without ID, create from element + detectedAt
  if ("detectedAt" in item) {
    const slug = `${item.element}-${item.detectedAt}`
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "");
    return `timeline-change-${slug}`;
  }
  // Fallback
  return `timeline-${type}-${item.element.toLowerCase().replace(/\s+/g, "-")}`;
}

/**
 * Transform validated items into timeline items
 */
function mapValidatedItems(items: ValidatedItem[]): TimelineItem[] {
  return items.map((item) => {
    // Determine if this is a positive or negative correlation
    const changeNum = parseFloat(item.change.replace(/[^-0-9.]/g, "")) || 0;
    const isPositive = changeNum > 0;

    return {
      id: getTimelineItemId(item, isPositive ? "validated" : "regressed"),
      type: isPositive ? "validated" : "regressed",
      element: item.element,
      title: item.title,
      change: item.change,
      friendlyText: item.friendlyText,
    };
  });
}

/**
 * Transform watching items into timeline items
 */
function mapWatchingItems(items: WatchingItem[]): TimelineItem[] {
  return items.map((item) => ({
    id: getTimelineItemId(item, "watching"),
    type: "watching" as const,
    element: item.element,
    title: item.title,
    daysRemaining: Math.max(0, item.daysNeeded - item.daysOfData),
    detectedAt: item.firstDetectedAt,
  }));
}

/**
 * Transform changes into timeline items (only if not already in validated/watching)
 */
function mapChanges(
  changes: Change[],
  validatedElements: Set<string>,
  watchingElements: Set<string>
): TimelineItem[] {
  return changes
    .filter((change) => {
      // Skip if this change is already shown as validated or watching
      return !validatedElements.has(change.element) && !watchingElements.has(change.element);
    })
    .map((change) => ({
      id: getTimelineItemId(change, "change"),
      type: "change" as const,
      element: change.element,
      title: change.description,
      before: change.before,
      after: change.after,
      detectedAt: change.detectedAt,
    }));
}

export function UnifiedTimeline({
  changes,
  validatedItems = [],
  watchingItems = [],
  hasError = false,
}: UnifiedTimelineProps) {
  // Memoize timeline items to avoid recalculation on every render
  const allItems = useMemo(() => {
    // Track which elements are in validated/watching to avoid duplicates
    const validatedElements = new Set(validatedItems.map((i) => i.element));
    const watchingElements = new Set(watchingItems.map((i) => i.element));

    // Build timeline items in priority order
    const validatedTimelineItems = mapValidatedItems(validatedItems);
    const watchingTimelineItems = mapWatchingItems(watchingItems);
    const changeTimelineItems = mapChanges(changes, validatedElements, watchingElements);

    // Sort: validated/regressed first, then watching, then other changes
    return [
      // Validated wins first
      ...validatedTimelineItems.filter((i) => i.type === "validated"),
      // Regressed items
      ...validatedTimelineItems.filter((i) => i.type === "regressed"),
      // Watching items
      ...watchingTimelineItems,
      // Remaining changes
      ...changeTimelineItems,
    ] as TimelineItem[];
  }, [changes, validatedItems, watchingItems]);

  const isEmpty = allItems.length === 0;

  return (
    <section className="chronicle-section">
      <div className="chronicle-section-header">
        <h2
          className="text-2xl font-bold text-text-primary"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Changes we caught
        </h2>
      </div>

      {isEmpty ? (
        <div className="glass-card p-6 text-center">
          {hasError ? (
            <p className="text-text-secondary">
              Change detection unavailable for this scan.
            </p>
          ) : (
            <p className="text-text-secondary">
              No changes detected since your last scan. Your page is stable.
            </p>
          )}
        </div>
      ) : (
        <div className="unified-timeline">
          {allItems.map((item) => (
            <UnifiedTimelineCard
              key={item.id}
              id={item.id}
              type={item.type}
              element={item.element}
              title={item.title}
              description={item.description}
              before={item.before}
              after={item.after}
              change={item.change}
              friendlyText={item.friendlyText}
              daysRemaining={item.daysRemaining}
              detectedAt={item.detectedAt}
            />
          ))}
        </div>
      )}
    </section>
  );
}
