import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { FOUNDING_50_CAP } from "@/lib/constants";
import type { EmailOtpType } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function checkFoundingCapAndRedirect(
  redirectTo: URL,
  userId: string
): Promise<URL | null> {
  const supabase = createServiceClient();

  // Check if user is already a founding member
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_founding_50")
    .eq("id", userId)
    .single();

  // Log unexpected errors (PGRST116 = no rows, which is expected for new users)
  if (profileError && profileError.code !== "PGRST116") {
    console.error("Failed to fetch profile in cap check:", profileError);
  }

  // If already a founding member, no need to check cap
  if (profile?.is_founding_50) {
    return null;
  }

  // Count founding members
  const { count: founderCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("is_founding_50", true);

  // If cap is reached and user is not a founder, redirect to waitlist
  if ((founderCount ?? 0) >= FOUNDING_50_CAP) {
    redirectTo.pathname = "/waitlist";
    return redirectTo;
  }

  return null;
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

  // Check page limit (Founding 50 = 1 page + bonus_pages)
  const { data: profile } = await supabase
    .from("profiles")
    .select("bonus_pages")
    .eq("id", userId)
    .single();

  const { count: pageCount } = await supabase
    .from("pages")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId);

  const maxPages = 1 + (profile?.bonus_pages ?? 0);
  if ((pageCount ?? 0) >= maxPages) {
    // At page limit — go to dashboard where they can see share-to-unlock
    redirectTo.pathname = "/dashboard";
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

  // OAuth flow — exchange code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Check founding 50 cap — redirect to waitlist if full and not a founder
        const waitlistRedirect = await checkFoundingCapAndRedirect(redirectTo, user.id);
        if (waitlistRedirect) {
          return NextResponse.redirect(waitlistRedirect);
        }

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
        // Check founding 50 cap — redirect to waitlist if full and not a founder
        const waitlistRedirect = await checkFoundingCapAndRedirect(redirectTo, user.id);
        if (waitlistRedirect) {
          return NextResponse.redirect(waitlistRedirect);
        }

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
      }
      return NextResponse.redirect(redirectTo);
    }
    console.error("Magic link verification failed:", error.message);
  }

  // Something went wrong
  redirectTo.pathname = "/auth/error";
  return NextResponse.redirect(redirectTo);
}
