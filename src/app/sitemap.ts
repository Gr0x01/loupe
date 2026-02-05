import { MetadataRoute } from "next";

const BASE_URL = "https://getloupe.io";

// Tool pages for /for/[tool]
const AI_TOOLS = ["lovable", "bolt", "cursor", "v0", "replit", "base44"] as const;

// Integration guides for /guides/[integration]
const INTEGRATIONS = ["posthog", "ga4", "github"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Static marketing pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/website-audit`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/monitor-website-changes`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/alternatives/visualping`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Dynamic tool pages: /for/[tool]
  const toolPages: MetadataRoute.Sitemap = AI_TOOLS.map((tool) => ({
    url: `${BASE_URL}/for/${tool}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  // Dynamic integration guides: /guides/[integration]
  const guidePages: MetadataRoute.Sitemap = INTEGRATIONS.map((integration) => ({
    url: `${BASE_URL}/guides/${integration}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  return [...staticPages, ...toolPages, ...guidePages];
}
