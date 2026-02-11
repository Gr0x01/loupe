/**
 * One-time backfill: push all existing user profiles to PostHog.
 * DELETE THIS ROUTE after running it once.
 *
 * Usage: GET /api/dev/backfill-posthog
 */

import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { identifyUser, flushEvents } from "@/lib/posthog-server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    // Safety: require a secret to run in production
    // Hit it with: /api/dev/backfill-posthog?secret=YOUR_SUPABASE_SERVICE_ROLE_KEY
    // Or remove this check and just run it once
  }

  const supabase = createServiceClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, subscription_tier, subscription_status, is_founding_50, billing_period, bonus_pages, created_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!profiles || profiles.length === 0) {
    return NextResponse.json({ message: "No profiles found", count: 0 });
  }

  // Count pages per user
  const { data: pageCounts } = await supabase
    .from("pages")
    .select("user_id");

  const pageCountMap: Record<string, number> = {};
  if (pageCounts) {
    for (const row of pageCounts) {
      pageCountMap[row.user_id] = (pageCountMap[row.user_id] || 0) + 1;
    }
  }

  let identified = 0;

  for (const profile of profiles) {
    identifyUser(profile.id, {
      email: profile.email,
      subscription_tier: profile.subscription_tier || "free",
      subscription_status: profile.subscription_status || null,
      is_founding_50: profile.is_founding_50 || false,
      billing_period: profile.billing_period || null,
      pages_count: pageCountMap[profile.id] || 0,
      created_at: profile.created_at,
    });
    identified++;
  }

  await flushEvents();

  return NextResponse.json({
    message: `Backfilled ${identified} users to PostHog`,
    count: identified,
  });
}
