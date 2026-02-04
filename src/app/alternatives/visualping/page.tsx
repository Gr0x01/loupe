import { Metadata } from "next";
import FreeAuditForm from "@/components/seo/FreeAuditForm";
import CTASection from "@/components/seo/CTASection";
import MockComparisonCard from "@/components/MockComparisonCard";

export const metadata: Metadata = {
  title: "Visualping Alternative for Founders Who Ship Fast | Loupe",
  description:
    "Looking for a Visualping alternative? Loupe shows what changed and why — not just pixel diffs. Built for founders shipping with Lovable and Bolt. Free audit, no signup.",
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
    feature: "How changes are detected",
    loupe: "Analyzes content meaning",
    visualping: "Compares pixel screenshots",
    loupeWins: true,
  },
  {
    feature: "Understands text changes",
    loupe: "Headlines, CTAs, copy",
    visualping: "Highlights text diffs",
    loupeWins: true,
  },
  {
    feature: "Filters noise",
    loupe: "Ignores dynamic content",
    visualping: "Manual exclusion zones",
    loupeWins: true,
  },
  {
    feature: "Explains why changes matter",
    loupe: "What it means for signups",
    visualping: "Shows diff only",
    loupeWins: true,
  },
  {
    feature: "Flags what matters to signups",
    loupe: "Yes",
    visualping: "No",
    loupeWins: true,
  },
  {
    feature: "Before/after comparison",
    loupe: "Side-by-side screenshots",
    visualping: "Side-by-side screenshots",
    loupeWins: null,
  },
  {
    feature: "Slack notifications",
    loupe: "Coming soon",
    visualping: "Yes",
    loupeWins: false,
  },
  {
    feature: "Email alerts",
    loupe: "Yes",
    visualping: "Yes",
    loupeWins: null,
  },
  {
    feature: "GitHub deploy triggers",
    loupe: "Yes — webhooks",
    visualping: "No",
    loupeWins: true,
  },
  {
    feature: "Free tier",
    loupe: "Unlimited audits",
    visualping: "5 pages monitored",
    loupeWins: true,
  },
  {
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
    loupe: "Loupe tells you exactly what copy changed, whether CTAs moved, and if trust signals disappeared. You get specifics — what changed, whether it matters, what to do about it.",
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
    loupe: "Built for this. When Lovable, Bolt, or Replit accidentally removes social proof or changes a high-converting headline, Loupe explains what was lost and why it matters.",
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
    answer: "Yes, Loupe captures full-page screenshots and shows side-by-side visual comparisons. But where Visualping stops at 'here's what looks different,' Loupe goes further: it analyzes the content and tells you what actually changed — your headline, your CTA, your trust signals.",
  },
  {
    question: "How is Loupe's pricing different?",
    answer: "Loupe offers unlimited free audits — run as many one-time page analyses as you want. Monitoring is paid. Visualping limits their free tier to 5 monitored pages with limited check frequency. For founders who want to audit pages frequently without committing to monitoring, Loupe's free tier is more generous.",
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
                A Visualping alternative that tells you{" "}
                <span className="italic">what</span> changed
                <br />
                <span className="text-accent">and why it matters.</span>
              </h1>
              <p className="text-lg text-text-secondary mb-8 max-w-xl">
                Built for founders shipping with Lovable, Bolt, or Replit.
                Catch what changed while you were shipping.
              </p>
              <FreeAuditForm />
            </div>

            {/* Right column - Visual */}
            <div className="mt-8 lg:mt-0">
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
                <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 20 21" fill="none">
                  <circle cx="10" cy="10.5" r="10" fill="#1882ff" />
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M19.96 11.38a10.15 10.15 0 00.02-1.54l-3.71.78-3.13-2.66a.75.75 0 00-1.18.3l-1.71 4.4-1.98-7.73a.75.75 0 00-1.38-.19L4.27 9.37H.07a10.1 10.1 0 00-.06 1.5h4.7c.27 0 .52-.15.65-.38L7.28 7.1l2.1 8.2a.75.75 0 001.42.09l2.17-5.6 2.6 2.21c.18.15.42.21.65.16z"
                    fill="#fff"
                  />
                </svg>
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
      <section className="px-4 py-16">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-[clamp(1.5rem,3vw,2rem)] text-text-primary mb-3"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              Loupe vs Visualping
            </h2>
            <p className="text-text-secondary text-sm">
              An honest look at where each tool excels
            </p>
          </div>

          {/* Compact table */}
          <div className="rounded-xl border border-border-subtle bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-bg-inset border-b border-border-subtle">
                  <th className="px-4 py-3 text-left font-semibold text-text-muted uppercase tracking-wide text-xs">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-left font-bold text-accent uppercase tracking-wide text-xs border-l border-border-subtle">
                    Loupe
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-text-muted uppercase tracking-wide text-xs border-l border-border-subtle">
                    Visualping
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_TABLE.map((row, i) => (
                  <tr key={row.feature} className={i < COMPARISON_TABLE.length - 1 ? "border-b border-border-subtle/50" : ""}>
                    <td className="px-4 py-2.5 text-text-primary font-medium">
                      {row.feature}
                    </td>
                    <td className={`px-4 py-2.5 border-l border-border-subtle ${row.loupeWins === true ? "text-text-primary" : "text-text-muted"}`}>
                      {row.loupe}
                    </td>
                    <td className={`px-4 py-2.5 border-l border-border-subtle ${row.loupeWins === false ? "text-text-primary" : "text-text-muted"}`}>
                      {row.visualping}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Inline CTA */}
          <div className="mt-8 text-center">
            <p className="text-text-secondary mb-4">See the difference yourself</p>
            <FreeAuditForm />
          </div>
        </div>
      </section>

      {/* Use Case Breakdown */}
      <section className="section-dark px-4 py-20">
        <div className="w-full max-w-3xl mx-auto">
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
