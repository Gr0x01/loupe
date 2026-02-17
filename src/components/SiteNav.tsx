"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { identify, reset, setPersonProperties } from "@/lib/analytics/track";

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
    // Identify user in PostHog with full profile properties
    // NOTE: is_internal is set server-side in auth callback (not exposed in client bundle)
    const identifyWithProfile = async (userId: string, email?: string) => {
      // Identify immediately with email so events are attributed
      identify(userId, { email });
      // Then enrich with profile data
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const profile = await res.json();
          setPersonProperties({
            subscription_tier: profile.subscription_tier || "free",
            subscription_status: profile.subscription_status || null,
            billing_period: profile.billing_period || null,
          });
        }
      } catch {
        // Analytics should never break the app
      }
    };

    // Check auth state and identify user if logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setIsAuthenticated(!!user);
      setAuthChecked(true);
      if (user) {
        identifyWithProfile(user.id, user.email);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user);

      if (event === "SIGNED_IN" && session?.user) {
        identifyWithProfile(session.user.id, session.user.email);
        // signup_completed is tracked server-side in auth callback (more reliable)
      } else if (event === "SIGNED_OUT") {
        reset();
      }
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
      // Check for settings paths - the nav link is "/settings/integrations" but
      // we want it active for any /settings/* path
      const settingsPath = "/settings/integrations";
      const activeLink = linksRef.current.get(pathname) ||
        (pathname.startsWith("/settings") ? linksRef.current.get(settingsPath) : null);
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
  const isSettingsActive = pathname.startsWith("/settings");
  const loginHref =
    pathname && pathname !== "/login" && !pathname.startsWith("/auth/")
      ? `/login?redirect=${encodeURIComponent(pathname)}`
      : "/login";

  return (
    <header className="site-nav fixed top-0 left-0 right-0 z-50">
      <div className="max-w-3xl mx-auto px-4">
        <div className="site-nav-inner">
          {/* Logo */}
          <Link href="/" className="site-nav-logo group">
            <Image
              src="/logo.svg"
              alt="Loupe"
              width={56}
              height={18}
              className="h-[18px] w-auto"
              priority
            />
            <span className="beta-badge">Beta</span>
          </Link>

          {/* Desktop nav with sliding underline */}
          <nav ref={navRef} className="hidden md:flex items-center gap-2 relative h-full">
            <Link
              ref={(el) => setLinkRef("/pricing", el)}
              href="/pricing"
              className={`nav-link ${isActive("/pricing") ? "nav-link-active" : ""}`}
            >
              Pricing
            </Link>
            {isAuthenticated && (
              <Link
                ref={(el) => setLinkRef("/dashboard", el)}
                href="/dashboard"
                className={`nav-link ${isActive("/dashboard") ? "nav-link-active" : ""}`}
              >
                Your pages
              </Link>
            )}
            {isAuthenticated ? (
              <Link
                ref={(el) => setLinkRef("/settings/integrations", el)}
                href="/settings/integrations"
                className={`nav-link ${isSettingsActive ? "nav-link-active" : ""}`}
              >
                Settings
              </Link>
            ) : (
              <Link
                ref={(el) => setLinkRef("/login", el)}
                href={loginHref}
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
            className="md:hidden p-2 -mr-2 text-text-secondary hover:text-accent transition-colors rounded-lg hover:bg-[var(--coral-subtle)]"
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
              <div className="flex items-center gap-2">
                <Image
                  src="/logo.svg"
                  alt="Loupe"
                  width={72}
                  height={23}
                  className="h-5 w-auto"
                />
                <span className="beta-badge">Beta</span>
              </div>
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
                    ? "text-accent bg-[var(--coral-subtle)]"
                    : "text-text-secondary hover:text-accent hover:bg-[var(--coral-subtle)]"
                }`}
              >
                Home
              </Link>
              <Link
                href="/pricing"
                className={`text-base font-medium px-3 py-2 rounded-lg transition-colors ${
                  isActive("/pricing")
                    ? "text-accent bg-[var(--coral-subtle)]"
                    : "text-text-secondary hover:text-accent hover:bg-[var(--coral-subtle)]"
                }`}
              >
                Pricing
              </Link>
              {isAuthenticated && (
                <Link
                  href="/dashboard"
                  className={`text-base font-medium px-3 py-2 rounded-lg transition-colors ${
                    isActive("/dashboard")
                      ? "text-accent bg-[var(--coral-subtle)]"
                      : "text-text-secondary hover:text-accent hover:bg-[var(--coral-subtle)]"
                  }`}
                >
                  Your pages
                </Link>
              )}
              {isAuthenticated ? (
                <Link
                  href="/settings/integrations"
                  className={`text-base font-medium px-3 py-2 rounded-lg transition-colors ${
                    isSettingsActive
                      ? "text-accent bg-[var(--coral-subtle)]"
                      : "text-text-secondary hover:text-accent hover:bg-[var(--coral-subtle)]"
                  }`}
                >
                  Settings
                </Link>
              ) : (
                <Link
                  href={loginHref}
                  className="text-base font-medium px-3 py-2 rounded-lg text-accent bg-[var(--coral-subtle)] mt-2"
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
