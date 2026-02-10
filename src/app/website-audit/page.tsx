import { Metadata } from "next";
import Image from "next/image";
import FreeAuditForm from "@/components/seo/FreeAuditForm";
import CTASection from "@/components/seo/CTASection";

export const metadata: Metadata = {
  title: "Free Website Audit Tool — Check if Your Landing Page Converts | Loupe",
  description:
    "Free website audit in 30 seconds. Built with Lovable, Cursor, or Bolt? Check if your landing page actually converts. We analyze headlines, CTAs, and trust signals. No signup required.",
};

// Category icons
const MessageIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);

const ClickIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zM12 2.25V4.5m5.834.166l-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243l-1.59-1.59" />
  </svg>
);

const TrustIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const EyeIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PaletteIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
  </svg>
);

const SearchIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
  </svg>
);

const AUDIT_CATEGORIES = [
  {
    name: "Messaging & Copy",
    icon: <MessageIcon />,
    description: "Does your headline actually say what you do? Would a stranger understand it in 5 seconds?",
    whatWeCheck: [
      "Headline clarity and specificity",
      "Value proposition strength",
      "Problem → solution flow",
      'The "Only" test — could a competitor say the same?',
      "Audience targeting",
    ],
    exampleFinding: {
      type: "issue" as const,
      title: "Headline is too generic",
      detail: "\"We help businesses grow\" could describe any competitor. Try: \"SaaS founders: reduce churn 23% in 90 days.\"",
    },
  },
  {
    name: "Call to Action",
    icon: <ClickIcon />,
    description: "Is your button compelling? Does it match what visitors are ready to do?",
    whatWeCheck: [
      "CTA visibility and placement",
      "Button copy specificity",
      "Risk reversal (free trial, guarantee)",
      "Friction reduction",
      "Action clarity",
    ],
    exampleFinding: {
      type: "suggestion" as const,
      title: "CTA assumes too much",
      detail: "\"Get Started\" assumes visitors understand your solution. Try \"See How It Works\" first.",
    },
  },
  {
    name: "Trust & Social Proof",
    icon: <TrustIcon />,
    description: "Do visitors have a reason to trust you? Are objections being handled?",
    whatWeCheck: [
      "Testimonial specificity and relevance",
      "Customer logos and numbers",
      "Guarantees and risk reversal",
      "Authority signals",
      "Objection handling",
    ],
    exampleFinding: {
      type: "issue" as const,
      title: "Testimonials don't address objections",
      detail: "Reviews praise your team but don't answer \"Will this work for MY situation?\" Add outcome-specific testimonials.",
    },
  },
  {
    name: "Visual Hierarchy",
    icon: <EyeIcon />,
    description: "Does the eye flow naturally to your most important content?",
    whatWeCheck: [
      "Reading flow alignment",
      "Primary CTA prominence",
      "Content priority ordering",
      "Above-the-fold effectiveness",
      "Scan-ability for skimmers",
    ],
    exampleFinding: {
      type: "issue" as const,
      title: "CTA buried below the fold",
      detail: "Your primary action button requires scrolling to find. Move it into the hero section above the fold.",
    },
  },
  {
    name: "Design Quality",
    icon: <PaletteIcon />,
    description: "Is spacing consistent? Typography clean? Does it look professional?",
    whatWeCheck: [
      "Spacing consistency",
      "Color contrast and accessibility",
      "Typography hierarchy",
      "Visual noise reduction",
      "Mobile responsiveness",
    ],
    exampleFinding: {
      type: "suggestion" as const,
      title: "Inconsistent spacing breaks grouping",
      detail: "Related elements (price + features) have same spacing as unrelated sections. Tighten related groups.",
    },
  },
  {
    name: "SEO & Metadata",
    icon: <SearchIcon />,
    description: "Will search engines understand your page? Will searchers click?",
    whatWeCheck: [
      "Title tag optimization",
      "Meta description click-worthiness",
      "Heading structure (H1, H2, H3)",
      "Image alt text",
      "Search intent matching",
    ],
    exampleFinding: {
      type: "issue" as const,
      title: "Meta description is generic",
      detail: "\"Welcome to our website\" doesn't entice clicks. Try: \"Free audit tool that checks your landing page in 30 seconds.\"",
    },
  },
];

const FAQ_ITEMS = [
  {
    question: "What exactly does the audit check?",
    answer:
      "We check 6 things: whether your headline is clear, your buttons make people want to click, your page looks trustworthy, the layout guides the eye, the design looks professional, and your SEO basics are covered. You get specific fixes, not generic advice.",
  },
  {
    question: "How long does the audit take?",
    answer:
      "About 30 seconds. We screenshot your page, extract the copy (headings, buttons, links), and analyze it. You'll see results on screen — no email required.",
  },
  {
    question: "Is this really free?",
    answer:
      "Yes. The audit is free forever, no signup required. We offer paid monitoring if you want ongoing tracking after changes, but the one-time audit is completely free.",
  },
  {
    question: "I built my site with Lovable / Cursor / Bolt. Will this work?",
    answer:
      "That's exactly who this is for. AI tools help you ship fast, but they don't know if what they built actually converts. We check if the page your AI made is doing its job.",
  },
  {
    question: "How is this different from PageSpeed or SEO tools?",
    answer:
      "Those tools check technical performance — page speed, meta tags, Core Web Vitals. We check if your page convinces visitors to take action. It's conversion optimization, not technical SEO.",
  },
  {
    question: "What kind of pages work best?",
    answer:
      "Landing pages, homepages, and product pages. Pages where you're trying to convert visitors into leads or customers. Blog posts and documentation pages won't get as relevant results.",
  },
  {
    question: "Can I audit competitor pages?",
    answer:
      "Yes. Paste any public URL. Many founders audit competitors to see what they're doing well and where there are opportunities to differentiate.",
  },
];

// Finding type badge
function FindingBadge({ type }: { type: "strength" | "issue" | "suggestion" }) {
  const config = {
    strength: { label: "Strength", class: "bg-score-high/10 text-score-high border-score-high/20" },
    issue: { label: "Issue", class: "bg-score-low/10 text-score-low border-score-low/20" },
    suggestion: { label: "Suggestion", class: "bg-accent/10 text-accent border-accent/20" },
  };
  const c = config[type];
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${c.class}`}>
      {c.label}
    </span>
  );
}

export default function WebsiteAuditPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <section className="pt-16 lg:pt-24 px-4 pb-16">
        <div className="w-full max-w-4xl mx-auto text-center">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-4">
            Free Website Audit
          </p>
          <h1
            className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-tight text-text-primary mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            You shipped fast.
            <br />
            <span className="text-accent">Is your landing page doing its job?</span>
          </h1>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-4">
            Built with Lovable, Cursor, or Bolt? We'll check if what shipped actually converts.
            Paste your URL — get a website audit in 30&nbsp;seconds.
          </p>
          <p className="text-base text-text-muted mb-10">
            No signup. No email. No consultant-speak.
          </p>

          <div className="max-w-xl mx-auto">
            <FreeAuditForm ctaText="Audit my page" />
          </div>
        </div>
      </section>

      {/* What We Analyze */}
      <section className="px-4 py-20 bg-bg-inset border-y border-border-subtle">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              What we check
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Six areas that make or break conversions. Not vague suggestions — specific findings with stuff you can fix today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AUDIT_CATEGORIES.map((cat) => (
              <div key={cat.name} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    {cat.icon}
                  </div>
                  <h3 className="font-bold text-text-primary">{cat.name}</h3>
                </div>
                <p className="text-sm text-text-secondary mb-4">{cat.description}</p>
                <ul className="space-y-1.5 mb-4">
                  {cat.whatWeCheck.slice(0, 3).map((item, i) => (
                    <li key={i} className="text-xs text-text-muted flex items-start gap-2">
                      <span className="text-accent mt-0.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
                {/* Example finding */}
                <div className="bg-bg-inset rounded-lg p-3 border border-border-subtle">
                  <div className="flex items-center gap-2 mb-1.5">
                    <FindingBadge type={cat.exampleFinding.type} />
                  </div>
                  <p className="text-xs font-semibold text-text-primary mb-1">
                    {cat.exampleFinding.title}
                  </p>
                  <p className="text-xs text-text-muted leading-relaxed">
                    {cat.exampleFinding.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-4 py-20">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How it works
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Paste your URL",
                description: "Enter any public landing page, homepage, or product page. Works with any website.",
              },
              {
                step: "2",
                title: "We screenshot & analyze",
                description: "We capture your page, extract metadata (headings, CTAs, links), and run it through our analysis model.",
              },
              {
                step: "3",
                title: "Get actionable findings",
                description: "See your score, specific issues, and concrete fixes. Quote your actual copy, suggest real rewrites.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-accent text-white flex items-center justify-center font-bold text-xl mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-bold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Output */}
      <section className="section-dark px-4 py-20">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight mb-4"
              style={{ fontFamily: "var(--font-display)", color: "#F5F5F7" }}
            >
              What you&apos;ll see
            </h2>
            <p className="text-lg" style={{ color: "rgba(245, 245, 247, 0.7)" }}>
              Real findings. Real copy suggestions. Not generic advice.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Score card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold text-[#8E8EA0] uppercase tracking-wide">Overall Score</p>
                  <p className="text-4xl font-bold text-[#111118]" style={{ fontFamily: "var(--font-display)" }}>
                    67<span className="text-lg text-[#8E8EA0]">/100</span>
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-[#D4940A]">Needs work</p>
                  <p className="text-xs text-[#8E8EA0]">Top 45% of sites audited</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#8E8EA0] uppercase tracking-wide">Category Scores</p>
                {[
                  { name: "Messaging & Copy", score: 58 },
                  { name: "Call to Action", score: 72 },
                  { name: "Trust & Social Proof", score: 45 },
                  { name: "Visual Hierarchy", score: 78 },
                  { name: "Design Quality", score: 82 },
                  { name: "SEO & Metadata", score: 61 },
                ].map((cat) => (
                  <div key={cat.name} className="flex items-center gap-3">
                    <span className="text-sm text-[#55556D] w-40 truncate">{cat.name}</span>
                    <div className="flex-1 h-2 bg-[#F0F0F3] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${cat.score}%`,
                          backgroundColor: cat.score >= 70 ? "#1A8C5B" : cat.score >= 50 ? "#D4940A" : "#C23B3B",
                        }}
                      />
                    </div>
                    <span className="text-sm font-medium text-[#111118] w-8 text-right">{cat.score}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Findings card */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <p className="text-xs font-semibold text-[#8E8EA0] uppercase tracking-wide mb-4">Top Findings</p>

              <div className="space-y-4">
                <div className="p-4 bg-[#C23B3B]/5 border border-[#C23B3B]/20 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-[#C23B3B] uppercase">High Impact Issue</span>
                  </div>
                  <p className="font-semibold text-[#111118] mb-1">No social proof above the fold</p>
                  <p className="text-sm text-[#55556D] mb-3">
                    Visitors see your headline and CTA but no reason to trust you. 67% of visitors look for reviews before taking action.
                  </p>
                  <div className="bg-[#1a1a2e] rounded-lg p-3">
                    <p className="text-xs text-[#a78bfa] font-semibold uppercase tracking-wide mb-1">Fix</p>
                    <p className="text-sm text-[#e4e4ef]">
                      Add a testimonial or customer count to your hero: &ldquo;Join 2,400+ founders tracking their sites&rdquo;
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-signal-subtle border border-signal-border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold text-signal uppercase">Suggested Rewrite</span>
                  </div>
                  <p className="font-semibold text-[#111118] mb-1">Headline could be more specific</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-[#8E8EA0] line-through">&ldquo;The best way to grow your business&rdquo;</p>
                    <p className="text-[#111118]">&ldquo;SaaS founders: see which page changes hurt your conversions&rdquo;</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="px-4 py-20">
        <div className="w-full max-w-3xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Frequently asked questions
            </h2>
          </div>

          <div className="space-y-4">
            {FAQ_ITEMS.map((item, i) => (
              <details key={i} className="glass-card group faq-item">
                <summary className="p-5 cursor-pointer list-none flex items-center justify-between">
                  <span className="font-semibold text-text-primary">{item.question}</span>
                  <svg
                    className="w-5 h-5 text-text-muted transition-transform duration-200 group-open:rotate-180"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="faq-content">
                  <div className="px-5 pb-5 text-text-secondary">
                    {item.answer}
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <CTASection
        headline="See what's working. Fix what's&nbsp;not."
        subheadline="30 seconds. No signup. Stuff you can actually fix today."
        ctaText="Audit my page"
        trustSignals={["Free forever", "No signup required", "Results in 30 seconds"]}
      />
    </div>
  );
}
