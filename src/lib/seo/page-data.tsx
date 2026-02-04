import type { Metadata } from "next";

// ===== TOOL PAGES DATA =====

export const AI_TOOLS = ["lovable", "bolt", "cursor", "v0", "replit", "base44"] as const;
export type AITool = (typeof AI_TOOLS)[number];

export interface ToolPageData {
  name: string;
  tagline: string;
  headline: string;
  subheadline: string;
  supportingText: string;
  painPoints: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  mockChanges: {
    type: "resolved" | "regressed" | "new";
    title: string;
    detail: string;
    element: string;
  }[];
  metadata: Metadata;
}

export const toolPageData: Record<AITool, ToolPageData> = {
  lovable: {
    name: "Lovable",
    tagline: "Building with Lovable?",
    headline: "Lovable changed your site.\nDo you know what's different?",
    subheadline:
      "Your AI said 'Done!' — but did your pricing section survive? Your CTA? Your testimonials?",
    supportingText:
      "Loupe screenshots your site after every prompt. We'll show you exactly what's different.",
    painPoints: [
      {
        title: "Features vanish silently",
        description:
          "One prompt to 'fix the header' and suddenly your pricing comparison is gone.",
      },
      {
        title: "Copy gets rewritten",
        description:
          "Lovable loves to 'improve' your headlines. Sometimes that means losing what worked.",
      },
      {
        title: "No way to compare",
        description:
          "There's no history, no screenshots. You can't even remember what it looked like yesterday.",
      },
    ],
    benefits: [
      {
        title: "See what's live",
        description:
          "After every prompt, we screenshot and analyze what's actually on your site.",
      },
      {
        title: "Know what changed",
        description:
          "Clear breakdown: what moved, what disappeared, what got rewritten.",
      },
      {
        title: "Catch it before users do",
        description:
          "Get alerted when something important changes. Before conversions drop.",
      },
    ],
    mockChanges: [
      {
        type: "regressed",
        title: "Pricing section removed",
        detail: '"Add dark mode" prompt deleted it',
        element: "Pricing",
      },
      {
        type: "new",
        title: "Headline rewritten",
        detail: '"Ship fast" → "Build better products"',
        element: "Hero",
      },
      {
        type: "resolved",
        title: "CTA restored to fold",
        detail: "Back above viewport",
        element: "Hero section",
      },
    ],
    metadata: {
      title: "Lovable Website Monitoring — Track What Your AI Changes | Loupe",
      description:
        "Monitor your Lovable landing page for drift. See what your AI changed, catch missing sections, and track copy changes before users notice. Free audit.",
    },
  },

  bolt: {
    name: "Bolt",
    tagline: "Building with Bolt?",
    headline: "Bolt 'fixed' your checkout.\nWhat else did it change?",
    subheadline:
      "AI moves fast. Your site changes faster. Know what's different before your customers complain.",
    supportingText:
      "Loupe monitors your pages and shows you exactly what drifted.",
    painPoints: [
      {
        title: "Changes cascade",
        description:
          "One fix triggers three more changes you didn't ask for.",
      },
      {
        title: "Mobile breaks silently",
        description:
          "Desktop looks fine. Mobile? That's where Bolt decided to experiment.",
      },
      {
        title: "No way to compare",
        description:
          "You can't see what changed if you don't know what it looked like before.",
      },
    ],
    benefits: [
      {
        title: "Screenshot every change",
        description:
          "We capture your pages after updates so you have proof of what's live.",
      },
      {
        title: "Meaningful diff",
        description:
          "Not pixel changes — actual content changes. Headlines, CTAs, sections.",
      },
      {
        title: "Alert on drift",
        description:
          "Email when something important moves. Weekly or after every update.",
      },
    ],
    mockChanges: [
      {
        type: "new",
        title: "Button text changed",
        detail: '"Buy now" → "Continue"',
        element: "Checkout",
      },
      {
        type: "regressed",
        title: "Trust badges removed",
        detail: "Payment security icons gone",
        element: "Footer",
      },
      {
        type: "resolved",
        title: "Form validation added",
        detail: "Email field now validates",
        element: "Signup form",
      },
    ],
    metadata: {
      title: "Bolt Website Monitoring — Track What Your AI Changes | Loupe",
      description:
        "Monitor your Bolt landing page for drift. See what your AI changed and catch broken layouts before customers notice. Free audit.",
    },
  },

  cursor: {
    name: "Cursor",
    tagline: "Shipping with Cursor?",
    headline: "Cursor refactored your code.\nWhat happened to your site?",
    subheadline:
      "The code looks cleaner. But did your marketing page survive the refactor?",
    supportingText:
      "Loupe connects to your deploys and shows you what changed customer-facing.",
    painPoints: [
      {
        title: "Refactors break UI",
        description:
          "Component renamed, import updated, props changed — and the hero section is blank.",
      },
      {
        title: "Speed over review",
        description:
          "Cursor is fast. Too fast to catch every side effect before you push.",
      },
      {
        title: "Lost in the diff",
        description:
          "50 files changed. Which one broke your landing page?",
      },
    ],
    benefits: [
      {
        title: "Deploy → Screenshot → Compare",
        description:
          "Connect GitHub. We watch what actually renders after your push.",
      },
      {
        title: "Code meets outcome",
        description:
          "See which commit changed which element. Attribution, not guessing.",
      },
      {
        title: "Catch visual regressions",
        description:
          "Not every bug throws an error. Some just delete your social proof.",
      },
    ],
    mockChanges: [
      {
        type: "regressed",
        title: "Component blank render",
        detail: "TestimonialGrid shows nothing",
        element: "Social proof",
      },
      {
        type: "new",
        title: "Hero text changed",
        detail: "Refactor touched copy file",
        element: "Hero",
      },
      {
        type: "resolved",
        title: "Image paths fixed",
        detail: "Logo now loads correctly",
        element: "Header",
      },
    ],
    metadata: {
      title: "Cursor Website Monitoring — Track What Your AI Changed | Loupe",
      description:
        "Shipping with Cursor? Loupe monitors your site after every deploy. See what your refactor actually changed on the live site.",
    },
  },

  v0: {
    name: "v0",
    tagline: "Generating with v0?",
    headline: "v0 generated your UI.\nDoes it still say what you meant?",
    subheadline:
      "Beautiful components. But is your value prop still clear? Is your CTA still visible?",
    supportingText:
      "Loupe analyzes your pages for marketing effectiveness — not just pixel perfection.",
    painPoints: [
      {
        title: "Style over substance",
        description:
          "v0 optimizes for looks. Your conversion copy? Not its priority.",
      },
      {
        title: "Generic copy slips in",
        description:
          '"Lorem ipsum" and placeholder text have a way of going live.',
      },
      {
        title: "Iteration drift",
        description:
          "Each generation is a fresh start. Your carefully tuned copy? Gone.",
      },
    ],
    benefits: [
      {
        title: "Content-aware analysis",
        description:
          "We read your headlines, CTAs, and trust signals — not just colors.",
      },
      {
        title: "Track iterations",
        description:
          "Compare what you had vs what v0 generated. Decide what to keep.",
      },
      {
        title: "Marketing + design",
        description:
          "Check if your page converts, not just if it looks good.",
      },
    ],
    mockChanges: [
      {
        type: "new",
        title: "Placeholder copy live",
        detail: '"Your tagline here" in hero',
        element: "Hero",
      },
      {
        type: "regressed",
        title: "CTA buried below fold",
        detail: "Was above, now at bottom",
        element: "Hero section",
      },
      {
        type: "resolved",
        title: "Spacing improved",
        detail: "Better visual hierarchy",
        element: "Layout",
      },
    ],
    metadata: {
      title: "v0 Website Monitoring — Check What Your AI Generated | Loupe",
      description:
        "Generating UI with v0? Loupe monitors your pages for conversion, not just design. See what changed and catch placeholder copy before it goes live.",
    },
  },

  replit: {
    name: "Replit",
    tagline: "Building on Replit?",
    headline: "Replit Agent built your site.\nWhat did it actually change?",
    subheadline:
      "The AI said it's done. But your homepage, your pricing, your signup flow — did they survive?",
    supportingText:
      "Loupe monitors your live site and shows you when something drifts.",
    painPoints: [
      {
        title: "Black box updates",
        description:
          "Replit Agent makes changes and goes live. You see 'success.' What changed?",
      },
      {
        title: "Prompt confusion",
        description:
          "Your prompt said 'improve.' The agent's idea of improvement might differ.",
      },
      {
        title: "No staging",
        description:
          "It's live the moment it's done. Your users find the bugs.",
      },
    ],
    benefits: [
      {
        title: "Know before users do",
        description:
          "We catch changes right away, before anyone complains.",
      },
      {
        title: "Plain English changes",
        description:
          '"Your headline changed from X to Y." Not code diffs — real changes.',
      },
      {
        title: "Weekly digest",
        description:
          "Prefer not to think about it? Get a weekly summary of what moved.",
      },
    ],
    mockChanges: [
      {
        type: "regressed",
        title: "Feature list removed",
        detail: '"Simplify" prompt went too far',
        element: "Features",
      },
      {
        type: "new",
        title: "New footer links",
        detail: "Agent added placeholder links",
        element: "Footer",
      },
      {
        type: "resolved",
        title: "Mobile nav working",
        detail: "Hamburger menu now opens",
        element: "Navigation",
      },
    ],
    metadata: {
      title: "Replit Website Monitoring — See What Replit Agent Changed | Loupe",
      description:
        "Building on Replit? Loupe monitors your site after every agent change. Know what's different before users notice.",
    },
  },

  base44: {
    name: "Base44",
    tagline: "Building with Base44?",
    headline: "Base44 built your product.\nIs your landing page still selling it?",
    subheadline:
      "You described what you wanted. But does the live site match your vision?",
    supportingText:
      "Loupe watches your pages and flags when the message drifts from your intent.",
    painPoints: [
      {
        title: "Intent vs output",
        description:
          "You said 'professional.' Base44 heard 'corporate.' Now your page feels cold.",
      },
      {
        title: "Rapid iteration blur",
        description:
          "After 20 prompts, do you remember what the hero originally said?",
      },
      {
        title: "Copy quality varies",
        description:
          "Some generations nail it. Others produce 'Welcome to our platform.'",
      },
    ],
    benefits: [
      {
        title: "Compare iterations",
        description:
          "See how your page evolved across prompts. Keep what worked.",
      },
      {
        title: "Quality scoring",
        description:
          "We analyze headlines, CTAs, and trust signals for effectiveness.",
      },
      {
        title: "Continuous watch",
        description:
          "Not just one audit — ongoing monitoring as you iterate.",
      },
    ],
    mockChanges: [
      {
        type: "new",
        title: "Generic headline",
        detail: '"Welcome to our platform"',
        element: "Hero",
      },
      {
        type: "regressed",
        title: "Social proof missing",
        detail: "Testimonials section gone",
        element: "Trust",
      },
      {
        type: "resolved",
        title: "CTA clarity improved",
        detail: '"Get started" → "Start free trial"',
        element: "Hero",
      },
    ],
    metadata: {
      title: "Base44 Website Monitoring — Track What Your AI Built | Loupe",
      description:
        "Building with Base44? Loupe monitors your pages as you iterate. See what changed and keep what works.",
    },
  },
};

// ===== CORE SEO PAGES DATA =====

export interface CoreSEOPageData {
  headline: string;
  subheadline: string;
  supportingText?: string;
  problemSection: {
    headline: string;
    points: { title: string; description: string }[];
  };
  benefits: { title: string; description: string }[];
  metadata: Metadata;
}

export const monitorWebsiteChangesData: CoreSEOPageData = {
  headline: "Monitor your website for changes that matter",
  subheadline:
    "Not uptime. Not broken links. The stuff that tanks conversions — headlines, CTAs, trust signals.",
  supportingText:
    "Most monitoring tools tell you something changed. Loupe tells you what changed and why it matters.",
  problemSection: {
    headline: "Your site changes. Do you notice?",
    points: [
      {
        title: "Deploys drift",
        description:
          "Every push is a chance for something customer-facing to break. A headline gets overwritten. A CTA disappears.",
      },
      {
        title: "Third parties update",
        description:
          "That widget, that embed, that script — they change without asking. And you find out from angry customers.",
      },
      {
        title: "AI assistants rewrite",
        description:
          "Copilot, Cursor, Lovable — they help you ship faster. They also change things you didn't ask them to.",
      },
    ],
  },
  benefits: [
    {
      title: "Screenshot on schedule",
      description:
        "Daily, weekly, or after every deploy. We capture what's actually live.",
    },
    {
      title: "Smart change detection",
      description:
        "Not pixel diffs — content analysis. What moved, what's missing, what got rewritten.",
    },
    {
      title: "Alert when it matters",
      description:
        "Email when headlines change, CTAs move, or trust signals disappear.",
    },
  ],
  metadata: {
    title: "Monitor Website Changes — Loupe",
    description:
      "Monitor your website for meaningful changes. Get alerted when headlines, CTAs, or trust signals change. Not pixel diffs — real content analysis.",
  },
};

export const websiteAuditData: CoreSEOPageData = {
  headline: "Free website audit in 30 seconds",
  subheadline:
    "Paste your URL. Get a conversion-focused analysis of your headlines, CTAs, and trust signals.",
  supportingText:
    "No signup required. See what's working, what's not, and what to fix first.",
  problemSection: {
    headline: "Is your page actually converting?",
    points: [
      {
        title: "Looks good, converts bad",
        description:
          "A beautiful page isn't always an effective page. Design without strategy leaks conversions.",
      },
      {
        title: "Blind spots everywhere",
        description:
          "You've stared at it too long. You can't see what a first-time visitor sees.",
      },
      {
        title: "Generic advice doesn't help",
        description:
          '"Add more CTAs" means nothing. You need specific, actionable feedback on YOUR page.',
      },
    ],
  },
  benefits: [
    {
      title: "Instant analysis",
      description:
        "Screenshot, analyze, score — all in under 30 seconds. No waiting.",
    },
    {
      title: "Conversion-focused",
      description:
        "Grounded in proven frameworks: AIDA, Cialdini, Fogg. Not just aesthetics.",
    },
    {
      title: "Actionable fixes",
      description:
        'Specific rewrites and recommendations. Not vague "consider improving."',
    },
  ],
  metadata: {
    title: "Free Website Audit — Loupe",
    description:
      "Get a free conversion-focused website audit in 30 seconds. Analyze headlines, CTAs, and trust signals. No signup required.",
  },
};

export const visualpingAlternativeData: CoreSEOPageData & {
  comparisonTable: { feature: string; loupe: string; visualping: string }[];
} = {
  headline: "Loupe vs Visualping: Change detection that understands your site",
  subheadline:
    "Visualping tells you something changed. Loupe tells you what changed, why it matters, and what to do about it.",
  problemSection: {
    headline: "Change alerts aren't enough",
    points: [
      {
        title: "Noise vs signal",
        description:
          "Visualping flags every pixel shift. You get alerts for things that don't matter.",
      },
      {
        title: "No context",
        description:
          '"Something changed" isn\'t actionable. You still have to figure out what and why.',
      },
      {
        title: "Manual review",
        description:
          "You're the one deciding if a change matters. That's the job the tool should do.",
      },
    ],
  },
  benefits: [
    {
      title: "Content-aware analysis",
      description:
        "We understand headlines, CTAs, and trust signals. Not just visual differences.",
    },
    {
      title: "Impact assessment",
      description:
        "Each change comes with context: what it affects and whether you should care.",
    },
    {
      title: "Actionable suggestions",
      description:
        'Not just "changed" — specific recommendations for what to do next.',
    },
  ],
  comparisonTable: [
    {
      feature: "Change detection",
      loupe: "Content-aware (headlines, CTAs)",
      visualping: "Visual/pixel-based",
    },
    {
      feature: "Analysis",
      loupe: "Explains what changed & why",
      visualping: "Shows diff only",
    },
    {
      feature: "Recommendations",
      loupe: "Specific actionable fixes",
      visualping: "None",
    },
    {
      feature: "Deploy integration",
      loupe: "GitHub webhooks",
      visualping: "Manual scheduling only",
    },
    {
      feature: "Analytics correlation",
      loupe: "PostHog/GA4 integration",
      visualping: "None",
    },
    {
      feature: "Focus",
      loupe: "Marketing & conversion pages",
      visualping: "Any webpage monitoring",
    },
  ],
  metadata: {
    title: "Loupe vs Visualping — Smarter Website Change Monitoring",
    description:
      "Compare Loupe vs Visualping. Get content-aware change detection that explains what changed, not just that something changed.",
  },
};

// ===== INTEGRATION GUIDES DATA =====

export const INTEGRATIONS = ["posthog", "ga4", "github"] as const;
export type Integration = (typeof INTEGRATIONS)[number];

export interface IntegrationGuideData {
  name: string;
  tagline: string;
  headline: string;
  subheadline: string;
  steps: { title: string; description: string }[];
  benefits: { title: string; description: string }[];
  metadata: Metadata;
}

export const integrationGuideData: Record<Integration, IntegrationGuideData> = {
  posthog: {
    name: "PostHog",
    tagline: "Connect PostHog",
    headline: "See what your changes did to your metrics",
    subheadline:
      "Connect PostHog and Loupe correlates page changes with your analytics. Did that headline change help or hurt?",
    steps: [
      {
        title: "Connect your PostHog project",
        description:
          "One-click OAuth. We read pageviews, events, and funnels — nothing else.",
      },
      {
        title: "We track your pages",
        description:
          "Loupe monitors your pages and timestamps every change we detect.",
      },
      {
        title: "See the correlation",
        description:
          "After each change, we pull your metrics and show what moved.",
      },
    ],
    benefits: [
      {
        title: "Change attribution",
        description:
          '"Bounce rate dropped 12% after this headline change." Real numbers.',
      },
      {
        title: "Catch regressions early",
        description:
          "Conversions down? See which change happened right before the dip.",
      },
      {
        title: "Data-driven iteration",
        description:
          "Stop guessing. Know which version of your page actually performs.",
      },
    ],
    metadata: {
      title: "PostHog Integration — Loupe",
      description:
        "Connect PostHog to Loupe. Correlate page changes with your analytics. See which changes helped and which hurt.",
    },
  },

  ga4: {
    name: "Google Analytics 4",
    tagline: "Connect GA4",
    headline: "Connect your changes to your conversions",
    subheadline:
      "Link GA4 to see how page changes affect your traffic, engagement, and goals.",
    steps: [
      {
        title: "Authorize GA4 access",
        description:
          "Secure OAuth connection. Read-only access to your analytics data.",
      },
      {
        title: "Select your property",
        description:
          "Choose which GA4 property to link. Multi-site support coming soon.",
      },
      {
        title: "View correlated insights",
        description:
          "Each page change shows before/after metrics from your GA4 data.",
      },
    ],
    benefits: [
      {
        title: "Traffic correlation",
        description:
          "See if page changes affected sessions, users, or bounce rate.",
      },
      {
        title: "Goal tracking",
        description:
          "Link changes to your GA4 conversions and events.",
      },
      {
        title: "Historical context",
        description:
          "Compare periods before and after each detected change.",
      },
    ],
    metadata: {
      title: "Google Analytics 4 Integration — Loupe",
      description:
        "Connect GA4 to Loupe. See how page changes affect your traffic and conversions. Data-driven page optimization.",
    },
  },

  github: {
    name: "GitHub",
    tagline: "Connect GitHub",
    headline: "Know what shipped with every deploy",
    subheadline:
      "Connect your repo. We watch for pushes and scan your site right after deploy. See which commit changed what.",
    steps: [
      {
        title: "Install the GitHub App",
        description:
          "Select which repos to connect. We only need push event access.",
      },
      {
        title: "Deploy triggers scan",
        description:
          "Push to main → we wait for deploy → we screenshot and analyze.",
      },
      {
        title: "See the commit context",
        description:
          "Each change shows the commit that triggered it. Files changed, author, message.",
      },
    ],
    benefits: [
      {
        title: "Automatic monitoring",
        description:
          "No manual scheduling. Every deploy gets captured and analyzed.",
      },
      {
        title: "Commit attribution",
        description:
          '"This change came from commit abc123." Debug faster.',
      },
      {
        title: "Team visibility",
        description:
          "Everyone sees what shipped. No more 'who changed the homepage?'",
      },
    ],
    metadata: {
      title: "GitHub Integration — Loupe",
      description:
        "Connect GitHub to Loupe. Automatically scan your site after every deploy. See which commits changed what.",
    },
  },
};

// ===== SHARED ICONS =====
// These are simple SVG icon components for use in BenefitGrid

export const ScreenshotIcon = () => (
  <svg
    className="w-10 h-10 text-accent"
    fill="none"
    viewBox="0 0 40 40"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <rect x="4" y="6" width="32" height="24" rx="3" />
    <circle cx="20" cy="18" r="6" />
    <path d="M4 26h32" />
  </svg>
);

export const AlertIcon = () => (
  <svg
    className="w-10 h-10 text-accent"
    fill="none"
    viewBox="0 0 40 40"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <path d="M20 4v24M20 32v2" strokeLinecap="round" />
    <path d="M8 16c0-6.627 5.373-12 12-12s12 5.373 12 12v12H8V16z" />
  </svg>
);

export const ChartUpIcon = () => (
  <svg
    className="w-10 h-10 text-accent"
    fill="none"
    viewBox="0 0 40 40"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <polyline points="4 28 14 18 22 24 36 10" strokeLinecap="round" strokeLinejoin="round" />
    <polyline points="28 10 36 10 36 18" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CompareIcon = () => (
  <svg
    className="w-10 h-10 text-accent"
    fill="none"
    viewBox="0 0 40 40"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <rect x="4" y="8" width="12" height="24" rx="2" />
    <rect x="24" y="8" width="12" height="24" rx="2" />
    <path d="M16 20h8" strokeLinecap="round" />
  </svg>
);

export const GitBranchIcon = () => (
  <svg
    className="w-10 h-10 text-accent"
    fill="none"
    viewBox="0 0 40 40"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <circle cx="12" cy="10" r="4" />
    <circle cx="12" cy="30" r="4" />
    <circle cx="28" cy="18" r="4" />
    <path d="M12 14v12M12 18c0-4 8-4 8-4h4" />
  </svg>
);

export const EyeIcon = () => (
  <svg
    className="w-10 h-10 text-accent"
    fill="none"
    viewBox="0 0 40 40"
    stroke="currentColor"
    strokeWidth={1.5}
  >
    <ellipse cx="20" cy="20" rx="16" ry="10" />
    <circle cx="20" cy="20" r="5" />
  </svg>
);
