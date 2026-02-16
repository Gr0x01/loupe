import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const GUIDE_PUBLISHED_AT = "2026-02-15T00:00:00.000Z";
const GUIDE_UPDATED_AT = "2026-02-15T00:00:00.000Z";
const GUIDE_SOCIAL_IMAGE = "https://getloupe.io/guides/github/step-2-connected.png";

// #1 — Metadata with OG, Twitter, canonical
export const metadata: Metadata = {
  title: "GitHub Deploy Monitoring Setup Guide — Loupe",
  description:
    "Connect GitHub to Loupe and auto-scan your site after every deploy. Step-by-step setup guide. See which commits changed what. Works with Lovable, Bolt, Cursor, and more.",
  keywords: [
    "github deploy monitoring",
    "website change detection after deploy",
    "visual regression testing github",
    "auto scan website after deploy",
    "github webhook site monitoring",
    "lovable github deploy monitoring",
    "bolt.new deploy tracking",
    "cursor visual regression detection",
    "monitor website changes after github push",
    "which commit broke my website",
  ],
  openGraph: {
    title: "GitHub Deploy Monitoring Setup Guide — Loupe",
    description:
      "Connect GitHub to Loupe and auto-scan your site after every deploy. See which commits changed what.",
    url: "https://getloupe.io/guides/github",
    siteName: "Loupe",
    type: "article",
    publishedTime: GUIDE_PUBLISHED_AT,
    modifiedTime: GUIDE_UPDATED_AT,
    section: "Integration Guides",
    authors: ["Loupe"],
    images: [
      {
        url: GUIDE_SOCIAL_IMAGE,
        width: 1822,
        height: 1424,
        alt: "GitHub integration connected in Loupe settings",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub Deploy Monitoring — Auto-scan after every push",
    description:
      "Connect your repo. Every push triggers a screenshot and analysis. See which commit changed what.",
    images: [GUIDE_SOCIAL_IMAGE],
  },
  alternates: {
    canonical: "https://getloupe.io/guides/github",
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
  filename: string;
  screenshotAlt: string;
}[] = [
  {
    title: "Go to Settings → Integrations",
    description:
      "Open your Loupe dashboard and head to Settings. You'll see a GitHub section with a Connect button.",
    filename: "step-1-settings.png",
    screenshotAlt:
      "Loupe settings page showing GitHub deploy monitoring connect button",
  },
  {
    title: "Install the Loupe GitHub App",
    description:
      "Click Connect and you'll be redirected to GitHub. Choose which repositories to give Loupe access to. We only request push event access — we never read your code. Once installed, you're redirected back to Loupe with your account connected.",
    filename: "step-2-connected.png",
    screenshotAlt:
      "GitHub account connected to Loupe for automatic deploy scanning",
  },
  {
    title: "Connect a repository",
    description:
      "Click \"Add repo\" to open the repository picker. It lists every repo you gave Loupe access to during installation. Pick one and Loupe creates a webhook on that repo's default branch.",
    filename: "step-3-add-repo.png",
    screenshotAlt:
      "Repository picker for GitHub deploy monitoring setup in Loupe",
  },
];

const COMMON_QUESTIONS: { question: string; answer: string }[] = [
  {
    question: "What permissions does the app need?",
    answer:
      "Push event access only. Loupe does not read your source code, issues, or pull requests.",
  },
  {
    question: "How long after a push does the scan run?",
    answer:
      "Loupe waits around 45 seconds for deploy completion, then scans. If deploy is still running, retries handle longer build times.",
  },
  {
    question: "Why didn't a scan run after I pushed?",
    answer:
      "Check that the connected repo matches the one you pushed to, and that the push was to the default branch. Also confirm the GitHub app is still installed for that repo in GitHub settings.",
  },
  {
    question: "Do monorepo backend-only pushes trigger unnecessary scans?",
    answer:
      "Usually no. Loupe checks changed files and skips scans when a push is unlikely to affect monitored pages.",
  },
  {
    question: "I renamed or transferred a repo. What should I do?",
    answer:
      "Reconnect the repository in Loupe settings so webhook and integration state are refreshed for the new repo path.",
  },
  {
    question: "Can I disconnect anytime?",
    answer:
      "Yes. Remove the app in GitHub or disconnect in Loupe settings. Existing scan history remains available.",
  },
  {
    question: "What does it cost?",
    answer:
      "GitHub can be connected on any plan, while deploy-triggered scanning requires Starter ($12/month) or Pro ($29/month).",
  },
];

const FAQ_SCHEMA_ITEMS = COMMON_QUESTIONS;

// FAQ JSON-LD structured data
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

// #10 — HowTo structured data
function HowToSchema() {
  const howToData = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to set up GitHub deploy monitoring with Loupe",
    description:
      "Connect your GitHub repo to Loupe for automatic post-deploy scanning.",
    totalTime: "PT2M",
    step: SETUP_STEPS.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.title,
      text: step.description,
      ...(step.filename && {
        image: `https://getloupe.io/guides/github/${step.filename}`,
      }),
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
        name: "GitHub deploy monitoring guide",
        item: "https://getloupe.io/guides/github",
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

export default function GitHubGuidePage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <FAQSchema />
      <HowToSchema />
      <BreadcrumbSchema />

      {/* #1 — Centered hero with keyword in H1 */}
      <section className="flex items-start pt-16 lg:pt-24 px-4 pb-16">
        <div className="w-full max-w-3xl mx-auto text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full border-2 border-blue text-[11px] font-semibold uppercase tracking-[0.18em] text-blue bg-blue/5 mb-4">
            GitHub Integration Guide
          </span>

          <h1
            className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-tight text-text-primary"
            style={{ fontFamily: "var(--font-display)" }}
          >
            GitHub deploy monitoring
            <br />
            <span className="text-accent">for every push</span>
          </h1>

          <p className="text-xl text-text-secondary mt-5 max-w-xl mx-auto leading-relaxed">
            Connect your repo. Loupe screenshots and analyzes your site after every push, then tracks whether each change helped or hurt your metrics.
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
            Already ran an audit? Connect GitHub to auto-scan every push.
          </p>
        </div>
      </section>

      {/* #8 — Setup section first: side-by-side, narrower container, capped images */}
      <section className="px-4 pt-4 pb-10 sm:pb-12">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(2rem,4vw,3rem)] text-text-primary leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Set up GitHub deploy monitoring in 2&nbsp;minutes
            </h2>
            <p className="text-lg text-text-secondary mt-3 max-w-2xl mx-auto">
              From zero to deploy-triggered scanning. No code changes needed.
            </p>
          </div>

          <div className="divide-y divide-[var(--line)]">
            {SETUP_STEPS.map((step, i) => (
              <div key={i} className="py-6 sm:py-8">
                <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)] gap-5 lg:gap-7 items-start">
                  <div className="flex items-start gap-4">
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
                    <div className="relative h-[220px] sm:h-[250px] w-full rounded-md overflow-hidden bg-white/70">
                      <Image
                        src={`/guides/github/${step.filename}`}
                        alt={step.screenshotAlt}
                        fill
                        sizes="(min-width: 1024px) 26rem, 100vw"
                        className="object-contain object-top"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-3xl rounded-lg border border-[var(--line)] bg-bg-inset/50 px-5 py-4 text-sm text-text-secondary text-center">
              After setup, push to your default branch and Loupe auto-runs a scan after deploy, then links visual changes to commit SHA, author, message, and changed files.
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-14">
        <div className="w-full max-w-3xl mx-auto text-center">
          <p className="text-base text-text-secondary mb-4">
            Ready to connect your repo?
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
              For metric impact correlation, connect{" "}
              <Link href="/guides/posthog" className="text-accent hover:underline">
                PostHog
              </Link>{" "}
              or{" "}
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

          {/* Internal link to pricing */}
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
