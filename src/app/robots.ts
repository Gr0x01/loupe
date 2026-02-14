import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/llms.txt"],
        disallow: [
          "/api/",
          "/auth/",
          "/dashboard",
          "/analysis/",
          "/pages/",
          "/settings/",
        ],
      },
    ],
    sitemap: "https://getloupe.io/sitemap.xml",
  };
}
