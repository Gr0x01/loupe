import type { Metadata } from "next";
import { Inter, Urbanist, IBM_Plex_Mono } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PostHogPageView } from "@/components/PostHogPageView";
import { SentryUserProvider } from "@/components/SentryUserProvider";
import SiteNav from "@/components/SiteNav";
import SiteFooter from "@/components/SiteFooter";
import "./globals.css";

// Soft Brutalism 2.0 typography
// Keep CSS variable names for compatibility with existing components
const inter = Inter({
  variable: "--font-dm-sans", // Body font
  subsets: ["latin"],
});

const urbanist = Urbanist({
  variable: "--font-display", // Headline font
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-geist-mono", // Mono font
  weight: ["400", "500", "600"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://getloupe.io"),
  title: "Loupe — Your site changed. Did you notice?",
  description:
    "Loupe monitors your web pages and correlates changes with metrics like bounce rate and signups. Know which deploy helped, which one hurt, and what to do next.",
  openGraph: {
    title: "Loupe — Your site changed. Did you notice?",
    description:
      "Monitor your site, detect changes, and see how they affect your metrics. Built for solo founders shipping fast.",
    siteName: "Loupe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loupe — Your site changed. Did you notice?",
    description:
      "Monitor your site, detect changes, and see how they affect your metrics. Built for solo founders shipping fast.",
  },
};

// JSON-LD structured data for rich snippets
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://getloupe.io/#organization",
      name: "Loupe",
      url: "https://getloupe.io",
      logo: {
        "@type": "ImageObject",
        url: "https://getloupe.io/logo-square.png",
      },
      sameAs: [],
    },
    {
      "@type": "WebSite",
      "@id": "https://getloupe.io/#website",
      url: "https://getloupe.io",
      name: "Loupe",
      publisher: { "@id": "https://getloupe.io/#organization" },
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://getloupe.io/#app",
      name: "Loupe",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Loupe connects page changes to business outcomes. It monitors your web pages for meaningful changes — headlines, CTAs, layout, trust signals — and correlates them with metrics like bounce rate, signups, and conversions. Know which deploy helped, which one hurt, and what to do next. Built for solo founders and small teams shipping fast with tools like Cursor, Lovable, and Bolt.",
      featureList: [
        "AI-powered page audit with actionable findings",
        "Automated page change detection and monitoring",
        "Change-to-metric correlation (bounce rate, signups, conversions)",
        "Deploy impact analysis — see what each deploy did to your numbers",
        "PostHog and GA4 analytics integration",
        "GitHub webhook integration for deploy-triggered scans",
        "Desktop and mobile screenshot comparison",
        "Weekly and daily automated scanning",
        "Hypothesis tracking — log what you changed and why",
        "Observation reports linking changes to metric movements",
      ],
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free — 1 page, weekly scans",
        },
        {
          "@type": "Offer",
          price: "39",
          priceCurrency: "USD",
          description: "Pro — 5 pages, daily scans, mobile screenshots, 30-day impact follow-up",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "39",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
        {
          "@type": "Offer",
          price: "99",
          priceCurrency: "USD",
          description: "Scale — 15 pages, daily scans, mobile screenshots, 90-day impact follow-up",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "99",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
      ],
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${inter.variable} ${urbanist.variable} ${ibmPlexMono.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <PostHogProvider>
          <PostHogPageView />
          <SentryUserProvider />
          <SiteNav />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </PostHogProvider>
      </body>
    </html>
  );
}
