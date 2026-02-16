import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const GUIDE_PUBLISHED_AT = "2026-02-16T00:00:00.000Z";
const GUIDE_UPDATED_AT = "2026-02-16T00:00:00.000Z";

// #1 — Metadata with OG, Twitter, canonical
export const metadata: Metadata = {
  title: "PostHog Analytics Integration Setup Guide — Loupe",
  description:
    "Connect PostHog to Loupe and correlate page changes with your analytics. Step-by-step setup guide with API key, Project ID, and host configuration.",
  keywords: [
    "posthog integration",
    "posthog website monitoring",
    "posthog analytics correlation",
    "connect posthog loupe",
    "posthog api key setup",
    "website change analytics",
    "posthog page change tracking",
    "posthog conversion correlation",
    "analytics change attribution",
    "posthog self-hosted integration",
  ],
  openGraph: {
    title: "PostHog Analytics Integration Setup Guide — Loupe",
    description:
      "Connect PostHog to Loupe and see how page changes affect your metrics. Step-by-step setup.",
    url: "https://getloupe.io/guides/posthog",
    siteName: "Loupe",
    type: "article",
    publishedTime: GUIDE_PUBLISHED_AT,
    modifiedTime: GUIDE_UPDATED_AT,
    section: "Integration Guides",
    authors: ["Loupe"],
  },
  twitter: {
    card: "summary_large_image",
    title: "PostHog Analytics Integration — Correlate changes with metrics",
    description:
      "Connect PostHog. Every page change shows before/after metrics so you know what helped and what hurt.",
  },
  alternates: {
    canonical: "https://getloupe.io/guides/posthog",
  },
};

// ===== INLINE COMPONENTS =====

function StepNumber({ num }: { num: number }) {
  return (
    <div className="w-10 h-10 rounded-lg bg-accent text-white flex items-center justify-center font-bold text-base flex-shrink-0">
      {num}
    </div>
  );
}


const SETUP_STEPS: {
  title: string;
  description: string;
  /** Real image path, or null for placeholder */
  filename: string | null;
  screenshotAlt: string;
}[] = [
  {
    title: "Go to Settings → Integrations",
    description:
      "Open your Loupe dashboard and head to Settings. You'll see a PostHog section with a Connect button.",
    filename: "/guides/github/step-1-settings.png",
    screenshotAlt:
      "Loupe settings page showing PostHog analytics connect button",
  },
  {
    title: "Enter your PostHog credentials",
    description:
      "Click Connect to open the setup modal. You'll need your Personal API Key (create one at PostHog → Settings → Personal API Keys), your Project ID, and your host (US Cloud, EU Cloud, or self-hosted).",
    filename: "/guides/posthog/step-2-connect-modal.png",
    screenshotAlt:
      "PostHog credentials modal with API key, Project ID, and host fields",
  },
];

const COMMON_QUESTIONS: { question: string; answer: string }[] = [
  {
    question: "What permissions does the API key need?",
    answer:
      "A Personal API Key with read access. Loupe reads pageview and event data to correlate with detected changes. We never write to your PostHog project.",
  },
  {
    question: "What data does Loupe read from PostHog?",
    answer:
      "Pageviews, custom events, and basic session metrics for the pages you monitor. We pull data for a window around each detected change to calculate before/after comparisons.",
  },
  {
    question: "How long until I see correlation data?",
    answer:
      "After your next scan detects a change, Loupe pulls metrics for the period before and after. You'll see correlation data within a few days of a detected change, once enough post-change data exists.",
  },
  {
    question: "Does it work with PostHog Cloud and self-hosted?",
    answer:
      "Yes. During setup you choose US Cloud, EU Cloud, or enter your self-hosted URL. All three are fully supported.",
  },
  {
    question: "Can I connect PostHog and GA4 at the same time?",
    answer:
      "Yes. You can connect both. Loupe will pull metrics from whichever source has data for the pages you monitor.",
  },
  {
    question: "Can I disconnect anytime?",
    answer:
      "Yes. Remove the connection in Loupe settings. Your existing scan history and correlation data remains available.",
  },
  {
    question: "What does it cost?",
    answer:
      "PostHog can be connected on any paid plan. Analytics correlation requires Pro ($39/month) or Scale ($99/month).",
  },
];

const FAQ_SCHEMA_ITEMS = COMMON_QUESTIONS;

function FAQSchema() {
  const faqStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_SCHEMA_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqStructuredData) }}
    />
  );
}

function HowToSchema() {
  const howToData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to connect PostHog analytics to Loupe",
    description:
      "Connect your PostHog project to Loupe to correlate page changes with your analytics metrics.",
    totalTime: "PT2M",
    step: SETUP_STEPS.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.description,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(howToData) }}
    />
  );
}

function BreadcrumbSchema() {
  const breadcrumbData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://getloupe.io/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "PostHog analytics integration guide",
        item: "https://getloupe.io/guides/posthog",
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }}
    />
  );
}

// ===== PAGE =====

export default function PostHogGuidePage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <FAQSchema />
      <HowToSchema />
      <BreadcrumbSchema />

      {/* Hero */}
      <section className="flex items-start pt-16 lg:pt-24 px-4 pb-16">
        <div className="w-full max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full border-2 border-violet text-[11px] font-semibold uppercase tracking-[0.18em] text-violet bg-violet/5 mb-4">
            PostHog Integration Guide
          </span>

          <h1
            className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-tight text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            See what your changes did
            <br />
            <span className="text-accent">to your metrics</span>
          </h1>

          <p className="text-xl text-text-secondary mt-5 max-w-xl mx-auto leading-relaxed">
            Connect PostHog. Loupe correlates every page change with your
            analytics, so you know whether each change helped or hurt.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/settings/integrations"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center px-6 py-3"
            >
              Open integrations settings
            </Link>
            <Link
              href="/login?redirect=/settings/integrations"
              className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center px-6 py-3"
            >
              Sign in
            </Link>
          </div>
          <p className="text-sm text-text-muted mt-4">
            Already monitoring pages? Connect PostHog to see metric correlations.
          </p>
        </div>
      </section>

      {/* Setup steps */}
      <section className="px-4 pt-4 pb-10 sm:pb-12">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(2rem,4vw,3rem)] text-text-primary leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Connect PostHog in 2&nbsp;minutes
            </h2>
            <p className="text-lg text-text-secondary mt-3 max-w-2xl mx-auto">
              API key, Project ID, host. That&apos;s it.
            </p>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {SETUP_STEPS.map((step, i) => (
              <div key={i} className="py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-5 lg:gap-7 items-start">
                  <div className="flex items-start gap-4 lg:pt-8">
                    <StepNumber num={i + 1} />
                    <div>
                      <h3 className="text-lg font-bold text-text-primary mb-2">
                        {step.title}
                      </h3>
                      <p className="text-text-secondary leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                  <div className="w-full lg:max-w-[420px] lg:justify-self-end rounded-lg border border-[var(--line)] bg-bg-inset/60 p-2">
                    <Image
                      src={step.filename!}
                      alt={step.screenshotAlt}
                      width={820}
                      height={820}
                      sizes="(min-width: 1024px) 26rem, 100vw"
                      className="w-full h-auto rounded-md"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-3xl rounded-lg border border-[var(--line)] bg-bg-inset/50 px-5 py-4 text-sm text-text-secondary text-center">
              After connecting, every scan pulls your PostHog metrics
              automatically. When a change is detected, Loupe compares the
              before and after periods to show which metrics moved.
            </div>
          </div>
        </div>
      </section>

      {/* Mid-page CTA */}
      <section className="px-4 pb-14">
        <div className="w-full max-w-3xl mx-auto text-center">
          <p className="text-base text-text-secondary mb-4">
            Ready to connect your analytics?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/settings/integrations"
              className="btn-primary w-full sm:w-auto inline-flex items-center justify-center px-6 py-3"
            >
              Open integrations settings
            </Link>
            <Link
              href="/login?redirect=/settings/integrations"
              className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center px-6 py-3"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="section-dark px-4 py-16">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.5rem,3vw,2rem)] text-text-primary leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Common Questions
            </h2>
            <p className="text-sm text-text-secondary mt-3">
              For deploy-triggered scanning, connect{" "}
              <Link
                href="/guides/github"
                className="text-accent hover:underline"
              >
                GitHub
              </Link>
              . For Google Analytics, connect{" "}
              <Link href="/guides/ga4" className="text-accent hover:underline">
                GA4
              </Link>
              .
            </p>
          </div>

          <div className="space-y-4">
            {COMMON_QUESTIONS.map((item, i) => (
              <div
                key={i}
                className="rounded-[10px] border border-white/10 bg-white/5 p-4 sm:p-6"
              >
                <h3
                  className="text-lg font-bold text-text-primary mb-3"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {item.question}
                </h3>
                <p className="text-text-secondary leading-relaxed text-sm">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center mt-6 text-sm text-text-muted">
            <Link href="/pricing" className="text-accent hover:underline">
              See plans and limits →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
