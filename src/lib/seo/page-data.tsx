import type { Metadata } from "next";
import type { ReactNode } from "react";

// ===== TOOL LOGOS =====
// Simple SVG representations of each tool's brand

export const LovableLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      fill="#EC4899"
    />
  </svg>
);

export const BoltLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"
      fill="#F59E0B"
      stroke="#F59E0B"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const CursorLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    {/* 3D cube */}
    <path d="M12 2L4 7v10l8 5 8-5V7l-8-5z" fill="#1a1a1a" />
    <path d="M12 2L4 7l8 5 8-5-8-5z" fill="#333" />
    <path d="M12 12l8-5v10l-8 5V12z" fill="#262626" />
    {/* Cursor arrow */}
    <path
      d="M10 8l-2 8 2.5-2.5L12 17l1.5-3.5L16 15l-6-7z"
      fill="#F97316"
    />
  </svg>
);

export const V0Logo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path
      d="M7 6l5 12 5-12"
      stroke="#000"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="18" cy="14" r="3.5" stroke="#000" strokeWidth="2" fill="none" />
  </svg>
);

export const ReplitLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    {/* Replit's "prompt" symbol - three circles in a triangular pattern */}
    <circle cx="12" cy="6" r="3" fill="#F26207" />
    <circle cx="7" cy="15" r="3" fill="#F26207" />
    <circle cx="17" cy="15" r="3" fill="#F26207" />
  </svg>
);

export const Base44Logo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="4" fill="#6366F1" />
    {/* Grid pattern representing building blocks */}
    <rect x="7" y="7" width="4" height="4" rx="1" fill="white" />
    <rect x="13" y="7" width="4" height="4" rx="1" fill="white" />
    <rect x="7" y="13" width="4" height="4" rx="1" fill="white" />
    <rect x="13" y="13" width="4" height="4" rx="1" fill="white" />
  </svg>
);

// Logo component lookup
export const toolLogos: Record<AITool, (props: { className?: string }) => ReactNode> = {
  lovable: LovableLogo,
  bolt: BoltLogo,
  cursor: CursorLogo,
  v0: V0Logo,
  replit: ReplitLogo,
  base44: Base44Logo,
};

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
    headline: "Ship fast with Lovable.\nLoupe shows you what changed.",
    subheadline:
      "Keep prompting. Keep shipping. Loupe watches your live site and tells you exactly what's different after each change.",
    supportingText:
      "The perfect companion for Lovable — screenshot tracking that shows what shipped.",
    painPoints: [
      {
        title: "One prompt breaks three things",
        description:
          "You asked Lovable to fix the header. It also rewrote your hero, moved your CTA, and deleted pricing.",
      },
      {
        title: "Copy gets 'improved'",
        description:
          "Lovable loves to rewrite your headlines. Sometimes that means losing the copy that was actually converting.",
      },
      {
        title: "No visual history",
        description:
          "Lovable doesn't show you what changed. You can't diff prompts or see what your site looked like yesterday.",
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
    headline: "Build full-stack with Bolt.\nLoupe shows you what shipped.",
    subheadline:
      "Bolt deploys fast. Loupe captures what's live — homepage, checkout, every page — so you always know what users see.",
    supportingText:
      "The perfect companion for Bolt — visual monitoring for full-stack deploys.",
    painPoints: [
      {
        title: "One prompt deploys everything",
        description:
          "You asked for a landing page. Bolt built routes, added a database, deployed it all. What's actually live?",
      },
      {
        title: "No staging, no preview",
        description:
          "Bolt ships to production. There's no 'review before deploy' step. It's live the moment it's done.",
      },
      {
        title: "Full-stack blind spots",
        description:
          "Desktop looks fine. But the mobile layout? The checkout flow? The error states? Bolt doesn't show you.",
      },
    ],
    benefits: [
      {
        title: "See what shipped",
        description:
          "After every deploy, we screenshot your live app so you know what users actually see.",
      },
      {
        title: "Catch broken flows",
        description:
          "Not just the homepage — checkout, signup, and conversion paths. All monitored.",
      },
      {
        title: "Alert before users complain",
        description:
          "Email when something important changes. Catch it before support tickets pile up.",
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
      title: "Bolt App Monitoring — See What Your Full-Stack AI Shipped | Loupe",
      description:
        "Building with Bolt? Loupe monitors your live app after every deploy. Catch broken pages and flows before users do. Free audit.",
    },
  },

  cursor: {
    name: "Cursor",
    tagline: "Shipping with Cursor?",
    headline: "Refactor fast with Cursor.\nLoupe catches visual regressions.",
    subheadline:
      "Ship with confidence. Loupe monitors your live site after every push and shows you what actually changed.",
    supportingText:
      "The perfect companion for Cursor — visual regression detection that works with your deploy flow.",
    painPoints: [
      {
        title: "Refactors break pages silently",
        description:
          "Component renamed, props changed, imports updated — and the testimonial grid is blank. No error, just empty.",
      },
      {
        title: "50 files changed, one broke prod",
        description:
          "Your refactor touched half the codebase. Which file deleted the CTA?",
      },
      {
        title: "Tests pass, UI doesn't",
        description:
          "Unit tests don't catch missing social proof. Integration tests don't check your conversion copy.",
      },
    ],
    benefits: [
      {
        title: "Push → Screenshot → Diff",
        description:
          "Connect GitHub. Every deploy triggers a visual capture. See what actually shipped.",
      },
      {
        title: "Commit → Consequence",
        description:
          "See which commit changed which element. Trace the regression to the line.",
      },
      {
        title: "Catch what tests miss",
        description:
          "Visual regressions don't throw errors. Loupe catches them before users do.",
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
      title: "Cursor Deploy Monitoring — Catch Visual Regressions After Refactors | Loupe",
      description:
        "Deploying with Cursor? Loupe monitors your site after every push. See which commit broke which page. Catch visual regressions before users do.",
    },
  },

  v0: {
    name: "v0",
    tagline: "Generating with v0?",
    headline: "Generate beautiful UI with v0.\nLoupe checks what shipped.",
    subheadline:
      "v0 makes it gorgeous. Loupe makes sure your copy, CTAs, and value prop made it to production.",
    supportingText:
      "The perfect companion for v0 — catch placeholder text before it goes live.",
    painPoints: [
      {
        title: "Beautiful but broken",
        description:
          "v0 makes it look great. But your value prop is buried, your CTA is below the fold, and half the copy is placeholder.",
      },
      {
        title: "Placeholder text goes live",
        description:
          "'Your tagline here' and 'Lorem ipsum' have a way of making it to production.",
      },
      {
        title: "Each generation resets",
        description:
          "v0 doesn't remember what worked. Every new prompt starts from scratch.",
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
    headline: "Build and deploy with Replit.\nLoupe shows you what's live.",
    subheadline:
      "Replit Agent ships fast. Loupe captures every deploy so you always know what your users see.",
    supportingText:
      "The perfect companion for Replit — monitoring for auto-deploys.",
    painPoints: [
      {
        title: "It's live before you review it",
        description:
          "Replit Agent deploys automatically. You see 'success' but have no idea what actually changed.",
      },
      {
        title: "'Improve' means different things",
        description:
          "You said improve the landing page. The agent simplified it down to three sentences.",
      },
      {
        title: "Your users are your QA",
        description:
          "No staging, no preview. You find out something's broken when a customer tells you.",
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
    headline: "Build your product with Base44.\nLoupe checks if it's converting.",
    subheadline:
      "Base44 builds fast. Loupe analyzes your live pages to make sure your messaging is clear and your CTAs work.",
    supportingText:
      "The perfect companion for Base44 — conversion-focused page monitoring.",
    painPoints: [
      {
        title: "Lost in translation",
        description:
          "You said 'friendly and professional.' Base44 built 'generic corporate.' Not what you meant.",
      },
      {
        title: "20 prompts later, you forgot",
        description:
          "You've iterated so many times you can't remember what the hero said when it was converting.",
      },
      {
        title: "Quality varies wildly",
        description:
          "One prompt gives you gold. The next gives you 'Welcome to our innovative solution platform.'",
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

export const INTEGRATIONS = ["ga4"] as const;
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
