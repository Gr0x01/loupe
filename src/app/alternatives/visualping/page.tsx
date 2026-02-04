import { Metadata } from "next";
import FreeAuditForm from "@/components/seo/FreeAuditForm";
import CTASection from "@/components/seo/CTASection";
import MockComparisonCard from "@/components/MockComparisonCard";

export const metadata: Metadata = {
  title: "Visualping Alternative for Founders Who Ship Fast | Loupe",
  description:
    "Looking for a Visualping alternative? Loupe catches drift in your landing page — not just pixel changes. Built for founders using Lovable, Cursor, and Bolt. Free audit, no signup.",
};

// Check and X icons for comparison table
const CheckMark = () => (
  <svg className="w-5 h-5 text-score-high flex-shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2.5}>
    <path d="M4 10l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const XMark = () => (
  <svg className="w-5 h-5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2}>
    <path d="M6 6l8 8M14 6l-8 8" strokeLinecap="round" />
  </svg>
);

const PartialMark = () => (
  <svg className="w-5 h-5 text-score-mid flex-shrink-0" fill="none" viewBox="0 0 20 20" stroke="currentColor" strokeWidth={2}>
    <path d="M5 10h10" strokeLinecap="round" />
  </svg>
);

// Comparison data
const COMPARISON_TABLE = [
  {
    category: "Detection Method",
    feature: "How changes are detected",
    loupe: "Analyzes content meaning",
    visualping: "Compares pixel screenshots",
    loupeWins: true,
  },
  {
    category: "Detection Method",
    feature: "Understands text changes",
    loupe: "Yes — headlines, CTAs, copy",
    visualping: "Highlights text diffs",
    loupeWins: true,
  },
  {
    category: "Detection Method",
    feature: "Filters noise automatically",
    loupe: "Yes — ignores dynamic content",
    visualping: "Manual exclusion zones",
    loupeWins: true,
  },
  {
    category: "Analysis",
    feature: "Explains why changes matter",
    loupe: "Yes — marketing impact analysis",
    visualping: "No — shows diff only",
    loupeWins: true,
  },
  {
    category: "Analysis",
    feature: "Conversion impact scoring",
    loupe: "Scores what matters for conversions",
    visualping: "Not available",
    loupeWins: true,
  },
  {
    category: "Analysis",
    feature: "Before/after comparison",
    loupe: "Side-by-side screenshots",
    visualping: "Side-by-side screenshots",
    loupeWins: null,
  },
  {
    category: "Integrations",
    feature: "Slack notifications",
    loupe: "Coming soon",
    visualping: "Yes",
    loupeWins: false,
  },
  {
    category: "Integrations",
    feature: "Email alerts",
    loupe: "Yes",
    visualping: "Yes",
    loupeWins: null,
  },
  {
    category: "Integrations",
    feature: "GitHub deploy triggers",
    loupe: "Yes — webhooks",
    visualping: "Not available",
    loupeWins: true,
  },
  {
    category: "Pricing",
    feature: "Free tier",
    loupe: "Unlimited audits",
    visualping: "5 pages monitored",
    loupeWins: true,
  },
  {
    category: "Pricing",
    feature: "Team collaboration",
    loupe: "Coming soon",
    visualping: "Yes — paid plans",
    loupeWins: false,
  },
];

// Use cases
const USE_CASES = [
  {
    title: "Tracking your own site after deploys",
    loupe: "Loupe tells you exactly what copy changed, whether CTAs moved, and if trust signals disappeared. You get actionable insights, not just 'something changed.'",
    visualping: "Visualping shows pixel-level changes. Good for knowing if anything changed, but you'll need to figure out what and why yourself.",
    recommendation: "loupe",
  },
  {
    title: "Competitor price monitoring",
    loupe: "Loupe analyzes landing pages and messaging, not price tables. Better for tracking positioning and messaging shifts than SKU prices.",
    visualping: "Visualping excels here — set up regions around price elements and get notified when numbers change.",
    recommendation: "visualping",
  },
  {
    title: "Regulatory compliance monitoring",
    loupe: "Loupe focuses on marketing content analysis, not document tracking. Not the right tool for legal/regulatory monitoring.",
    visualping: "Visualping is designed for this — monitoring policy pages, legal documents, and regulatory updates.",
    recommendation: "visualping",
  },
  {
    title: "Catching AI tool drift",
    loupe: "Built for this. When Lovable, Cursor, or Bolt accidentally removes social proof or changes a high-converting headline, Loupe explains what was lost and why it matters.",
    visualping: "Will show something changed, but won't tell you if the CTA urgency was removed or why it matters.",
    recommendation: "loupe",
  },
];

// FAQ data
const FAQ_ITEMS = [
  {
    question: "Is Loupe actually better than Visualping?",
    answer: "Different, not necessarily better. Visualping is excellent for general website monitoring — price tracking, compliance, competitor changes. Loupe is specifically built for founders who ship fast and need to know if deploys broke something important. If you're monitoring your own site after deploys, Loupe gives you more useful insights. If you're tracking competitor prices or legal pages, Visualping is probably the better fit.",
  },
  {
    question: "Can Loupe replace Visualping completely?",
    answer: "For monitoring your own marketing pages and landing pages — yes. For monitoring dozens of competitor sites, price tables, or regulatory documents — no. Loupe is focused on deep analysis of a few critical pages, not broad monitoring of many sites.",
  },
  {
    question: "Does Loupe do pixel comparisons too?",
    answer: "Yes, Loupe captures full-page screenshots and shows side-by-side visual comparisons. But where Visualping stops at 'here's what looks different,' Loupe goes further: it analyzes the content and tells you what changed semantically — headlines, CTAs, trust signals, layout patterns.",
  },
  {
    question: "How is Loupe's pricing different?",
    answer: "Loupe offers unlimited free audits — run as many one-time page analyses as you want. Monitoring (ongoing tracking) is paid. Visualping limits their free tier to 5 monitored pages with limited check frequency. For founders who want to audit pages frequently without committing to monitoring, Loupe's free tier is more generous.",
  },
  {
    question: "What if I'm already using Visualping?",
    answer: "You can use both. Many founders use Visualping for broad competitor monitoring and Loupe for deep analysis of their own pages. Try a free Loupe audit on your homepage — if the insights are useful, consider switching your self-monitoring to Loupe while keeping Visualping for competitors.",
  },
  {
    question: "Does Loupe have a browser extension?",
    answer: "Not yet. Visualping's Chrome extension is great for quick one-click monitoring setup. Loupe is currently web-only, but we're focused on deeper analysis over convenience features.",
  },
];

export default function VisualpingAlternativePage() {
  // Group comparison table by category
  const categories = COMPARISON_TABLE.reduce((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {} as Record<string, typeof COMPARISON_TABLE>);

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <section className="px-4 pt-20 pb-16">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left column - Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-medium mb-6">
                Visualping Alternative
              </div>
              <h1
                className="text-[clamp(2rem,4vw,3rem)] leading-[1.1] text-text-primary mb-6"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Pixel diffs tell you{" "}
                <span className="italic">something</span> changed.
                <br />
                <span className="text-accent">Loupe tells you what&nbsp;and&nbsp;why.</span>
              </h1>
              <p className="text-lg text-text-secondary mb-8 max-w-xl">
                Built for founders shipping with Lovable, Cursor, or Bolt.
                Catch drift before it costs you conversions.
              </p>
              <FreeAuditForm />
            </div>

            {/* Right column - Visual */}
            <div className="hidden lg:block">
              <MockComparisonCard />
            </div>
          </div>
        </div>
      </section>

      {/* The Core Difference */}
      <section className="px-4 py-20 bg-bg-inset border-y border-border-subtle">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              The fundamental difference
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Visualping asks: "Did pixels change?" <br />
              Loupe asks: "Did something important change?"
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Visualping approach */}
            <div className="glass-card p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-5 h-5 rounded-full bg-[#1882ff] flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-text-primary">Visualping</h3>
                  <p className="text-sm text-text-muted">Pixel comparison</p>
                </div>
              </div>
              <ul className="space-y-3 text-text-secondary">
                <li className="flex items-start gap-2">
                  <CheckMark />
                  <span>Captures screenshots on schedule</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckMark />
                  <span>Compares pixels between captures</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckMark />
                  <span>Highlights visual differences</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckMark />
                  <span>Alerts when threshold is exceeded</span>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-border-subtle">
                <p className="text-sm text-text-muted">
                  <strong className="text-text-secondary">Best for:</strong> Tracking many pages, price monitoring,
                  competitor tracking, regulatory compliance
                </p>
              </div>
            </div>

            {/* Loupe approach */}
            <div className="glass-card-elevated p-8 ring-2 ring-accent/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-text-primary">Loupe</h3>
                  <p className="text-sm text-accent">Content analysis</p>
                </div>
              </div>
              <ul className="space-y-3 text-text-secondary">
                <li className="flex items-start gap-2">
                  <CheckMark />
                  <span>Captures screenshots + extracts content</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckMark />
                  <span>Analyzes meaning of changes</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckMark />
                  <span>Categorizes: headline, CTA, trust signal</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckMark />
                  <span>Explains marketing impact</span>
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-border-subtle">
                <p className="text-sm text-text-muted">
                  <strong className="text-accent">Best for:</strong> Post-deploy verification, catching
                  AI tool mistakes, understanding conversion impact
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Comparison Table */}
      <section className="px-4 py-20">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-[clamp(1.5rem,3vw,2rem)] text-text-primary mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Feature-by-feature comparison
            </h2>
            <p className="text-text-secondary">
              An honest look at where each tool excels
            </p>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block rounded-xl border border-border-subtle bg-white overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr,1fr,1fr] border-b border-border-subtle bg-bg-inset">
              <div className="px-6 py-4 text-sm font-semibold text-text-muted uppercase tracking-wide">
                Feature
              </div>
              <div className="px-6 py-4 text-center text-sm font-bold text-accent border-l border-border-subtle uppercase tracking-wide">
                Loupe
              </div>
              <div className="px-6 py-4 text-center text-sm font-semibold text-text-muted border-l border-border-subtle uppercase tracking-wide">
                Visualping
              </div>
            </div>

            {/* Table body grouped by category */}
            {Object.entries(categories).map(([category, rows], catIdx) => (
              <div key={category}>
                {/* Category header */}
                <div className="px-6 py-3 bg-bg-inset border-b border-border-subtle">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {category}
                  </span>
                </div>
                {/* Category rows */}
                {rows.map((row, rowIdx) => (
                  <div
                    key={row.feature}
                    className={`grid grid-cols-[1fr,1fr,1fr] ${
                      rowIdx < rows.length - 1 || catIdx < Object.keys(categories).length - 1
                        ? "border-b border-border-subtle/50"
                        : ""
                    }`}
                  >
                    <div className="px-6 py-4 text-text-primary text-sm">
                      {row.feature}
                    </div>
                    <div className="px-6 py-4 border-l border-border-subtle">
                      <div className="flex items-center gap-2 justify-center">
                        {row.loupeWins === true && <CheckMark />}
                        {row.loupeWins === false && <PartialMark />}
                        {row.loupeWins === null && <CheckMark />}
                        <span className="text-sm text-text-secondary">{row.loupe}</span>
                      </div>
                    </div>
                    <div className="px-6 py-4 border-l border-border-subtle">
                      <div className="flex items-center gap-2 justify-center">
                        {row.loupeWins === true && <PartialMark />}
                        {row.loupeWins === false && <CheckMark />}
                        {row.loupeWins === null && <CheckMark />}
                        <span className="text-sm text-text-muted">{row.visualping}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Mobile comparison cards */}
          <div className="md:hidden space-y-4">
            {Object.entries(categories).map(([category, rows]) => (
              <div key={category} className="glass-card overflow-hidden">
                <div className="px-4 py-3 bg-bg-inset border-b border-border-subtle">
                  <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
                    {category}
                  </span>
                </div>
                <div className="divide-y divide-border-subtle">
                  {rows.map((row) => (
                    <div key={row.feature} className="p-4">
                      <p className="text-sm font-medium text-text-primary mb-3">{row.feature}</p>
                      <div className="space-y-2">
                        <div className="flex items-start gap-2">
                          {row.loupeWins === true && <CheckMark />}
                          {row.loupeWins === false && <PartialMark />}
                          {row.loupeWins === null && <CheckMark />}
                          <div>
                            <p className="text-xs font-medium text-accent">Loupe</p>
                            <p className="text-sm text-text-secondary">{row.loupe}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          {row.loupeWins === true && <PartialMark />}
                          {row.loupeWins === false && <CheckMark />}
                          {row.loupeWins === null && <CheckMark />}
                          <div>
                            <p className="text-xs font-medium text-text-muted">Visualping</p>
                            <p className="text-sm text-text-muted">{row.visualping}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Case Breakdown */}
      <section className="section-dark px-4 py-20">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-white mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Which tool for which job?
            </h2>
            <p className="text-lg text-white/70 max-w-2xl mx-auto">
              Honest recommendations based on what you're trying to do
            </p>
          </div>

          <div className="space-y-6">
            {USE_CASES.map((useCase) => (
              <div
                key={useCase.title}
                className="rounded-xl p-6"
                style={{ backgroundColor: "rgba(255,255,255,0.06)" }}
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-bold text-white">{useCase.title}</h3>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                      useCase.recommendation === "loupe"
                        ? "bg-accent/20 text-accent"
                        : "bg-white/10 text-white/70"
                    }`}
                  >
                    {useCase.recommendation === "loupe" ? "Loupe recommended" : "Visualping better fit"}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-xs font-medium text-accent mb-2">Loupe</p>
                    <p className="text-sm text-white/80">{useCase.loupe}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/50 mb-2">Visualping</p>
                    <p className="text-sm text-white/60">{useCase.visualping}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20 bg-bg-inset border-y border-border-subtle">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2
              className="text-[clamp(1.5rem,3vw,2rem)] text-text-primary"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="glass-card group faq-item">
                <summary className="p-5 cursor-pointer list-none flex items-center justify-between gap-4">
                  <span className="font-semibold text-text-primary">{item.question}</span>
                  <svg
                    className="w-5 h-5 text-text-muted flex-shrink-0 transition-transform group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="faq-content">
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 text-text-secondary leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="Try Loupe — see if it fits your workflow"
        subheadline="Run a free audit on your homepage. If the insights are useful, you'll know."
        ctaText="Get your free audit"
        trustSignals={["Free audit", "No credit card", "Results in 30 seconds"]}
      />
    </div>
  );
}
