import type { Metadata } from "next";
import { DM_Sans, Inter_Tight } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PostHogPageView } from "@/components/PostHogPageView";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const interTight = Inter_Tight({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Loupe — Your site changed. Did you notice?",
  description:
    "Paste a URL. Get a full audit of your headlines, CTAs, trust signals, and layout in 60 seconds. Free, no signup.",
  openGraph: {
    title: "Loupe — Free Page Audit",
    description:
      "Paste a URL. Get a full audit of your headlines, CTAs, trust signals, and layout in 60 seconds.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${dmSans.variable} ${interTight.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <PostHogProvider>
          <PostHogPageView />
          {children}
        </PostHogProvider>
      </body>
    </html>
  );
}
