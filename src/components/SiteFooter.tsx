import Link from "next/link";
import Image from "next/image";
import LoupeLogo from "./LoupeLogo";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="max-w-5xl mx-auto px-6">
        {/* Divider with loupe icon */}
        <div className="footer-divider">
          <LoupeLogo size={16} className="text-[var(--ink-300)]" />
        </div>

        {/* Main footer content — multi-column */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <Image
                src="/logo.svg"
                alt="Loupe"
                width={64}
                height={21}
                className="h-4 w-auto"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </div>
            <p className="text-xs text-[var(--ink-300)]">
              We watch. You ship.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-[var(--paper-200)] uppercase tracking-wide mb-3">
              Product
            </p>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/website-audit" className="hover:text-white transition-colors">
                Free Audit
              </Link>
              <Link href="/monitor-website-changes" className="hover:text-white transition-colors">
                Monitoring
              </Link>
              <Link href="/pricing" className="hover:text-white transition-colors">
                Pricing
              </Link>
            </nav>
          </div>

          {/* For Tools */}
          <div>
            <p className="text-xs font-semibold text-[var(--paper-200)] uppercase tracking-wide mb-3">
              For AI Tools
            </p>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/for/lovable" className="hover:text-white transition-colors">
                Lovable
              </Link>
              <Link href="/for/cursor" className="hover:text-white transition-colors">
                Cursor
              </Link>
              <Link href="/for/bolt" className="hover:text-white transition-colors">
                Bolt
              </Link>
              <Link href="/for/v0" className="hover:text-white transition-colors">
                v0
              </Link>
            </nav>
          </div>

          {/* Integrations */}
          <div>
            <p className="text-xs font-semibold text-[var(--paper-200)] uppercase tracking-wide mb-3">
              Integrations
            </p>
            <nav className="flex flex-col gap-2 text-sm">
              <Link href="/guides/github" className="hover:text-white transition-colors">
                GitHub
              </Link>
              <Link href="/guides/posthog" className="hover:text-white transition-colors">
                PostHog
              </Link>
              <Link href="/guides/ga4" className="hover:text-white transition-colors">
                Google Analytics
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.1)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-[var(--ink-300)]">
            {new Date().getFullYear()} Loupe. Your site changed. Did you notice?
          </p>
          <nav className="flex items-center gap-4 text-xs">
            <Link href="/alternatives/visualping" className="hover:text-white transition-colors">
              vs Visualping
            </Link>
            <a
              href="mailto:team@getloupe.io"
              className="hover:text-white transition-colors"
            >
              Contact
            </a>
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
