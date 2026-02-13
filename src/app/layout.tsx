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
    "Paste a URL. Get a full audit of your headlines, CTAs, trust signals, and layout in 60 seconds. Free, no signup.",
  openGraph: {
    title: "Loupe — Free Page Audit",
    description:
      "Paste a URL. Get a full audit of your headlines, CTAs, trust signals, and layout in 60 seconds.",
    siteName: "Loupe",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Loupe — Free Page Audit",
    description:
      "Paste a URL. Get a full audit of your headlines, CTAs, trust signals, and layout in 60 seconds.",
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
        "Monitor your web pages for meaningful changes. Catch drift in headlines, CTAs, trust signals, and layout before it costs you conversions.",
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "Free — 1 page, weekly scans",
        },
        {
          "@type": "Offer",
          price: "12",
          priceCurrency: "USD",
          description: "Starter — 3 pages, daily scans",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "12",
            priceCurrency: "USD",
            billingDuration: "P1M",
          },
        },
        {
          "@type": "Offer",
          price: "29",
          priceCurrency: "USD",
          description: "Pro — 10 pages, daily scans, mobile screenshots, unlimited analytics",
          priceSpecification: {
            "@type": "UnitPriceSpecification",
            price: "29",
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
