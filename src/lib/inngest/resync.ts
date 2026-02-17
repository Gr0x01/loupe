import * as Sentry from "@sentry/nextjs";

/**
 * PUT to the Inngest serve endpoint to re-register functions.
 * Prevents cron registrations from going stale after deploys.
 *
 * Uses the production URL (NEXT_PUBLIC_APP_URL), NOT VERCEL_URL
 * which resolves to deployment-specific preview URLs.
 */
export async function resyncInngest() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://getloupe.io";

    const res = await fetch(`${baseUrl}/api/inngest`, {
      method: "PUT",
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      Sentry.captureMessage(`Inngest re-sync failed: ${res.status} ${res.statusText}`, {
        tags: { function: "resyncInngest" },
        level: "warning",
        extra: { status: res.status, url: `${baseUrl}/api/inngest` },
      });
    }
  } catch (err) {
    // Non-fatal — don't fail the cron, but make it visible in Sentry
    Sentry.captureException(err, {
      tags: { function: "resyncInngest" },
      level: "warning",
    });
  }
}
