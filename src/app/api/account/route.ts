import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import * as Sentry from "@sentry/nextjs";

/**
 * DELETE /api/account
 * Permanently delete the authenticated user's account and all associated data.
 */
export async function DELETE() {
  let userId: string | undefined;

  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    userId = user.id;
    const supabase = createServiceClient();

    // 1. Fetch profile for Stripe IDs
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id")
      .eq("id", userId)
      .single();

    // 2. Cancel Stripe subscription + delete customer (best-effort)
    if (profile?.stripe_subscription_id) {
      try {
        await getStripe().subscriptions.cancel(profile.stripe_subscription_id);
      } catch (e) {
        console.error("Failed to cancel Stripe subscription:", e);
      }
    }
    if (profile?.stripe_customer_id) {
      try {
        await getStripe().customers.del(profile.stripe_customer_id);
      } catch (e) {
        console.error("Failed to delete Stripe customer:", e);
      }
    }

    // 3. Get user's page IDs and repo IDs for cascading deletes
    const { data: pages } = await supabase
      .from("pages")
      .select("id")
      .eq("user_id", userId);
    const pageIds = (pages || []).map((p) => p.id);

    const { data: repos } = await supabase
      .from("repos")
      .select("id")
      .eq("user_id", userId);
    const repoIds = (repos || []).map((r) => r.id);

    // 4. Delete in FK-safe order (leaf tables first)
    // Abort if any step fails to prevent half-deleted accounts
    const del = async (table: string, column: string, value: string | string[]) => {
      const query = Array.isArray(value)
        ? supabase.from(table).delete().in(column, value)
        : supabase.from(table).delete().eq(column, value);
      const { error } = await query;
      if (error) {
        console.error(`Failed to delete from ${table}:`, error);
        throw new Error(`Deletion failed at ${table}: ${error.message}`);
      }
    };

    await del("analytics_snapshots", "user_id", userId);
    await del("outcome_feedback", "user_id", userId);
    await del("finding_feedback", "user_id", userId);
    await del("detected_changes", "user_id", userId);

    // Break circular FK: pages -> analyses
    if (pageIds.length > 0) {
      const { error: nullErr } = await supabase
        .from("pages")
        .update({ last_scan_id: null, stable_baseline_id: null })
        .in("id", pageIds);
      if (nullErr) {
        console.error("Failed to nullify page FKs:", nullErr);
        throw new Error(`Deletion failed at pages FK nullify: ${nullErr.message}`);
      }
    }

    // Delete stored screenshots (best-effort, before analyses rows are removed)
    const { data: userAnalyses } = await supabase
      .from("analyses")
      .select("id")
      .eq("user_id", userId);
    if (userAnalyses?.length) {
      const storagePaths = userAnalyses.flatMap((a) => [
        `analyses/${a.id}.jpg`,
        `analyses/${a.id}_mobile.jpg`,
      ]);
      for (let i = 0; i < storagePaths.length; i += 100) {
        const batch = storagePaths.slice(i, i + 100);
        await supabase.storage.from("screenshots").remove(batch);
      }
    }

    await del("analyses", "user_id", userId);

    if (repoIds.length > 0) {
      await del("deploys", "repo_id", repoIds);
    }

    await del("repos", "user_id", userId);
    await del("integrations", "user_id", userId);
    await del("pages", "user_id", userId);
    await del("profiles", "id", userId);

    // 5. Delete Supabase auth user
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("Failed to delete auth user:", authError);
      Sentry.captureException(new Error(`Auth user deletion failed for ${userId}: ${authError.message}`));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    Sentry.withScope((scope) => {
      scope.setTag("operation", "account_deletion");
      if (userId) scope.setUser({ id: userId });
      Sentry.captureException(error);
    });
    await Sentry.flush(2000);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
