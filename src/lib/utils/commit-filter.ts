import type { CommitData } from "@/lib/types/analysis";

/**
 * Extract the route path from a full URL.
 * e.g. "https://getloupe.io/pricing" → "/pricing"
 *      "https://getloupe.io" → "/"
 */
export function extractRouteFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.pathname || "/";
  } catch {
    return "/";
  }
}

/**
 * Score a commit's relevance to a specific page route.
 *
 * Scoring:
 * - 100pts: Exact route match (e.g. src/app/pricing/* for /pricing)
 * - 30pts: Shared components (src/components/*)
 * - 10pts: Other frontend files (.tsx, .css, src/app/*, public/*)
 * - 1pt: Everything else (backend, config, etc.)
 */
export function scoreCommit(commit: CommitData, route: string): number {
  let score = 0;

  // Normalize route: "/" → root app route, "/pricing" → "pricing"
  const routeSegment = route === "/" ? "" : route.replace(/^\//, "").replace(/\/$/, "");

  // Build the expected app directory pattern for this route
  // "/" → "src/app/" (root page/layout)
  // "/pricing" → "src/app/pricing/"
  const routeAppDir = routeSegment
    ? `src/app/${routeSegment}/`
    : "src/app/";

  for (const file of commit.files) {
    if (routeSegment && file.startsWith(routeAppDir)) {
      // Exact route match
      score += 100;
    } else if (routeSegment === "" && file.startsWith("src/app/") && !file.includes("/", "src/app/".length)) {
      // Root route: match files directly in src/app/ (page.tsx, layout.tsx)
      score += 100;
    } else if (file.startsWith("src/components/")) {
      // Shared components
      score += 30;
    } else if (
      file.endsWith(".tsx") ||
      file.endsWith(".css") ||
      file.startsWith("src/app/") ||
      file.startsWith("public/")
    ) {
      // Other frontend files
      score += 10;
    } else {
      // Everything else
      score += 1;
    }
  }

  return score;
}

/**
 * Filter commits to the most relevant ones for a given page URL.
 * Returns top 1-3 commits sorted by score, then chronological order.
 * If all commits score 0, returns the most recent 1.
 */
export function filterRelevantCommits(
  commits: CommitData[],
  pageUrl: string,
  max: number = 3
): CommitData[] {
  if (!commits || commits.length === 0) return [];
  if (commits.length <= max) return commits;

  const route = extractRouteFromUrl(pageUrl);

  const scored = commits.map((commit) => ({
    commit,
    score: scoreCommit(commit, route),
  }));

  // If all score 0, return most recent commit
  const maxScore = Math.max(...scored.map((s) => s.score));
  if (maxScore === 0) {
    return [commits[commits.length - 1]];
  }

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);
  const topScored = scored.slice(0, max);

  // Re-sort by chronological order (timestamp ascending)
  topScored.sort(
    (a, b) => new Date(a.commit.timestamp).getTime() - new Date(b.commit.timestamp).getTime()
  );

  return topScored.map((s) => s.commit);
}
