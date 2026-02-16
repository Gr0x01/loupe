import * as Sentry from "@sentry/nextjs";
import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { pingScreenshotService } from "@/lib/screenshot";
import { createRepoWebhook, deleteRepoWebhook, findExistingWebhook } from "@/lib/github/app";
import { safeDecrypt } from "@/lib/crypto";
import { sendEmail } from "@/lib/email/resend";
import { dailyDigestEmail } from "@/lib/email/templates";
import type { ChangesSummary } from "@/lib/types/analysis";
import { getEffectiveTier, getAllowedScanFrequency, getPageLimit, type SubscriptionTier, type SubscriptionStatus } from "@/lib/permissions";

/**
 * Shared logic for scheduled scans (daily/weekly).
 * Creates analyses and triggers Inngest events for each page.
 *
 * Runtime tier enforcement:
 * - Fetches all non-manual pages (ignores stored scan_frequency column)
 * - Checks each user's effective tier to determine allowed frequency
 * - Daily cron → only Pro/Scale users; Weekly cron → only Free users
 * - Enforces page limits per user: oldest N pages by created_at
 */
async function runScheduledScans(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  step: any,
  frequency: "daily" | "weekly"
): Promise<{ scanned: number }> {
  try {
    const supabase = createServiceClient();

    // Get all non-manual pages
    const { data: allPages, error } = await supabase
      .from("pages")
      .select("id, user_id, url, last_scan_id, created_at, scan_frequency")
      .neq("scan_frequency", "manual");

    if (error) {
      console.error(`Failed to fetch pages for ${frequency} scan:`, error);
      throw error;
    }

    if (!allPages || allPages.length === 0) {
      return { scanned: 0 };
    }

    // Batch-fetch profiles for all distinct user IDs (chunked to avoid Supabase URL-length limits)
    const userIds = [...new Set(allPages.map((p) => p.user_id))];
    const CHUNK_SIZE = 200;
    const tierMap = new Map<string, SubscriptionTier>();

    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + CHUNK_SIZE);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, subscription_tier, subscription_status, trial_ends_at")
        .in("id", chunk);

      if (profilesError) {
        console.error("Failed to fetch profiles for scheduled scans:", profilesError);
        throw profilesError;
      }

      for (const profile of profiles || []) {
        tierMap.set(
          profile.id,
          getEffectiveTier(
            (profile.subscription_tier as SubscriptionTier) || "free",
            profile.subscription_status as SubscriptionStatus | null,
            profile.trial_ends_at
          )
        );
      }
    }

    // Log users with pages but no profile row (shouldn't happen, but observable)
    const missingProfileUsers = userIds.filter((id) => !tierMap.has(id));
    if (missingProfileUsers.length > 0) {
      console.warn(`${frequency} cron: ${missingProfileUsers.length} user(s) have pages but no profile row — skipping their scans`);
    }

    // Filter pages: tier frequency + page-level frequency must both agree
    const frequencyFiltered = allPages.filter((page) => {
      const tier = tierMap.get(page.user_id);
      if (!tier) return false;
      const allowedFreq = getAllowedScanFrequency(tier);

      if (frequency === "daily") {
        // Daily cron: tier must allow daily AND page must not be set to weekly
        return allowedFreq === "daily" && page.scan_frequency !== "weekly";
      }
      // Weekly cron: tier forces weekly, OR paid user explicitly set page to weekly
      return allowedFreq === "weekly" || page.scan_frequency === "weekly";
    });

    // Enforce page limits per user: sort by created_at asc, take first N
    const userPageCounts = new Map<string, number>();
    const pages = frequencyFiltered
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .filter((page) => {
        const tier = tierMap.get(page.user_id)!; // guaranteed by frequencyFiltered
        const limit = getPageLimit(tier);
        const current = userPageCounts.get(page.user_id) || 0;
        if (current >= limit) return false;
        userPageCounts.set(page.user_id, current + 1);
        return true;
      });

    if (pages.length === 0) {
      return { scanned: 0 };
    }

    // Create analyses for each page (with date-based idempotency)
    const results = await step.run(`create-${frequency}-analyses`, async () => {
      const created: { pageId: string; analysisId: string }[] = [];
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);

      for (const page of pages) {
        // Idempotency: skip if a scan already exists for this URL + frequency + today
        const { count } = await supabase
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("url", page.url)
          .eq("user_id", page.user_id)
          .eq("trigger_type", frequency)
          .gte("created_at", todayStart.toISOString());

        if (count && count > 0) {
          console.log(`Skipping duplicate ${frequency} scan for ${page.url} (already exists today)`);
          continue;
        }

        const { data: newAnalysis, error: insertError } = await supabase
          .from("analyses")
          .insert({
            url: page.url,
            user_id: page.user_id,
            parent_analysis_id: page.last_scan_id,
            trigger_type: frequency,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertError || !newAnalysis) {
          console.error(`Failed to create analysis for page ${page.id}:`, insertError);
          continue;
        }

        created.push({ pageId: page.id, analysisId: newAnalysis.id });
      }

      return created;
    });

    // Send Inngest events for each analysis (in separate step for durability)
    await step.run(`trigger-${frequency}-scans`, async () => {
      for (const { analysisId } of results) {
        const { data: analysis } = await supabase
          .from("analyses")
          .select("url, parent_analysis_id")
          .eq("id", analysisId)
          .single();

        if (analysis) {
          await inngest.send({
            name: "analysis/created",
            data: {
              analysisId,
              url: analysis.url,
              parentAnalysisId: analysis.parent_analysis_id || undefined,
            },
          });
        }
      }
    });

    return { scanned: results.length };
  } catch (err) {
    Sentry.withScope((scope) => {
      scope.setTag("function", "runScheduledScans");
      scope.setTag("frequency", frequency);
      Sentry.captureException(err);
    });
    await Sentry.flush(2000);
    throw err;
  }
}

/**
 * Scheduled scan function — runs weekly on Monday 9am UTC
 * Scans all pages with scan_frequency='weekly'
 */
export const scheduledScan = inngest.createFunction(
  {
    id: "scheduled-scan",
    retries: 0,
  },
  { cron: "0 9 * * 1" }, // Monday 9am UTC
  async ({ step }) => {
    return runScheduledScans(step, "weekly");
  }
);

/**
 * Daily scheduled scan — runs daily at 9am UTC
 * Scans all pages with scan_frequency='daily'
 */
export const scheduledScanDaily = inngest.createFunction(
  {
    id: "scheduled-scan-daily",
    retries: 0,
  },
  { cron: "0 9 * * *" }, // Daily 9am UTC
  async ({ step }) => {
    const scanResult = await runScheduledScans(step, "daily");

    // Self-healing: fix repos with missing webhooks (non-fatal — never fails the scan)
    await step.run("heal-missing-webhooks", async () => {
      try {
        const supabase = createServiceClient();
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/github`;
        if (webhookUrl.includes("localhost")) return { healed: 0 };

        // Find repos with no webhook registered
        const { data: brokenRepos } = await supabase
          .from("repos")
          .select("id, full_name, integration_id, webhook_secret")
          .is("webhook_id", null);

        if (!brokenRepos?.length) return { healed: 0 };

        let healed = 0;
        for (const repo of brokenRepos) {
          try {
            // Look up the installation ID
            const { data: integration } = await supabase
              .from("integrations")
              .select("metadata")
              .eq("id", repo.integration_id)
              .single();

            const installationId = Number(integration?.metadata?.installation_id);
            if (!installationId || isNaN(installationId)) continue;

            // Decrypt stored secret to reuse for the new webhook
            const secret = safeDecrypt(repo.webhook_secret);
            if (!secret) continue;

            // Check if a webhook already exists on GitHub
            const existingId = await findExistingWebhook(
              installationId,
              repo.full_name,
              webhookUrl
            );

            // If found, delete it — the secret may not match ours
            if (existingId) {
              await deleteRepoWebhook(installationId, repo.full_name, existingId);
            }

            // Create fresh webhook with our known secret
            const webhookId = await createRepoWebhook(
              installationId,
              repo.full_name,
              webhookUrl,
              secret
            );

            await supabase
              .from("repos")
              .update({ webhook_id: webhookId })
              .eq("id", repo.id);

            healed++;
            console.log(`Self-healed webhook for ${repo.full_name} (webhook_id: ${webhookId})`);
          } catch (err) {
            Sentry.withScope((scope) => {
              scope.setTag("function", "heal-missing-webhooks");
              scope.setExtra("repo", repo.full_name);
              Sentry.captureException(err);
            });
            console.error(`Failed to heal webhook for ${repo.full_name}:`, err);
          }
        }

        return { healed };
      } catch (err) {
        Sentry.captureException(err, { tags: { function: "heal-missing-webhooks" } });
        return { healed: 0, error: true };
      }
    });

    return scanResult;
  }
);

/**
 * Daily scan digest — sends one consolidated email per user after daily/weekly scans.
 * Runs daily at 10am UTC (1 hour after scans start at 9am, giving them time to complete).
 * Only sends if at least one page changed. All-quiet = no email.
 */
export const dailyScanDigest = inngest.createFunction(
  {
    id: "daily-scan-digest",
    retries: 1,
  },
  { cron: "0 11 * * *" }, // Daily 11am UTC (2h after scans start at 9am)
  async ({ step }) => {
    const supabase = createServiceClient();

    // Find all analyses from the last 3 hours with daily/weekly trigger
    const recentAnalyses = await step.run("find-recent-analyses", async () => {
      const threeHoursAgo = new Date();
      threeHoursAgo.setHours(threeHoursAgo.getHours() - 3);

      const { data, error } = await supabase
        .from("analyses")
        .select("id, url, user_id, changes_summary, status")
        .in("trigger_type", ["daily", "weekly"])
        .gte("created_at", threeHoursAgo.toISOString())
        .eq("status", "complete");

      if (error) {
        console.error("Failed to fetch recent analyses for digest:", error);
        throw error;
      }

      return data || [];
    });

    if (recentAnalyses.length === 0) {
      return { sent: 0, reason: "no recent analyses" };
    }

    // Group by user_id
    const byUser = new Map<string, typeof recentAnalyses>();
    for (const analysis of recentAnalyses) {
      const existing = byUser.get(analysis.user_id) || [];
      existing.push(analysis);
      byUser.set(analysis.user_id, existing);
    }

    // Send digest to each user
    const results = await step.run("send-digests", async () => {
      let sent = 0;

      for (const [userId, analyses] of byUser) {
        try {
          // Check user email preferences
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, email_notifications")
            .eq("id", userId)
            .single();

          if (!profile?.email || !profile.email_notifications) continue;

          // Build page results
          const pageResults: Array<{
            url: string;
            domain: string;
            analysisId: string;
            hasChanges: boolean;
            primaryChange?: { element: string; before: string; after: string };
            additionalChangesCount?: number;
          }> = [];

          for (const analysis of analyses) {
            const changesSummary = analysis.changes_summary as ChangesSummary | null;
            const hasChanges = !!(changesSummary?.changes?.length);

            let domain: string;
            try {
              domain = new URL(analysis.url).hostname;
            } catch {
              domain = analysis.url;
            }

            const result: (typeof pageResults)[number] = {
              url: analysis.url,
              domain,
              analysisId: analysis.id,
              hasChanges,
            };

            if (hasChanges && changesSummary) {
              const primary = changesSummary.changes[0];
              result.primaryChange = {
                element: primary.element,
                before: primary.before,
                after: primary.after,
              };
              result.additionalChangesCount = changesSummary.changes.length - 1;
            }

            pageResults.push(result);
          }

          // Skip email if ALL pages are stable
          const anyChanged = pageResults.some((p) => p.hasChanges);
          if (!anyChanged) continue;

          // Send consolidated email
          const { subject, html } = dailyDigestEmail({ pages: pageResults });
          await sendEmail({ to: profile.email, subject, html }).catch(console.error);
          sent++;
        } catch (err) {
          Sentry.withScope((scope) => {
            scope.setUser({ id: userId });
            scope.setTag("function", "dailyScanDigest");
            Sentry.captureException(err);
          });
          console.error(`Digest failed for user ${userId}:`, err);
        }
      }

      return sent;
    });

    return { sent: results };
  }
);

/**
 * Screenshot service health check — pings every 30 minutes.
 * Sentry alert fires if the service is unreachable.
 */
export const screenshotHealthCheck = inngest.createFunction(
  {
    id: "screenshot-health-check",
    retries: 0,
  },
  { cron: "*/30 * * * *" },
  async () => {
    const healthy = await pingScreenshotService();
    return { healthy };
  }
);
