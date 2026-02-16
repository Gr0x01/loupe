import * as Sentry from "@sentry/nextjs";
import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { captureScreenshot, uploadScreenshot } from "@/lib/screenshot";
import { runQuickDiff, validateMatchProposal } from "@/lib/ai/pipeline";
import { sendEmail } from "@/lib/email/resend";
import { changeDetectedEmail } from "@/lib/email/templates";
import { couldAffectPage } from "@/lib/utils/deploy-filter";
import { getStableBaseline, isBaselineStale } from "@/lib/analysis/baseline";
import { canUseDeployScans, canAccessMobile, getEffectiveTier, getPageLimit, type SubscriptionTier, type SubscriptionStatus } from "@/lib/permissions";

/**
 * Deploy detected — triggered by GitHub webhook on push to main
 *
 * NEW BEHAVIOR (lightweight detection):
 * 1. Wait 45s for Vercel deploy
 * 2. For each page: get baseline, check staleness
 * 3. If stale/missing baseline → run full analysis (establishes baseline)
 * 4. Otherwise → quick Haiku diff against baseline
 * 5. If changes detected → create detected_changes record, send "watching" notification
 * 6. No full analysis on every deploy (saves ~$0.05/page/deploy)
 */
export const deployDetected = inngest.createFunction(
  {
    id: "deploy-detected",
    retries: 2,
  },
  { event: "deploy/detected" },
  async ({ event, step }) => {
    const { deployId, userId } = event.data as {
      deployId: string;
      repoId: string;
      userId: string;
      commitSha: string;
      fullName: string;
    };

    const supabase = createServiceClient();

    // Check user's effective tier (considering trial + subscription status)
    const userTier = await step.run("check-tier", async () => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("subscription_tier, subscription_status, trial_ends_at")
        .eq("id", userId)
        .single();

      return getEffectiveTier(
        (profile?.subscription_tier as SubscriptionTier) || "free",
        profile?.subscription_status as SubscriptionStatus | null,
        profile?.trial_ends_at
      );
    });

    if (!canUseDeployScans(userTier)) {
      // Mark deploy as complete but skip scanning
      await supabase
        .from("deploys")
        .update({ status: "complete" })
        .eq("id", deployId);

      return {
        scanned: 0,
        message: "Deploy scans not available on free tier",
      };
    }

    // Wait for Vercel to deploy (simple fixed delay for MVP)
    await step.sleep("wait-for-vercel", "45s");

    // Update deploy status
    await step.run("mark-scanning", async () => {
      await supabase
        .from("deploys")
        .update({ status: "scanning" })
        .eq("id", deployId);
    });

    // Find pages for this user, enforcing page limit (oldest N by created_at)
    const pages = await step.run("find-pages", async () => {
      const { data } = await supabase
        .from("pages")
        .select("id, url, last_scan_id, stable_baseline_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      const allPages = data || [];
      const limit = getPageLimit(userTier);
      return allPages.slice(0, limit);
    });

    // Fetch deploy's changed_files to filter pages
    const deploy = await step.run("fetch-deploy", async () => {
      const { data } = await supabase
        .from("deploys")
        .select("changed_files")
        .eq("id", deployId)
        .single();
      return data;
    });

    // Filter pages to only those affected by the deploy's changed files
    const changedFiles: string[] = deploy?.changed_files || [];
    const filteredPages = changedFiles.length > 0
      ? pages.filter((p) => couldAffectPage(changedFiles, p.url))
      : pages;

    if (filteredPages.length === 0) {
      await step.run("mark-complete-no-affected", async () => {
        await supabase
          .from("deploys")
          .update({ status: "complete" })
          .eq("id", deployId);
      });

      console.log(`Deploy ${deployId}: 0 of ${pages.length} pages affected by changed files`);
      return { scanned: 0, message: `No pages affected by deploy (${pages.length} pages, ${changedFiles.length} changed files)` };
    }

    console.log(`Deploy ${deployId}: Scanning ${filteredPages.length} of ${pages.length} pages`);

    // Process each page
    const results = await step.run("detect-changes", async () => {
      const processed: { pageId: string; hadChanges: boolean; usedFullAnalysis: boolean; error?: string }[] = [];

      for (const page of filteredPages) {
        try {
          // 1. Get stable baseline
          const baseline = await getStableBaseline(supabase, page.id);

          // 2. Staleness check: if no baseline or >14 days old, run full analysis
          if (isBaselineStale(baseline)) {
            // Fall back to full analysis to establish baseline
            const { data: newAnalysis } = await supabase
              .from("analyses")
              .insert({
                url: page.url,
                user_id: userId,
                parent_analysis_id: page.last_scan_id,
                deploy_id: deployId,
                trigger_type: "deploy",
                status: "pending",
              })
              .select("id")
              .single();

            if (newAnalysis) {
              // Trigger full analysis
              await inngest.send({
                name: "analysis/created",
                data: {
                  analysisId: newAnalysis.id,
                  url: page.url,
                  parentAnalysisId: page.last_scan_id || undefined,
                },
              });
            }

            processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: true });
            continue;
          }

          // At this point, baseline is guaranteed non-null (stale check passed)
          if (!baseline) {
            // TypeScript guard - should never reach here
            processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: false });
            continue;
          }

          // 3. Screenshot current page (desktop + mobile if Pro and baseline has mobile)
          const deployCanMobile = canAccessMobile(userTier) && !!baseline.mobile_screenshot_url;
          const [desktopResult, mobileResult] = await Promise.all([
            captureScreenshot(page.url),
            deployCanMobile
              ? captureScreenshot(page.url, { width: 390 }).catch((err) => {
                  console.warn(`Mobile screenshot failed for ${page.url}:`, err);
                  return null;
                })
              : Promise.resolve(null),
          ]);
          const currentScreenshot = desktopResult.base64;
          const currentMobileScreenshot = mobileResult?.base64 ?? null;

          // 4. Fetch watching candidates for fingerprint matching
          const { data: watchingForPage } = await supabase
            .from("detected_changes")
            .select("id, element, before_value, after_value, scope, first_detected_at")
            .eq("page_id", page.id)
            .eq("status", "watching")
            .limit(20);

          // 5. Quick Haiku diff against baseline (with mobile if both exist)
          const diffResult = await runQuickDiff(
            baseline.screenshot_url,
            currentScreenshot,
            baseline.mobile_screenshot_url,
            currentMobileScreenshot,
            watchingForPage as import("@/lib/ai/pipeline").PendingChange[] | null
          );

          if (!diffResult.hasChanges || diffResult.changes.length === 0) {
            // No changes detected
            processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: false });
            continue;
          }

          // 6. Record detected changes with fingerprint-aware upsert
          const candidateIds = new Set((watchingForPage ?? []).map((c) => c.id));
          const candidateScopes = new Map((watchingForPage ?? []).map((c) => [c.id, c.scope as "element" | "section" | "page"]));

          for (const change of diffResult.changes) {
            try {
              const proposal = validateMatchProposal(change, candidateIds, candidateScopes);

              if (proposal.accepted && proposal.matched_change_id) {
                // Update existing watching row
                await supabase
                  .from("detected_changes")
                  .update({
                    after_value: change.after,
                    description: change.description || null,
                    match_confidence: proposal.match_confidence,
                    match_rationale: proposal.match_rationale,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", proposal.matched_change_id)
                  .eq("user_id", userId)
                  .eq("status", "watching");
              } else {
                // Insert new row with proposal metadata
                await supabase.from("detected_changes").insert({
                  page_id: page.id,
                  user_id: userId,
                  element: change.element,
                  scope: change.scope,
                  before_value: change.before,
                  after_value: change.after,
                  description: change.description || null,
                  deploy_id: deployId,
                  status: "watching",
                  first_detected_at: new Date().toISOString(),
                  match_confidence: proposal.match_confidence ?? null,
                  match_rationale: proposal.match_rationale || null,
                });
              }
            } catch (insertErr) {
              // Unique constraint violation = already recorded today, skip
              if (!(insertErr instanceof Error && insertErr.message.includes("duplicate"))) {
                console.error("Failed to upsert detected_change:", insertErr);
              }
            }
          }

          // 6. Send "watching" notification
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, email_notifications")
            .eq("id", userId)
            .single();

          if (profile?.email && profile.email_notifications) {
            // Capture first inserted change ID for hypothesis link
            let firstChangeId: string | undefined;
            {
              const { data: recentChange } = await supabase
                .from("detected_changes")
                .select("id")
                .eq("page_id", page.id)
                .eq("deploy_id", deployId)
                .order("created_at", { ascending: false })
                .limit(1)
                .maybeSingle();
              firstChangeId = recentChange?.id;
            }

            // Send a lightweight "watching" email
            const primaryChange = diffResult.changes[0];
            const { subject, html } = changeDetectedEmail({
              pageUrl: page.url,
              analysisId: baseline.id, // Link to baseline for context
              triggerType: "deploy",
              primaryChange: {
                element: primaryChange.element,
                before: primaryChange.before,
                after: primaryChange.after,
              },
              additionalChangesCount: diffResult.changes.length - 1,
              correlation: {
                hasEnoughData: false, // Always watching for deploy
              },
              hypothesisChangeId: firstChangeId,
            });
            sendEmail({ to: profile.email, subject, html }).catch(console.error);
          }

          processed.push({ pageId: page.id, hadChanges: true, usedFullAnalysis: false });
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          Sentry.withScope((scope) => {
            scope.setUser({ id: userId });
            scope.setTag("function", "deployDetected");
            scope.setTag("pageId", page.id);
            Sentry.captureException(err, { extra: { url: page.url, deployId } });
          });
          console.error(`Deploy detection failed for page ${page.id} (${page.url}):`, errMsg);
          processed.push({ pageId: page.id, hadChanges: false, usedFullAnalysis: false, error: errMsg });
        }
      }

      return processed;
    });

    // Mark deploy complete (with scan results for debugging)
    await step.run("mark-complete", async () => {
      const errors = results.filter((r) => r.error);
      const updateData: Record<string, unknown> = { status: "complete" };
      if (errors.length > 0 || results.length > 0) {
        updateData.scan_results = results;
      }
      await supabase
        .from("deploys")
        .update(updateData)
        .eq("id", deployId);
    });

    const changesDetected = results.filter((r) => r.hadChanges).length;
    const fullAnalysisRun = results.filter((r) => r.usedFullAnalysis).length;
    const errors = results.filter((r) => r.error).map((r) => ({ pageId: r.pageId, error: r.error }));

    return {
      scanned: results.length,
      changesDetected,
      fullAnalysisRun,
      errors: errors.length > 0 ? errors : undefined,
      deployId,
    };
  }
);
