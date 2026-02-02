import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  weight: "400",
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
        className={`${dmSans.variable} ${instrumentSerif.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
