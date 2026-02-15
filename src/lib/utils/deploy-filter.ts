import { extractRouteFromUrl } from "./commit-filter";

/** Files that never affect visual output — always skip */
const NON_VISUAL_PREFIXES = [
  "src/app/api/",
  "src/lib/",
  "memory-bank/",
  "inngest/",
  ".github/",
  ".vscode/",
];

const NON_VISUAL_EXACT = new Set([
  ".gitignore",
  ".eslintrc.json",
  "tsconfig.json",
  "package.json",
  "package-lock.json",
  "CLAUDE.md",
]);

/** Files that affect every page — always scan */
const GLOBAL_PATTERNS = [
  "src/app/layout.tsx",
  "src/app/globals.css",
  "src/app/shared.css",
  "public/",
  "tailwind.config",
  "next.config",
  "postcss.config",
];

/** Component dirs → route they affect */
const COMPONENT_ROUTE_MAP: Record<string, string[]> = {
  "src/components/landing/": ["/"],
  "src/components/dashboard/": ["/dashboard"],
  "src/components/chronicle/": ["/analysis"],
  "src/components/pricing/": ["/pricing"],
  "src/components/seo/": [
    "/monitor-website-changes",
    "/website-audit",
    "/alternatives",
    "/for",
    "/guides",
  ],
};

/** CSS files → route they affect */
const CSS_ROUTE_MAP: Record<string, string[]> = {
  "landing.css": ["/"],
  "hero-bg.css": ["/"],
  "hero-tablet.css": ["/"],
  "dashboard.css": ["/dashboard"],
  "chronicle.css": ["/analysis"],
  "analysis.css": ["/analysis"],
  "pricing.css": ["/pricing"],
};

/**
 * Determine if a deploy's changed files could visually affect a given page.
 * Conservative: returns true for unknown files.
 */
export function couldAffectPage(
  changedFiles: string[],
  pageUrl: string
): boolean {
  if (!changedFiles || changedFiles.length === 0) return true;

  const route = extractRouteFromUrl(pageUrl);

  for (const file of changedFiles) {
    // Skip non-visual files
    if (NON_VISUAL_PREFIXES.some((p) => file.startsWith(p))) continue;
    if (NON_VISUAL_EXACT.has(file)) continue;
    if (file.startsWith(".")) continue;

    // Global files affect all pages
    if (GLOBAL_PATTERNS.some((p) => file.startsWith(p))) return true;

    // Root-level shared components affect all pages
    if (
      file.startsWith("src/components/") &&
      !file.includes("/", "src/components/".length)
    ) {
      return true;
    }

    // Route-scoped app dirs: src/app/dashboard/ → /dashboard
    if (file.startsWith("src/app/")) {
      const appRelative = file.slice("src/app/".length);
      const fileRoute =
        appRelative.includes("/")
          ? "/" + appRelative.split("/")[0]
          : "/";

      if (fileRoute === route || (fileRoute === "/" && route === "/"))
        return true;
      // Known app route that doesn't match → skip
      continue;
    }

    // Component directory mapping
    let matched = false;
    for (const [dir, routes] of Object.entries(COMPONENT_ROUTE_MAP)) {
      if (file.startsWith(dir)) {
        if (routes.some((r) => route === r || route.startsWith(r + "/")))
          return true;
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // CSS file mapping
    const cssFile = file.split("/").pop() || "";
    if (cssFile in CSS_ROUTE_MAP) {
      if (
        CSS_ROUTE_MAP[cssFile].some(
          (r) => route === r || route.startsWith(r + "/")
        )
      )
        return true;
      continue;
    }

    // Unknown file — conservative, assume it could affect this page
    return true;
  }

  return false;
}
