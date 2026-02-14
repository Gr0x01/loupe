import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import {
  getPageLimit,
  getEffectiveTier,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/permissions";
import type { EmailOtpType } from "@supabase/supabase-js";
import { captureEvent, identifyUser, flushEvents } from "@/lib/posthog-server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

async function handleClaim(
  redirectTo: URL,
  analysisId: string,
  userId: string
): Promise<URL> {
  if (!UUID_RE.test(analysisId)) return redirectTo;

  const supabase = createServiceClient();

  // Get the analysis to find the URL
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id, url, status")
    .eq("id", analysisId)
    .eq("status", "complete")
    .single();

  if (!analysis) {
    redirectTo.pathname = "/dashboard";
    return redirectTo;
  }

  // Check if this URL is already claimed by ANY user (first-come-first-served)
  const { data: alreadyClaimed } = await supabase
    .from("pages")
    .select("id, user_id")
    .eq("url", analysis.url)
    .limit(1)
    .maybeSingle();

  if (alreadyClaimed && alreadyClaimed.user_id !== userId) {
    // Domain already claimed by someone else
    redirectTo.pathname = `/analysis/${analysisId}`;
    redirectTo.searchParams.set("already_claimed", "true");
    return redirectTo;
  }

  // Check if this URL is already registered by this user
  const { data: existingPage } = await supabase
    .from("pages")
    .select("id")
    .eq("user_id", userId)
    .eq("url", analysis.url)
    .maybeSingle();

  if (existingPage) {
    // Already claimed — go to the page timeline
    redirectTo.pathname = `/pages/${existingPage.id}`;
    return redirectTo;
  }

  // Check page limit using tier-based limits
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, subscription_status")
    .eq("id", userId)
    .single();

  const rawTier = (profile?.subscription_tier as SubscriptionTier) || "free";
  const status = profile?.subscription_status as SubscriptionStatus | null;
  const tier = getEffectiveTier(rawTier, status);

  const { count: pageCount } = await supabase
    .from("pages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const maxPages = getPageLimit(tier);
  if ((pageCount ?? 0) >= maxPages) {
    // At page limit — send to pricing
    redirectTo.pathname = "/pricing";
    return redirectTo;
  }

  // Register the page
  const { data: newPage, error: insertError } = await supabase
    .from("pages")
    .insert({
      user_id: userId,
      url: analysis.url,
      last_scan_id: analysisId,
      scan_frequency: "daily",
    })
    .select("id")
    .single();

  // Handle race condition: if page was just created by another request
  if (insertError?.code === "23505") {
    const { data: justCreatedPage } = await supabase
      .from("pages")
      .select("id")
      .eq("user_id", userId)
      .eq("url", analysis.url)
      .single();

    if (justCreatedPage) {
      redirectTo.pathname = `/pages/${justCreatedPage.id}`;
      return redirectTo;
    }
  }

  // Link the analysis to the page
  if (newPage) {
    await supabase
      .from("analyses")
      .update({ page_id: newPage.id })
      .eq("id", analysisId);

    redirectTo.pathname = `/pages/${newPage.id}`;
  } else {
    redirectTo.pathname = "/dashboard";
  }

  return redirectTo;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rescanId = searchParams.get("rescan");
  const claimId = searchParams.get("claim");

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/";
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("rescan");
  redirectTo.searchParams.delete("claim");

  const supabase = await createClient();

  // Helper: identify user in PostHog after successful auth
  async function identifyAuthenticatedUser(user: { id: string; email?: string; created_at: string }) {
    const isNewUser = Date.now() - new Date(user.created_at).getTime() < 60000;

    // Fetch profile for tier info
    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("subscription_tier, subscription_status")
      .eq("id", user.id)
      .single();

    identifyUser(user.id, {
      email: user.email,
      subscription_tier: profile?.subscription_tier || "free",
      subscription_status: profile?.subscription_status || null,
    });

    if (isNewUser) {
      captureEvent(user.id, "user_signed_up", {
        method: code ? "google" : "magic_link",
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

        // Default: send new/returning users to the dashboard
        redirectTo.pathname = "/dashboard";
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

        // Default: send new/returning users to the dashboard
        redirectTo.pathname = "/dashboard";
      }
      return NextResponse.redirect(redirectTo);
    }
    console.error("Magic link verification failed:", error.message);
  }

  // Something went wrong
  redirectTo.pathname = "/auth/error";
  return NextResponse.redirect(redirectTo);
}
