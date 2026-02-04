import { Metadata } from "next";
import FreeAuditForm from "@/components/seo/FreeAuditForm";
import CTASection from "@/components/seo/CTASection";
import MockComparisonCard from "@/components/MockComparisonCard";

export const metadata: Metadata = {
  title: "Monitor Website Changes — Track Headlines, CTAs & Trust Signals | Loupe",
  description:
    "Monitor your website for meaningful changes. Get alerted when headlines, CTAs, or trust signals change. Not pixel diffs — content analysis that tells you what matters.",
};

// Icons
const CameraIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
  </svg>
);

const DiffIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
  </svg>
);

const BellIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
  </svg>
);

const GitIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <circle cx="12" cy="6" r="3" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="18" r="3" />
    <path d="M12 9v3m0 0l-4.5 4.5M12 12l4.5 4.5" strokeLinecap="round" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
  </svg>
);

// What we detect
const CHANGE_TYPES = [
  {
    category: "Copy Changes",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
      </svg>
    ),
    examples: ["Headline rewrites", "CTA button text", "Value propositions", "Pricing copy"],
  },
  {
    category: "Trust Signals",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    examples: ["Testimonials removed", "Customer logos changed", "Review counts", "Trust badges"],
  },
  {
    category: "Layout Shifts",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
    examples: ["CTA moved below fold", "Sections reordered", "Navigation changes", "Hero restructured"],
  },
  {
    category: "Missing Elements",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    examples: ["Pricing section gone", "Feature list removed", "Contact form missing", "Footer links broken"],
  },
];

const FAQ_ITEMS = [
  {
    question: "How often does Loupe check my pages?",
    answer:
      "You choose: daily, weekly, or on every deploy. If you connect GitHub, we automatically scan after each push to main. Otherwise, we run scheduled scans at 9am UTC.",
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
    question: "What if I use AI coding tools like Lovable or Cursor?",
    answer:
      "That's exactly who we built this for. AI tools change things you didn't ask for. We catch those changes before your users notice.",
  },
];

// Use case cards
const USE_CASES = [
  {
    title: "After deploys",
    description: "Connect GitHub. Every push to main triggers a scan. See what your deploy actually changed.",
    icon: <GitIcon />,
  },
  {
    title: "Weekly check-ins",
    description: "Too busy to watch your site? We'll email you weekly with any changes we detected.",
    icon: <BellIcon />,
  },
  {
    title: "With analytics",
    description: "Connect PostHog or GA4. We'll correlate page changes with your metrics. See what actually moved the needle.",
    icon: <ChartIcon />,
  },
];

export default function MonitorWebsiteChangesPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Hero */}
      <section className="pt-16 lg:pt-24 px-4 pb-16">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <p className="text-xs font-semibold text-accent uppercase tracking-wide mb-4">
                Website Monitoring
              </p>
              <h1
                className="text-[clamp(2.25rem,5vw,3.5rem)] leading-[1.1] tracking-tight text-text-primary mb-6"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Your site changes.
                <br />
                <span className="text-accent">Do you notice?</span>
              </h1>
              <p className="text-xl text-text-secondary mb-4 max-w-xl mx-auto lg:mx-0">
                Deploys, AI tools, third-party scripts — your pages change constantly. We watch for the changes that matter: headlines, CTAs, trust signals.
              </p>
              <p className="text-base text-text-muted mb-10 max-w-xl mx-auto lg:mx-0">
                Not uptime monitoring. Not pixel diffs. The stuff that actually affects conversions.
              </p>

              <div className="max-w-xl mx-auto lg:mx-0">
                <FreeAuditForm ctaText="Start with a free audit" />
                <p className="text-sm text-text-muted mt-4 text-center lg:text-left">
                  See what we catch. Then decide if you want ongoing monitoring.
                </p>
              </div>
            </div>

            <div className="flex justify-center lg:justify-end">
              <MockComparisonCard />
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-20 bg-bg-inset border-y border-border-subtle">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              How monitoring works
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Three steps. Set it and forget it.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                icon: <CameraIcon />,
                title: "We screenshot",
                description: "On your schedule — daily, weekly, or after every deploy. We capture full-page screenshots and extract all the text, buttons, and links.",
              },
              {
                step: "2",
                icon: <DiffIcon />,
                title: "We compare",
                description: "Not pixel diffing. Content analysis. We identify what changed: headlines, CTAs, trust signals, section order. The stuff that affects conversions.",
              },
              {
                step: "3",
                icon: <BellIcon />,
                title: "We alert",
                description: "Email when something meaningful changes. Clear explanation of what moved, what's missing, and why it might matter. No alert fatigue.",
              },
            ].map((item) => (
              <div key={item.step} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center font-bold">
                    {item.step}
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    {item.icon}
                  </div>
                </div>
                <h3 className="font-bold text-text-primary mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we detect */}
      <section className="px-4 py-20">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] text-text-primary leading-tight mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              What we catch
            </h2>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Changes that matter to conversions. Not every pixel shift.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {CHANGE_TYPES.map((type) => (
              <div key={type.category} className="glass-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    {type.icon}
                  </div>
                  <h3 className="font-bold text-text-primary">{type.category}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {type.examples.map((example, i) => (
                    <span
                      key={i}
                      className="text-xs px-3 py-1.5 rounded-full bg-bg-inset text-text-secondary border border-border-subtle"
                    >
                      {example}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="section-dark px-4 py-20">
        <div className="w-full max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2
              className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-tight mb-4"
              style={{ fontFamily: "var(--font-instrument-serif)", color: "#F5F5F7" }}
            >
              Monitor your way
            </h2>
            <p className="text-lg" style={{ color: "rgba(245, 245, 247, 0.7)" }}>
              Fits into how you already work.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {USE_CASES.map((useCase) => (
              <div key={useCase.title} className="bg-white rounded-2xl p-6 shadow-lg">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent mb-4">
                  {useCase.icon}
                </div>
                <h3 className="font-bold text-[#111118] mb-2">{useCase.title}</h3>
                <p className="text-sm text-[#55556D]">{useCase.description}</p>
              </div>
            ))}
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
        headline="Start with a free audit"
        subheadline="See what we catch on your site. Then decide if you want&nbsp;ongoing&nbsp;monitoring."
        ctaText="Audit my page"
        trustSignals={["Free audit", "No signup required", "Results in 30 seconds"]}
      />
    </div>
  );
}
