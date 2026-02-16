"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { canAccessMobile, type SubscriptionTier } from "@/lib/permissions";

interface MobileUpgradeGateProps {
  tier: SubscriptionTier;
  children: React.ReactNode;
}

/**
 * Viewport-based tier gate for mobile access.
 * Shows upgrade prompt on mobile for Free users.
 * Pro/Scale users and desktop users see children normally.
 */
export function MobileUpgradeGate({ tier, children }: MobileUpgradeGateProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function checkMobile() {
      // Consider mobile if viewport is less than 768px (md breakpoint)
      setIsMobile(window.innerWidth < 768);
    }

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Don't render anything until mounted to avoid hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  // Desktop always allowed
  if (!isMobile) {
    return <>{children}</>;
  }

  // Mobile with Pro tier allowed
  if (canAccessMobile(tier)) {
    return <>{children}</>;
  }

  // Mobile without Pro tier - show upgrade prompt
  return (
    <div className="min-h-screen bg-paper-0 flex flex-col items-center justify-center p-6">
      <div className="glass-card p-8 max-w-sm text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-signal-subtle flex items-center justify-center">
          <svg
            className="w-8 h-8 text-signal"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3"
            />
          </svg>
        </div>

        <h1
          className="text-2xl font-bold text-ink-900 mb-3"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Mobile access is Pro
        </h1>

        <p className="text-ink-500 mb-6">
          Upgrade to Pro to access your Loupe dashboard on mobile devices.
        </p>

        <Link href="/pricing" className="btn-primary block w-full py-3 mb-3">
          Upgrade to Pro
        </Link>

        <p className="text-sm text-ink-400">
          Or visit{" "}
          <span className="font-medium text-ink-500">getloupe.io</span> on
          desktop
        </p>
      </div>
    </div>
  );
}
