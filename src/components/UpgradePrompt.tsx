import Link from "next/link";

interface UpgradePromptProps {
  reason: "page_limit" | "analytics_limit" | "deploy_scans" | "mobile" | "general";
  compact?: boolean;
}

const messages: Record<string, { headline: string; subheadline: string }> = {
  page_limit: {
    headline: "Want to track more pages?",
    subheadline: "Upgrade to add more pages to your account.",
  },
  analytics_limit: {
    headline: "Connect more integrations",
    subheadline: "Upgrade to connect additional analytics tools.",
  },
  deploy_scans: {
    headline: "Get deploy-triggered scans",
    subheadline: "Upgrade to scan your pages automatically when you deploy.",
  },
  mobile: {
    headline: "Access Loupe on mobile",
    subheadline: "Upgrade to Pro to view your dashboard on mobile devices.",
  },
  general: {
    headline: "Unlock more features",
    subheadline: "Upgrade your plan to access premium features.",
  },
};

export function UpgradePrompt({ reason, compact = false }: UpgradePromptProps) {
  const { headline, subheadline } = messages[reason] || messages.general;

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 p-3 bg-signal-subtle rounded-lg border border-signal-border">
        <p className="text-sm text-ink-700">{headline}</p>
        <Link
          href="/pricing"
          className="text-sm font-medium text-signal hover:text-signal-hover whitespace-nowrap"
        >
          Upgrade
        </Link>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 text-center">
      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-signal-subtle flex items-center justify-center">
        <svg
          className="w-6 h-6 text-signal"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>

      <h3
        className="text-lg font-bold text-ink-900 mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {headline}
      </h3>
      <p className="text-ink-500 mb-6">{subheadline}</p>

      <Link href="/pricing" className="btn-primary inline-block px-6 py-2.5">
        View Plans
      </Link>
    </div>
  );
}
