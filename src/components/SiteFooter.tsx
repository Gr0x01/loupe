import Link from "next/link";
import Image from "next/image";
import LoupeLogo from "./LoupeLogo";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="max-w-5xl mx-auto px-6">
        {/* Divider with loupe icon */}
        <div className="footer-divider">
          <LoupeLogo size={16} className="text-text-muted" />
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
              />
            </div>
            <p className="text-xs text-text-muted">
              We watch. You ship.
            </p>
          </div>

          {/* Product */}
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Product
            </p>
            <nav className="flex flex-col gap-2 text-sm text-text-muted">
              <Link href="/website-audit" className="hover:text-accent transition-colors">
                Free Audit
              </Link>
              <Link href="/monitor-website-changes" className="hover:text-accent transition-colors">
                Monitoring
              </Link>
              <Link href="/leaderboard" className="hover:text-accent transition-colors">
                Leaderboard
              </Link>
            </nav>
          </div>

          {/* For Tools */}
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              For AI Tools
            </p>
            <nav className="flex flex-col gap-2 text-sm text-text-muted">
              <Link href="/for/lovable" className="hover:text-accent transition-colors">
                Lovable
              </Link>
              <Link href="/for/cursor" className="hover:text-accent transition-colors">
                Cursor
              </Link>
              <Link href="/for/bolt" className="hover:text-accent transition-colors">
                Bolt
              </Link>
              <Link href="/for/v0" className="hover:text-accent transition-colors">
                v0
              </Link>
            </nav>
          </div>

          {/* Integrations */}
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-3">
              Integrations
            </p>
            <nav className="flex flex-col gap-2 text-sm text-text-muted">
              <Link href="/guides/github" className="hover:text-accent transition-colors">
                GitHub
              </Link>
              <Link href="/guides/posthog" className="hover:text-accent transition-colors">
                PostHog
              </Link>
              <Link href="/guides/ga4" className="hover:text-accent transition-colors">
                Google Analytics
              </Link>
            </nav>
          </div>
        </div>

        {/* Bottom row */}
        <div className="pt-4 border-t border-[rgba(0,0,0,0.04)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            {new Date().getFullYear()} Loupe. Your site changed. Did you notice?
          </p>
          <nav className="flex items-center gap-4 text-xs text-text-muted">
            <Link href="/alternatives/visualping" className="hover:text-accent transition-colors">
              vs Visualping
            </Link>
            <a
              href="mailto:hello@getloupe.io"
              className="hover:text-accent transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
