import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import {
  TRIAL_DURATION_DAYS,
  getEffectiveTier,
  getPageLimit,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/permissions";
import type { EmailOtpType } from "@supabase/supabase-js";
import { captureEvent, identifyUser, flushEvents } from "@/lib/posthog-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PERSONAL_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "pm.me",
  "hey.com",
  "yandex.com",
  "zoho.com",
]);

function getSafeNextPath(nextPath: string | null): string | null {
  if (!nextPath) return null;
  if (!nextPath.startsWith("/") || nextPath.startsWith("//")) return null;
  if (nextPath.startsWith("/auth/callback")) return null;
  return nextPath;
}

function getSuggestedDomainFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const parts = email.trim().toLowerCase().split("@");
  if (parts.length !== 2) return null;
  const domain = parts[1].replace(/^www\./, "");
  if (!domain || !domain.includes(".")) return null;
  if (PERSONAL_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}

function applyDefaultRedirect(
  redirectTo: URL,
  nextPath: string | null,
  email?: string | null
): void {
  if (nextPath) {
    const parsed = new URL(nextPath, redirectTo.origin);
    redirectTo.pathname = parsed.pathname;
    redirectTo.search = parsed.search;
    return;
  }

  redirectTo.pathname = "/dashboard";

  const suggestedDomain = getSuggestedDomainFromEmail(email);
  if (suggestedDomain) {
    redirectTo.searchParams.set("suggest_domain", suggestedDomain);
  }
}

async function handleRescan(
  redirectTo: URL,
  rescanId: string,
  userId: string
): Promise<URL> {
  if (!UUID_RE.test(rescanId)) return redirectTo;

  const supabase = createServiceClient();

  // Validate the parent analysis exists and is complete
  const { data: parent } = await supabase
    .from("analyses")
    .select("id, url, status")
    .eq("id", rescanId)
    .eq("status", "complete")
    .single();

  if (!parent) return redirectTo;

  // Idempotency: if a pending/processing re-scan already exists, redirect to it
  const { data: existing } = await supabase
    .from("analyses")
    .select("id")
    .eq("parent_analysis_id", rescanId)
    .eq("user_id", userId)
    .in("status", ["pending", "processing"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    redirectTo.pathname = `/analysis/${existing.id}`;
    return redirectTo;
  }

  // Create re-scan analysis
  const { data: newAnalysis } = await supabase
    .from("analyses")
    .insert({
      url: parent.url,
      user_id: userId,
      parent_analysis_id: rescanId,
      status: "pending",
    })
    .select("id")
    .single();

  if (!newAnalysis) return redirectTo;

  await inngest.send({
    name: "analysis/created",
    data: {
      analysisId: newAnalysis.id,
      url: parent.url,
      parentAnalysisId: rescanId,
    },
  });

  redirectTo.pathname = `/analysis/${newAnalysis.id}`;
  return redirectTo;
}

/**
 * Handle ?claim= redirect after magic link click.
 * Page creation now happens in /api/auth/claim-link — this just redirects
 * to the existing page, or falls back to dashboard.
 */
async function handleClaim(
  redirectTo: URL,
  analysisId: string,
  userId: string
): Promise<URL> {
  if (!UUID_RE.test(analysisId)) return redirectTo;

  const supabase = createServiceClient();

  // Find the analysis to get its URL
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, url")
    .eq("id", analysisId)
    .single();

  if (!analysis) {
    redirectTo.pathname = "/dashboard";
    return redirectTo;
  }

  // Look up the page (should already exist from claim-link route)
  const { data: page } = await supabase
    .from("pages")
    .select("id, user_id")
    .eq("url", analysis.url)
    .maybeSingle();

  if (page && page.user_id === userId) {
    redirectTo.pathname = `/pages/${page.id}`;
  } else if (page) {
    // Claimed by someone else
    redirectTo.pathname = `/analysis/${analysisId}`;
    redirectTo.searchParams.set("already_claimed", "true");
  } else {
    // Page wasn't created yet (edge case) — send to dashboard
    redirectTo.pathname = "/dashboard";
  }

  return redirectTo;
}

/**
 * If user has 0 pages and there's an unclaimed analysis matching their email,
 * auto-claim the most recent one. Creates the page directly.
 * Handles Google OAuth / separate magic link signups where no ?claim= param is present.
 */
async function handleEmailAutoClaim(
  redirectTo: URL,
  userId: string,
  email: string | undefined
): Promise<boolean> {
  if (!email) return false;

  const supabase = createServiceClient();

  // Only for users with no pages yet
  const { count: pageCount } = await supabase
    .from("pages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  if ((pageCount ?? 0) > 0) return false;

  // Find most recent unclaimed analysis matching this email
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, url")
    .eq("email", email.toLowerCase())
    .is("user_id", null)
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!analysis) return false;

  // Check URL isn't already claimed by someone else
  const { data: existingPage } = await supabase
    .from("pages")
    .select("id, user_id")
    .eq("url", analysis.url)
    .maybeSingle();

  if (existingPage) {
    // Already claimed — don't interfere
    return false;
  }

  // Check page limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status, trial_ends_at")
    .eq("id", userId)
    .single();

  const rawTier = (profile?.subscription_tier as SubscriptionTier) || "free";
  const status = profile?.subscription_status as SubscriptionStatus | null;
  const tier = getEffectiveTier(rawTier, status, profile?.trial_ends_at);

  if ((pageCount ?? 0) >= getPageLimit(tier)) return false;

  // Create the page
  const { data: newPage, error: insertError } = await supabase
    .from("pages")
    .insert({
      user_id: userId,
      url: analysis.url,
      last_scan_id: analysis.id,
      scan_frequency: "daily",
    })
    .select("id")
    .single();

  if (insertError?.code === "23505") {
    // Race condition — page was just created
    const { data: racePage } = await supabase
      .from("pages")
      .select("id")
      .eq("url", analysis.url)
      .eq("user_id", userId)
      .maybeSingle();
    if (racePage) {
      redirectTo.pathname = `/pages/${racePage.id}`;
      return true;
    }
    return false;
  }

  if (!newPage) return false;

  // Claim the analysis
  await supabase
    .from("analyses")
    .update({ user_id: userId })
    .eq("id", analysis.id)
    .is("user_id", null);

  // Set account domain (first-write-wins)
  let domain = "";
  try {
    domain = new URL(analysis.url).hostname.replace(/^www\./, "");
    await supabase
      .from("profiles")
      .update({ account_domain: domain })
      .eq("id", userId)
      .is("account_domain", null);
  } catch { /* URL parse failure — non-fatal */ }

  // PostHog tracking — auto-claim should fire the same events as manual claim
  captureEvent(userId, "page_claimed", {
    domain,
    url: analysis.url,
    tier,
    page_number: 1,
    method: "auto_claim",
  });
  captureEvent(userId, "page_tracked", {
    domain,
    is_first_page: true,
  });
  await flushEvents();

  redirectTo.pathname = `/pages/${newPage.id}`;
  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rescanId = searchParams.get("rescan");
  const claimId = searchParams.get("claim");
  const nextPath = getSafeNextPath(searchParams.get("next"));

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/";
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("rescan");
  redirectTo.searchParams.delete("claim");
  redirectTo.searchParams.delete("next");

  const supabase = await createClient();

  // Internal emails for PostHog test account filtering
  const INTERNAL_EMAILS = new Set(["rbaten@gmail.com", "gr0x01@pm.me", "team@getloupe.io", "team@aboo.st"]);

  // Helper: identify user in PostHog after successful auth
  async function identifyAuthenticatedUser(user: { id: string; email?: string; created_at: string }) {
    // Fetch profile for tier info
    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_tier, subscription_status, trial_ends_at")
      .eq("id", user.id)
      .single();

    // New user = never had a trial set (claim-link sets it on creation, callback sets it here)
    const isNewUser = profile ? !profile.trial_ends_at : false;

    // Set 14-day Pro trial for new users
    if (profile && !profile.trial_ends_at) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
      await serviceClient
        .from("profiles")
        .update({ trial_ends_at: trialEnd.toISOString() })
        .eq("id", user.id);
    }

    identifyUser(user.id, {
      email: user.email,
      subscription_tier: profile?.subscription_tier || "free",
      subscription_status: profile?.subscription_status || null,
      is_internal: user.email ? INTERNAL_EMAILS.has(user.email) : false,
    });

    if (isNewUser) {
      captureEvent(user.id, "signup_completed", {
        method: claimId ? "instant_claim" : (code ? "google" : "magic_link"),
      });
    } else {
      captureEvent(user.id, "user_logged_in", {
        method: code ? "google" : "magic_link",
      });
    }

    await flushEvents();
  }

  // OAuth flow — exchange code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await identifyAuthenticatedUser(user);

        // Handle claim flow (registers page)
        if (claimId) {
          const dest = await handleClaim(redirectTo, claimId, user.id);
          return NextResponse.redirect(dest);
        }

        // Handle rescan flow (creates re-scan analysis)
        if (rescanId) {
          const dest = await handleRescan(redirectTo, rescanId, user.id);
          return NextResponse.redirect(dest);
        }

        // Auto-claim: match unclaimed analysis by email
        if (await handleEmailAutoClaim(redirectTo, user.id, user.email)) {
          return NextResponse.redirect(redirectTo);
        }

        // Default: return to requested path, otherwise dashboard.
        applyDefaultRedirect(redirectTo, nextPath, user.email);
      }
      return NextResponse.redirect(redirectTo);
    }
    console.error("OAuth code exchange failed:", error.message);
  }

  // Magic link flow — verify OTP token hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await identifyAuthenticatedUser(user);

        // Handle claim flow (registers page)
        if (claimId) {
          const dest = await handleClaim(redirectTo, claimId, user.id);
          return NextResponse.redirect(dest);
        }

        // Handle rescan flow (creates re-scan analysis)
        if (rescanId) {
          const dest = await handleRescan(redirectTo, rescanId, user.id);
          return NextResponse.redirect(dest);
        }

        // Auto-claim: match unclaimed analysis by email
        if (await handleEmailAutoClaim(redirectTo, user.id, user.email)) {
          return NextResponse.redirect(redirectTo);
        }

        // Default: return to requested path, otherwise dashboard.
        applyDefaultRedirect(redirectTo, nextPath, user.email);
      }
      return NextResponse.redirect(redirectTo);
    }
    console.error("Magic link verification failed:", error.message);
  }

  // Something went wrong
  redirectTo.pathname = "/auth/error";
  return NextResponse.redirect(redirectTo);
}
