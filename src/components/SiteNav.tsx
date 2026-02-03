"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SiteNav() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [underlineStyle, setUnderlineStyle] = useState({ left: 0, width: 0, opacity: 0 });
  const [hasInitialized, setHasInitialized] = useState(false);
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);

  const navRef = useRef<HTMLElement>(null);
  const linksRef = useRef<Map<string, HTMLAnchorElement>>(new Map());

  // Store link ref
  const setLinkRef = useCallback((href: string, el: HTMLAnchorElement | null) => {
    if (el) {
      linksRef.current.set(href, el);
    } else {
      linksRef.current.delete(href);
    }
  }, []);

  useEffect(() => {
    // Check auth state
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
      setAuthChecked(true);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Update underline position when pathname or auth changes
  useEffect(() => {
    // Wait for auth to be checked before positioning underline
    if (!authChecked) return;

    const updateUnderline = () => {
      const activeLink = linksRef.current.get(pathname);
      const nav = navRef.current;

      if (activeLink && nav) {
        const navRect = nav.getBoundingClientRect();
        const linkRect = activeLink.getBoundingClientRect();

        setUnderlineStyle({
          left: linkRect.left - navRect.left,
          width: linkRect.width,
          opacity: 1,
        });
      } else {
        setUnderlineStyle(prev => ({ ...prev, opacity: 0 }));
      }

      // Enable transitions after first position is set
      if (!hasInitialized) {
        requestAnimationFrame(() => setHasInitialized(true));
      }
    };

    // Small delay to ensure refs are set after render
    const timer = setTimeout(updateUnderline, 10);

    // Also update on resize
    window.addEventListener("resize", updateUnderline);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateUnderline);
    };
  }, [pathname, isAuthenticated, authChecked, hasInitialized]);

  const isActive = (href: string) => pathname === href;

  return (
    <header className="site-nav">
      <div className="max-w-3xl mx-auto px-4">
        <div className="site-nav-inner">
          {/* Logo */}
          <Link href="/" className="site-nav-logo group">
            <Image
              src="/logo.svg"
              alt="Loupe"
              width={80}
              height={26}
              className="h-6 w-auto"
              priority
            />
          </Link>

          {/* Desktop nav with sliding underline */}
          <nav ref={navRef} className="hidden md:flex items-center gap-2 relative h-full">
            {isAuthenticated && (
              <Link
                ref={(el) => setLinkRef("/dashboard", el)}
                href="/dashboard"
                className={`nav-link ${isActive("/dashboard") ? "nav-link-active" : ""}`}
              >
                Your pages
              </Link>
            )}
            <Link
              ref={(el) => setLinkRef("/leaderboard", el)}
              href="/leaderboard"
              className={`nav-link ${isActive("/leaderboard") ? "nav-link-active" : ""}`}
            >
              Leaderboard
            </Link>
            {isAuthenticated ? (
              <Link
                ref={(el) => setLinkRef("/settings/integrations", el)}
                href="/settings/integrations"
                className={`nav-link ${isActive("/settings/integrations") ? "nav-link-active" : ""}`}
              >
                Settings
              </Link>
            ) : (
              <Link
                ref={(el) => setLinkRef("/login", el)}
                href="/login"
                className="nav-link"
              >
                Sign in
              </Link>
            )}

            {/* Sliding underline */}
            <span
              className={`nav-underline ${hasInitialized ? "nav-underline-animated" : ""}`}
              style={{
                left: underlineStyle.left,
                width: underlineStyle.width,
                opacity: underlineStyle.opacity,
              }}
            />
          </nav>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 -mr-2 text-text-secondary hover:text-accent transition-colors rounded-lg hover:bg-[rgba(91,46,145,0.06)]"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Menu panel */}
          <div className="absolute right-4 top-4 w-64 bg-surface-solid rounded-2xl p-5 shadow-xl border border-border-subtle">
            <div className="flex items-center justify-between mb-6">
              <Image
                src="/logo.svg"
                alt="Loupe"
                width={72}
                height={23}
                className="h-5 w-auto"
              />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 text-text-muted hover:text-text-primary transition-colors rounded-lg hover:bg-[rgba(0,0,0,0.04)]"
                aria-label="Close menu"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <nav className="flex flex-col gap-1">
              <Link
                href="/"
                className={`text-base font-medium px-3 py-2 rounded-lg transition-colors ${
                  isActive("/")
                    ? "text-accent bg-[rgba(91,46,145,0.06)]"
                    : "text-text-secondary hover:text-accent hover:bg-[rgba(91,46,145,0.06)]"
                }`}
              >
                Home
              </Link>
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  className={`text-base font-medium px-3 py-2 rounded-lg transition-colors ${
                    isActive("/dashboard")
                      ? "text-accent bg-[rgba(91,46,145,0.06)]"
                      : "text-text-secondary hover:text-accent hover:bg-[rgba(91,46,145,0.06)]"
                  }`}
                >
                  Your pages
                </Link>
              )}
              <Link
                href="/leaderboard"
                className={`text-base font-medium px-3 py-2 rounded-lg transition-colors ${
                  isActive("/leaderboard")
                    ? "text-accent bg-[rgba(91,46,145,0.06)]"
                    : "text-text-secondary hover:text-accent hover:bg-[rgba(91,46,145,0.06)]"
                }`}
              >
                Leaderboard
              </Link>
              {isAuthenticated ? (
                <Link
                  href="/settings/integrations"
                  className={`text-base font-medium px-3 py-2 rounded-lg transition-colors ${
                    isActive("/settings/integrations")
                      ? "text-accent bg-[rgba(91,46,145,0.06)]"
                      : "text-text-secondary hover:text-accent hover:bg-[rgba(91,46,145,0.06)]"
                  }`}
                >
                  Settings
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="text-base font-medium px-3 py-2 rounded-lg text-accent bg-[rgba(91,46,145,0.06)] mt-2"
                >
                  Sign in
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
