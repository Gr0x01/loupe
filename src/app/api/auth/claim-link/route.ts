import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { claimPageEmail } from "@/lib/email/templates";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { getEffectiveTier, getPageLimit, getAllowedScanFrequency, TRIAL_DURATION_DAYS } from "@/lib/permissions";
import type { SubscriptionTier, SubscriptionStatus } from "@/lib/permissions";
import { captureEvent, identifyUser, flushEvents } from "@/lib/posthog-server";
import { Resend } from "resend";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    // Rate limit by IP (unauthenticated endpoint)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = checkRateLimit(`ip:${ip}:claim-link`, RATE_LIMITS.claimLink);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { email, analysisId } = await req.json();

    // Validate email (with length check)
    if (!email || typeof email !== "string" || email.length > 254 || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
    }

    // Validate analysisId
    if (!analysisId || typeof analysisId !== "string" || !UUID_RE.test(analysisId)) {
      return NextResponse.json({ error: "Valid analysis ID is required" }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      console.error("NEXT_PUBLIC_APP_URL is not configured");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const supabase = createServiceClient();

    // ── Fetch & validate analysis ───────────────────────────
    const { data: analysis } = await supabase
      .from("analyses")
      .select("id, url, status")
      .eq("id", analysisId)
      .single();

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    let domain: string;
    try {
      domain = new URL(analysis.url).hostname.replace(/^www\./, "");
    } catch {
      domain = analysis.url;
    }

    // ── Find or create user ─────────────────────────────────
    let userId: string;
    let isNewUser = false;

    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: cleanEmail,
        email_confirm: true,
      });

      if (createError) {
        if (createError.message?.includes("already been registered")) {
          // User exists in auth.users but not profiles (partial failure recovery)
          // Paginate through listUsers to find by email (SDK has no getUserByEmail)
          let found: string | null = null;
          for (let page = 1; page <= 10; page++) {
            const { data: { users } } = await supabase.auth.admin.listUsers({ page, perPage: 50 });
            const match = users?.find(u => u.email === cleanEmail);
            if (match) { found = match.id; break; }
            if (!users || users.length < 50) break; // last page
          }
          if (found) {
            userId = found;
          } else {
            console.error("User reportedly exists but not found:", cleanEmail);
            return NextResponse.json({ error: "Account error" }, { status: 500 });
          }
        } else {
          console.error("Failed to create user:", createError);
          return NextResponse.json({ error: "Failed to create account" }, { status: 500 });
        }
      } else {
        userId = newUser.user!.id;
        isNewUser = true;

        // Set 14-day Pro trial
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + TRIAL_DURATION_DAYS);
        await supabase
          .from("profiles")
          .update({ trial_ends_at: trialEnd.toISOString() })
          .eq("id", userId);
      }
    }

    // ── Check if page already claimed ───────────────────────
    const { data: existingPage } = await supabase
      .from("pages")
      .select("id, user_id")
      .eq("url", analysis.url)
      .maybeSingle();

    if (existingPage) {
      if (existingPage.user_id === userId) {
        // Already claimed by this user — idempotent success, still send sign-in email
      } else {
        return NextResponse.json(
          { error: "This page is already being tracked by another account" },
          { status: 409 }
        );
      }
    }

    // ── Claim the page (if not already owned) ───────────────
    if (!existingPage) {
      // Check page limit
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, trial_ends_at")
        .eq("id", userId)
        .single();

      const rawTier = (profile?.subscription_tier as SubscriptionTier) || "free";
      const status = profile?.subscription_status as SubscriptionStatus | null;
      const tier = getEffectiveTier(rawTier, status, profile?.trial_ends_at);

      const { count: pageCount } = await supabase
        .from("pages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      if ((pageCount ?? 0) >= getPageLimit(tier)) {
        return NextResponse.json(
          { error: "Page limit reached. Upgrade to track more pages.", upgrade: true },
          { status: 403 }
        );
      }

      // Create the page
      const scanFrequency = getAllowedScanFrequency(tier);
      const { error: insertError } = await supabase
        .from("pages")
        .insert({
          user_id: userId,
          url: analysis.url,
          last_scan_id: analysis.status === "complete" ? analysisId : null,
          scan_frequency: scanFrequency,
        });

      // Handle race condition (double-submit)
      if (insertError?.code === "23505") {
        // Page was just created by a parallel request — verify it's ours
        const { data: raceWinner } = await supabase
          .from("pages")
          .select("user_id")
          .eq("url", analysis.url)
          .single();
        if (raceWinner && raceWinner.user_id !== userId) {
          return NextResponse.json(
            { error: "This page is already being tracked by another account" },
            { status: 409 }
          );
        }
      } else if (insertError) {
        console.error("Failed to create page:", insertError);
        return NextResponse.json({ error: "Failed to claim page" }, { status: 500 });
      }

      // Set account domain (first-write-wins)
      await supabase
        .from("profiles")
        .update({ account_domain: domain })
        .eq("id", userId)
        .is("account_domain", null);

      // Claim the analysis (set user_id so it shows as owned)
      await supabase
        .from("analyses")
        .update({ user_id: userId })
        .eq("id", analysisId)
        .is("user_id", null);

      // ── PostHog tracking ────────────────────────────────────
      if (isNewUser) {
        captureEvent(userId, "signup_completed", { method: "instant_claim" });
      }
      captureEvent(userId, "page_claimed", {
        domain,
        url: analysis.url,
        tier,
        page_number: (pageCount ?? 0) + 1,
      });
      captureEvent(userId, "page_tracked", {
        domain,
        is_first_page: (pageCount ?? 0) === 0,
      });
      identifyUser(userId, {
        email: cleanEmail,
        subscription_tier: tier,
        pages_count: (pageCount ?? 0) + 1,
      });
    }

    await flushEvents();

    // ── Send sign-in email ────────────────────────────────────
    const redirectTo = `${appUrl}/auth/callback?claim=${analysisId}`;

    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: cleanEmail,
      options: { redirectTo },
    });

    if (linkError || !linkData?.properties?.action_link) {
      // Page is claimed even if email fails — user can sign in from /login
      console.error("Failed to generate magic link:", linkError?.message);
      return NextResponse.json({ success: true, emailSent: false });
    }

    const magicLink = linkData.properties.action_link;
    const { subject, html } = claimPageEmail({ domain, magicLink });
    const { error: emailError } = await resend.emails.send({
      from: "Loupe <notifications@getloupe.io>",
      to: cleanEmail,
      subject,
      html,
    });

    if (emailError) {
      console.error("Failed to send claim email:", emailError);
      return NextResponse.json({ success: true, emailSent: false });
    }

    return NextResponse.json({ success: true, emailSent: true });
  } catch (err) {
    console.error("Claim link route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
