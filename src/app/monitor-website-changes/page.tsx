import { Metadata } from "next";
import FreeAuditForm from "@/components/seo/FreeAuditForm";
import CTASection from "@/components/seo/CTASection";

export const metadata: Metadata = {
  title: "Monitor Website Changes for Content Drift | Loupe",
  description:
    "Monitor your website for changes that affect conversions. AI tools and deploys cause drift in headlines, CTAs, and trust signals. We catch what matters, not pixel diffs.",
};

// Icons
const MessageIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
);

const TrustIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const LayoutIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
  </svg>
);

const AlertIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
);

// What we detect - with depth like website-audit categories
const CHANGE_CATEGORIES = [
  {
    name: "Copy & Messaging",
    icon: <MessageIcon />,
    question: "Did your 'Start free trial' button just become 'Get started'?",
    whatWeDetect: [
      "Headline text changes",
      "CTA button copy updates",
      "Value proposition edits",
      "Pricing copy modifications",
      "Subheadline rewrites",
    ],
    whyItMatters: "Copy changes directly impact conversions. A single word swap can tank your signup rate — or double it.",
    exampleDetection: {
      type: "change" as const,
      before: "Start your free 14-day trial",
      after: "Get started today",
      insight: "Removes 'free' signal and specific timeframe. These typically reduce conversions by 10-30%.",
    },
  },
  {
    name: "Trust Signals",
    icon: <TrustIcon />,
    question: "Did your testimonial carousel disappear in the last deploy?",
    whatWeDetect: [
      "Testimonial sections removed or changed",
      "Customer logo updates",
      "Review counts and ratings",
      "Trust badges (security, payment)",
      "Case study links",
    ],
    whyItMatters: "Trust signals handle objections. Without them, visitors have to take your word for it — and most won't.",
    exampleDetection: {
      type: "removal" as const,
      before: "\"Loupe helped us catch 3 breaking changes in our first week.\" — Sarah, Founder",
      after: "[Section removed]",
      insight: "This testimonial addressed the 'does it actually work?' objection. Consider restoring it.",
    },
  },
  {
    name: "Layout & Structure",
    icon: <LayoutIcon />,
    question: "Did your CTA just move from above the fold to the footer?",
    whatWeDetect: [
      "CTA position shifts",
      "Section reordering",
      "Navigation changes",
      "Hero restructuring",
      "Above-fold content changes",
    ],
    whyItMatters: "Layout affects scan-ability. A CTA that moved below the fold might as well not exist for 40% of visitors.",
    exampleDetection: {
      type: "change" as const,
      before: "CTA button in hero section (above fold)",
      after: "CTA button after feature list (requires scroll)",
      insight: "Primary CTA now requires scrolling. Expected impact: 15-40% fewer clicks.",
    },
  },
  {
    name: "Missing Elements",
    icon: <AlertIcon />,
    question: "Is your pricing section gone? Your contact form missing?",
    whatWeDetect: [
      "Pricing section removal",
      "Feature list deletion",
      "Contact forms missing",
      "Footer link breakage",
      "Navigation item removal",
    ],
    whyItMatters: "Missing elements are silent killers. Your site looks 'fine' but conversion paths are broken.",
    exampleDetection: {
      type: "removal" as const,
      before: "Pricing section with 3 tiers",
      after: "[Not found on page]",
      insight: "Entire pricing section missing. This blocks purchase intent — critical to restore immediately.",
    },
  },
];

const FAQ_ITEMS = [
  {
    question: "How often does Loupe check my pages?",
    answer:
      "You choose: daily, weekly, or on every deploy. If you connect GitHub, we automatically scan after each push to main. Otherwise, we run scheduled scans at your preferred time.",
  },
  {
    question: "What's the difference between this and uptime monitoring?",
    answer:
      "Uptime monitoring tells you if your site is up. We tell you what changed on the page itself — headlines, CTAs, trust signals. Your site can be 'up' while your pricing section is missing.",
  },
  {
    question: "How is this different from visual regression testing?",
    answer:
      "Visual regression catches pixel differences. We catch meaning differences. We don't care if a button moved 2 pixels — we care if your CTA text changed from 'Start free trial' to 'Get started'.",
  },
  {
    question: "Can I monitor competitor pages?",
    answer:
      "Yes. Any public URL. Many founders monitor competitor landing pages to track their messaging changes, pricing updates, and new features.",
  },
  {
    question: "How do I get notified of changes?",
    answer:
      "Email alerts. When we detect a meaningful change, you get an email with: what changed, why it might matter, and a link to the full comparison view.",
  },
  {
    question: "What if I use AI tools like Lovable, Bolt, or Cursor?",
    answer:
      "That's exactly who we built this for. AI tools change things you didn't ask for. Whether you're using Lovable, Bolt, Base44, Cursor, or Replit Agent — we catch the drift before your users notice.",
  },
  {
    question: "Can't I build this myself with Playwright?",
    answer:
      "You could. You'll spend a weekend getting it working. Then Playwright updates and breaks your selectors. Then your IP gets blocked. Then you need residential proxies. We maintain the infrastructure nightmare so you can ship features instead.",
  },
];

// Detection badge component
function DetectionBadge({ type }: { type: "change" | "removal" }) {
  const config = {
    change: { label: "Changed", class: "bg-score-mid/10 text-score-mid border-score-mid/20" },
    removal: { label: "Removed", class: "bg-score-low/10 text-score-low border-score-low/20" },
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${config[type].class}`}>
      {config[type].label}
    </span>
  );
}

export default function MonitorWebsiteChangesPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <section className="pt-16 lg:pt-24 px-4 pb-16">
        <div className="w-full max-w-5xl mx-auto text-center">
          <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-4">
            Drift Detection
          </p>
          <h1
            className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-tight text-text-primary mb-6"
            style={{ fontFamily: "var(--font-instrument-serif)" }}
          >
            Monitor website changes that
            <br />
            <span className="text-accent">actually affect conversions.</span>
          </h1>
          <p className="text-xl text-text-secondary mb-4 max-w-2xl mx-auto">
            Lovable rebuilt your hero. Cursor "fixed" your CTA. Bolt optimized your layout.
            Do you know what they actually changed?
          </p>
          <p className="text-base text-text-muted mb-10 max-w-xl mx-auto">
            Not uptime monitoring. Not pixel diffs. We detect drift in the content that converts:
            headlines, CTAs, trust signals.
          </p>

          <div className="max-w-xl mx-auto">
            <FreeAuditForm ctaText="Check my site for free" />
            <p className="text-sm text-text-muted mt-4">
              See what we'd catch. Then decide if you want ongoing monitoring.
            </p>
          </div>
        </div>
      </section>

      {/* Differentiation */}
      <section className="px-4 py-12 border-b border-border-subtle">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-3">
            Not another Visualping
          </p>
          <p className="text-lg text-text-secondary">
            Generic tools tell you <em>something</em> changed.
            <br />
            Loupe tells you <strong className="text-text-primary">what it means for conversions</strong>.
          </p>
        </div>
      </section>

      {/* What we detect - with depth */}
      <section className="px-4 py-20 bg-bg-inset border-y border-border-subtle">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              What we catch (and&nbsp;what&nbsp;it&nbsp;means)
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Not every change matters. We focus on changes that affect conversions.
            </p>
          </div>

          <div className="space-y-6">
            {CHANGE_CATEGORIES.map((category) => (
              <div key={category.name} className="rounded-2xl border border-border-subtle bg-white overflow-hidden">
                {/* Category header */}
                <div className="p-6 border-b border-border-subtle">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-text-primary mb-1">{category.name}</h3>
                      <p className="text-text-secondary italic">{category.question}</p>
                    </div>
                  </div>
                </div>

                {/* Two columns: What we detect + Example */}
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border-subtle">
                  {/* What we detect */}
                  <div className="p-6">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                      What we detect
                    </p>
                    <ul className="space-y-2">
                      {category.whatWeDetect.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-text-secondary">
                          <svg className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                    <p className="text-sm text-text-muted mt-4 pt-4 border-t border-border-subtle">
                      <strong className="text-text-secondary">Why it matters:</strong> {category.whyItMatters}
                    </p>
                  </div>

                  {/* Example detection */}
                  <div className="p-6 bg-[#fafafa]">
                    <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">
                      Example detection
                    </p>
                    <div className="space-y-3">
                      <DetectionBadge type={category.exampleDetection.type} />
                      <div className="text-sm">
                        <p className="text-text-muted mb-1">Before:</p>
                        <p className="text-text-secondary bg-white border border-border-subtle rounded px-3 py-2 font-mono text-xs">
                          {category.exampleDetection.before}
                        </p>
                      </div>
                      <div className="text-sm">
                        <p className="text-text-muted mb-1">After:</p>
                        <p className="text-text-secondary bg-white border border-border-subtle rounded px-3 py-2 font-mono text-xs">
                          {category.exampleDetection.after}
                        </p>
                      </div>
                      <div className="text-sm bg-accent/5 border border-accent/20 rounded-lg p-3">
                        <p className="text-text-secondary">
                          <strong className="text-accent">Insight:</strong> {category.exampleDetection.insight}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What an alert looks like */}
      <section className="px-4 py-20">
        <div className="w-full max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              What you'll receive
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              When something changes, you get an email with context — not just "something&nbsp;changed."
            </p>
          </div>

          {/* Mock email alert */}
          <div className="rounded-2xl border border-border-subtle bg-white shadow-lg overflow-hidden max-w-2xl mx-auto">
            {/* Email header */}
            <div className="p-4 bg-[#fafafa] border-b border-border-subtle">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-text-primary">Loupe Alert</p>
                  <p className="text-xs text-text-muted">3 changes detected on yoursite.com</p>
                </div>
                <span className="text-xs text-text-muted">Just now</span>
              </div>
            </div>

            {/* Email body */}
            <div className="p-6">
              <h3 className="font-bold text-text-primary mb-4">
                3 changes detected since yesterday
              </h3>

              <div className="space-y-4">
                {/* Change 1 */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-score-low/5 border border-score-low/20">
                  <span className="px-2 py-0.5 text-xs font-medium bg-score-low/10 text-score-low rounded">High</span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">CTA text changed</p>
                    <p className="text-xs text-text-muted mt-1">
                      "Start free trial" → "Get started" — removes 'free' signal
                    </p>
                  </div>
                </div>

                {/* Change 2 */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-score-mid/5 border border-score-mid/20">
                  <span className="px-2 py-0.5 text-xs font-medium bg-score-mid/10 text-score-mid rounded">Medium</span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Testimonial section removed</p>
                    <p className="text-xs text-text-muted mt-1">
                      Customer quote from Sarah no longer on page
                    </p>
                  </div>
                </div>

                {/* Change 3 */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-[#f5f5f5] border border-border-subtle">
                  <span className="px-2 py-0.5 text-xs font-medium bg-[#e5e5e5] text-text-muted rounded">Low</span>
                  <div>
                    <p className="text-sm font-medium text-text-primary">Headline updated</p>
                    <p className="text-xs text-text-muted mt-1">
                      Minor wording change, same meaning
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Scenarios - story-based use cases */}
      <section className="section-dark px-4 py-20">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)", color: "#F5F5F7" }}
            >
              Sound familiar?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Scenario 1 */}
            <div className="bg-white rounded-2xl p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#111118] mb-2">Friday deploy. Monday panic.</h3>
              <p className="text-sm text-[#55556D] mb-4">
                You pushed to prod Friday evening. Monday morning, someone Slacks you: "Did our pricing page disappear?"
              </p>
              <p className="text-sm text-accent font-medium">
                Connect GitHub. Every push triggers a scan. Catch it Friday, not Monday.
              </p>
            </div>

            {/* Scenario 2 */}
            <div className="bg-white rounded-2xl p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
              </div>
              <h3 className="font-bold text-[#111118] mb-2">"I asked Lovable to make the hero better."</h3>
              <p className="text-sm text-[#55556D] mb-4">
                It "improved" your page. Now your signup button is gone and nobody told you. Your friend noticed a week later.
              </p>
              <p className="text-sm text-accent font-medium">
                We show exactly what changed, even when you didn't ask.
              </p>
            </div>

            {/* Scenario 3 */}
            <div className="bg-white rounded-2xl p-6">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent mb-4">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
                </svg>
              </div>
              <h3 className="font-bold text-[#111118] mb-2">Conversions dropped 15%. What changed?</h3>
              <p className="text-sm text-[#55556D] mb-4">
                You see the dip in Mixpanel. You check your Git history. Nothing stands out. What changed?
              </p>
              <p className="text-sm text-accent font-medium">
                We track content changes with timestamps. Correlate metric dips with what actually moved.
              </p>
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
              style={{ fontFamily: "var(--font-instrument-serif)" }}
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
                  <div className="overflow-hidden">
                    <div className="px-5 pb-5 text-text-secondary">
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
        headline="Start with a free audit"
        subheadline="See what we catch on your site. Then decide if you want&nbsp;ongoing&nbsp;monitoring."
        ctaText="Audit my page"
        trustSignals={["Free audit", "No signup required", "Results in 30 seconds"]}
      />
    </div>
  );
}
