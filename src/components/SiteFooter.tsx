import Link from "next/link";
import LoupeLogo from "./LoupeLogo";

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="max-w-3xl mx-auto px-6">
        {/* Divider with loupe icon */}
        <div className="footer-divider">
          <LoupeLogo size={16} className="text-text-muted" />
        </div>

        {/* Main footer content */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand + tagline */}
          <div className="flex flex-col items-center sm:items-start gap-1">
            <div className="flex items-center gap-2">
              <span
                className="text-base font-medium text-text-primary"
                style={{ fontFamily: "var(--font-instrument-serif)" }}
              >
                Loupe
              </span>
              <span className="text-text-muted">|</span>
              <span className="text-sm text-text-muted">
                We watch. You ship.
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Built for founders who move fast
            </p>
          </div>

          {/* Links */}
          <nav className="flex items-center gap-5 text-sm text-text-muted">
            <Link href="/leaderboard" className="hover:text-accent transition-colors">
              Leaderboard
            </Link>
            <Link href="/" className="hover:text-accent transition-colors">
              Free audit
            </Link>
            <a
              href="mailto:hello@getloupe.io"
              className="hover:text-accent transition-colors"
            >
              Contact
            </a>
          </nav>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.04)] text-center">
          <p className="text-xs text-text-muted">
            {new Date().getFullYear()} Loupe. Your site changed. Did you notice?
          </p>
        </div>
      </div>
    </footer>
  );
}
