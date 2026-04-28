import type { Metadata } from "next";
import { Inter, Urbanist, IBM_Plex_Mono } from "next/font/google";
import { PostHogProvider } from "@/components/PostHogProvider";
import { PostHogPageView } from "@/components/PostHogPageView";
import { SentryUserProvider } from "@/components/SentryUserProvider";
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
  title: "Loupe has shut down",
  description: "Loupe has shut down. Thanks to everyone who tried it.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Loupe has shut down",
    description: "Loupe has shut down. Thanks to everyone who tried it.",
    siteName: "Loupe",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Loupe has shut down",
    description: "Loupe has shut down. Thanks to everyone who tried it.",
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
        className={`${inter.variable} ${urbanist.variable} ${ibmPlexMono.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <PostHogProvider>
          <PostHogPageView />
          <SentryUserProvider />
          <main className="flex-1">{children}</main>
        </PostHogProvider>
      </body>
    </html>
  );
}
