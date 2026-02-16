import * as Sentry from "@sentry/nextjs";
import { inngest } from "../client";
import { createServiceClient } from "@/lib/supabase/server";
import { runCheckpointAssessment, formatCheckpointTimeline, runStrategyNarrative } from "@/lib/ai/pipeline";
import { sendEmail } from "@/lib/email/resend";
import { correlationUnlockedEmail } from "@/lib/email/templates";
import type { DetectedChange, ChangesSummary, CorrelationMetrics, CheckpointAssessment, HorizonDays } from "@/lib/types/analysis";
import { safeDecrypt } from "@/lib/crypto";
import { composeProgressFromCanonicalState, friendlyMetricNames } from "@/lib/analysis/progress";
import { correlateChange, gatherSupabaseMetrics } from "@/lib/analytics/correlation";
import { createSupabaseAdapter, SupabaseAdapter } from "@/lib/analytics/supabase-adapter";
import { createProvider } from "@/lib/analytics/provider";
import {
  getEligibleHorizons,
  computeWindows,
  assessCheckpoint,
  resolveStatusTransition,
  formatCheckpointObservation,
} from "@/lib/analytics/checkpoints";

/**
 * Checkpoint engine — daily 5-horizon correlation (D+7, D+14, D+30, D+60, D+90).
 *
 * Replaces the old checkCorrelations (single 7-day, one-shot).
 * Each horizon produces an immutable change_checkpoints row.
 * Status transitions follow the decision-horizon model:
 * - D+7/D+14: early signals only
 * - D+30: first canonical resolution
 * - D+60/D+90: confirmation or reversal
 */
export const runCheckpoints = inngest.createFunction(
  {
    id: "run-checkpoints",
    retries: 0, // Cron pattern: no retries to prevent duplicate full runs
  },
  [
    { cron: "30 10 * * *" }, // Daily 10:30 UTC — after daily scans, before digest
    { event: "checkpoints/run" }, // Backup trigger from Vercel Cron self-heal
  ],
  async ({ step }) => {
    const supabase = createServiceClient();
    const now = new Date();

    // Step 1: Find all eligible changes with their existing checkpoints.
    // No date cutoff — getEligibleHorizons returns [] for fully-computed changes,
    // so older changes with missing horizons still get catch-up processing.
    // Paginated in batches to bound memory as table grows.
    const eligible = await step.run("find-eligible", async () => {
      type ChangeRow = {
        id: string; page_id: string; user_id: string; element: string;
        element_type: string; scope: string; before_value: string; after_value: string;
        description: string; first_detected_at: string; first_detected_analysis_id: string;
        status: string; correlation_metrics: unknown; observation_text: string;
        hypothesis: string | null;
        pages: { url: string; metric_focus: string | null };
      };
      const allChanges: ChangeRow[] = [];
      const PAGE_SIZE = 500;
      let offset = 0;

      while (true) {
        const { data: batch, error } = await supabase
          .from("detected_changes")
          .select(`
            id, page_id, user_id, element, element_type, scope,
            before_value, after_value, description, first_detected_at,
            first_detected_analysis_id, status, correlation_metrics,
            observation_text, hypothesis,
            pages!inner(url, metric_focus)
          `)
          .in("status", ["watching", "validated", "regressed", "inconclusive"])
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) {
          console.error("Failed to fetch changes for checkpoints:", error);
          throw new Error(`Failed to fetch changes for checkpoints: ${error.message}`);
        }
        if (batch?.length) allChanges.push(...(batch as unknown as ChangeRow[]));
        if ((batch?.length ?? 0) < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      if (!allChanges.length) return [];

      // Get existing checkpoints in batches (Supabase IN has practical limits)
      const changeIds = allChanges.map((c) => c.id);
      const existingByChange = new Map<string, number[]>();

      for (let i = 0; i < changeIds.length; i += 300) {
        const idBatch = changeIds.slice(i, i + 300);
        const { data: existingCheckpoints, error: existingError } = await supabase
          .from("change_checkpoints")
          .select("change_id, horizon_days")
          .in("change_id", idBatch);

        if (existingError) {
          console.error("Failed to fetch existing checkpoints:", existingError);
          throw new Error(`Failed to fetch existing checkpoints: ${existingError.message}`);
        }

        for (const cp of existingCheckpoints || []) {
          const arr = existingByChange.get(cp.change_id) || [];
          arr.push(cp.horizon_days);
          existingByChange.set(cp.change_id, arr);
        }
      }

      // Determine which horizons are due for each change
      const result: Array<{
        change: ChangeRow;
        pageUrl: string;
        pageFocus: string | null;
        dueHorizons: HorizonDays[];
      }> = [];

      for (const change of allChanges) {
        const changeDate = new Date(change.first_detected_at);
        const existing = existingByChange.get(change.id) || [];
        const dueHorizons = getEligibleHorizons(changeDate, now, existing);

        if (dueHorizons.length > 0) {
          const page = change.pages as unknown as { url: string; metric_focus: string | null };
          result.push({ change, pageUrl: page.url, pageFocus: page.metric_focus, dueHorizons });
        }
      }

      return result;
    });

    if (eligible.length === 0) {
      return { processed: 0, reason: "no checkpoints due" };
    }

    // Group by user_id
    const byUser = new Map<string, typeof eligible>();
    for (const item of eligible) {
      const arr = byUser.get(item.change.user_id) || [];
      arr.push(item);
      byUser.set(item.change.user_id, arr);
    }

    // Step 2: Process each user's changes
    const allResults: Array<{ userId: string; checkpoints: number; transitions: number; errors: number }> = [];
    const newlyValidated: Array<{
      userId: string;
      changeId: string;
      element: string;
      beforeValue: string;
      afterValue: string;
      firstDetectedAt: string;
      analysisId: string;
      pageUrl: string;
      topMetric: { name: string; change_percent: number } | null;
    }> = [];

    for (const [userId, userItems] of byUser) {
      const userResult = await step.run(`process-user-${userId}`, async () => {
        let checkpointsWritten = 0;
        let transitionsApplied = 0;
        let errors = 0;

        // Fetch analytics credentials ONCE per user
        const { data: posthogIntegration } = await supabase
          .from("integrations")
          .select("access_token, provider_account_id, metadata")
          .eq("user_id", userId)
          .eq("provider", "posthog")
          .maybeSingle();

        const { data: ga4Integration } = await supabase
          .from("integrations")
          .select("id, access_token, metadata")
          .eq("user_id", userId)
          .eq("provider", "ga4")
          .maybeSingle();

        let provider: Awaited<ReturnType<typeof createProvider>> | null = null;
        let providerName = "none";

        // Wrap provider init in try/catch — a bad decrypt or stale token shouldn't
        // abort all checkpoint work for this user (changes still get inconclusive checkpoints)
        try {
          if (posthogIntegration) {
            providerName = "posthog";
            provider = await createProvider("posthog", {
              apiKey: safeDecrypt(posthogIntegration.access_token),
              projectId: posthogIntegration.provider_account_id,
              host: posthogIntegration.metadata?.host,
            });
          } else if (ga4Integration?.metadata?.property_id) {
            providerName = "ga4";
            provider = await createProvider("ga4", {
              accessToken: safeDecrypt(ga4Integration.access_token),
              refreshToken: safeDecrypt(ga4Integration.metadata.refresh_token),
              tokenExpiresAt: ga4Integration.metadata.token_expires_at,
              propertyId: ga4Integration.metadata.property_id,
              integrationId: ga4Integration.id,
            }, { supabase });
          }
        } catch (providerErr) {
          console.error(`Failed to init analytics provider for user ${userId}:`, providerErr);
          Sentry.withScope((scope) => {
            scope.setUser({ id: userId });
            scope.setTag("function", "runCheckpoints");
            scope.setTag("provider", providerName || "unknown");
            Sentry.captureException(providerErr);
          });
          // Reset — don't tag checkpoints with a provider that failed to initialize
          provider = null;
          providerName = "none";
        }

        // Fetch Supabase integration for DB-based metrics
        let supabaseAdapter: SupabaseAdapter | null = null;
        try {
          const { data: supabaseIntegration } = await supabase
            .from("integrations")
            .select("access_token, metadata")
            .eq("user_id", userId)
            .eq("provider", "supabase")
            .maybeSingle();

          if (supabaseIntegration) {
            supabaseAdapter = createSupabaseAdapter(
              supabaseIntegration.metadata.project_url,
              safeDecrypt(supabaseIntegration.access_token),
              supabaseIntegration.metadata.key_type || "anon"
            );
          }
        } catch (adapterErr) {
          console.warn(`Failed to init Supabase adapter for user ${userId}:`, adapterErr);
        }

        // Map by changeId to only notify on final status (avoids sending "validated"
        // email for a change that later regresses in a higher horizon within the same run)
        const validatedByChange = new Map<string, typeof newlyValidated[0]>();

        for (const { change, pageUrl, pageFocus, dueHorizons } of userItems) {
          try {
            // Get existing checkpoints + user feedback for transition logic + LLM context
            const [{ data: existingCps, error: existingCpsError }, { data: feedbackRows }] = await Promise.all([
              supabase
                .from("change_checkpoints")
                .select("id, horizon_days, assessment, reasoning")
                .eq("change_id", change.id),
              supabase
                .from("outcome_feedback")
                .select("feedback_type, feedback_text, checkpoint_id")
                .eq("change_id", change.id)
                .eq("user_id", change.user_id),
            ]);

            if (existingCpsError) {
              console.error(`Failed to fetch existing checkpoints for change ${change.id}:`, existingCpsError);
              errors++;
              continue;
            }

            const existingCheckpoints = (existingCps || []).map((cp) => ({
              id: cp.id,
              horizon_days: cp.horizon_days,
              assessment: cp.assessment as CheckpointAssessment,
              reasoning: cp.reasoning as string | undefined,
            }));

            // Build prior feedback context for LLM
            const priorFeedback = (feedbackRows || []).map(f => {
              const cp = existingCheckpoints.find(c => c.id === f.checkpoint_id);
              return cp ? {
                horizon_days: cp.horizon_days,
                feedback_type: f.feedback_type as "accurate" | "inaccurate",
                feedback_text: f.feedback_text,
                assessment: cp.assessment,
              } : null;
            }).filter((f): f is NonNullable<typeof f> => f !== null);

            for (const horizonDays of dueHorizons) {
              const changeDate = new Date(change.first_detected_at);
              const windows = computeWindows(changeDate, horizonDays);

              let assessment: CheckpointAssessment = "inconclusive";
              let reasoning: string | null = null;
              let confidence: number | null = null;
              let metricsJson: { metrics: Array<{ name: string; source?: string; before: number; after: number; change_percent: number; assessment: "improved" | "regressed" | "neutral" }>; overall_assessment: string; reason?: string } = {
                metrics: [],
                overall_assessment: "inconclusive",
              };

              // 1. Gather PostHog/GA4 metrics
              let analyticsMetrics: Array<{ name: string; source: string; before: number; after: number; change_percent: number }> = [];
              if (provider) {
                const detectedChange: DetectedChange = {
                  id: change.id,
                  page_id: change.page_id,
                  user_id: change.user_id,
                  element: change.element,
                  element_type: change.element_type,
                  scope: change.scope as "element" | "section" | "page",
                  before_value: change.before_value,
                  after_value: change.after_value,
                  description: change.description,
                  first_detected_at: change.first_detected_at,
                  status: change.status as DetectedChange["status"],
                  created_at: change.first_detected_at,
                  updated_at: change.first_detected_at,
                };

                const result = await correlateChange(detectedChange, provider, pageUrl, {
                  beforeStart: windows.beforeStart,
                  beforeEnd: windows.beforeEnd,
                  afterStart: windows.afterStart,
                  afterEnd: windows.afterEnd,
                });

                metricsJson = result.metrics;
                analyticsMetrics = result.metrics.metrics.map(m => ({ ...m, source: providerName }));
              }

              // 2. Gather Supabase DB metrics
              let supabaseMetrics: Array<{ name: string; source: string; before: number; after: number; change_percent: number }> = [];
              if (supabaseAdapter) {
                supabaseMetrics = await gatherSupabaseMetrics(supabaseAdapter, supabase, userId, windows);
              }

              // 3. Enrich metricsJson with Supabase data (before assessment so fallback sees all data)
              const SIGNIFICANCE_THRESHOLD = 5;
              if (supabaseMetrics.length > 0) {
                metricsJson.metrics = [
                  ...(metricsJson.metrics || []),
                  ...supabaseMetrics.map(m => ({
                    name: m.name,
                    source: "supabase",
                    before: m.before,
                    after: m.after,
                    change_percent: m.change_percent,
                    assessment: (Math.abs(m.change_percent) <= SIGNIFICANCE_THRESHOLD
                      ? "neutral"
                      : m.change_percent > 0 ? "improved" : "regressed") as "improved" | "regressed" | "neutral",
                  })),
                ];
              }

              // If no provider and no supabase data, mark reason
              if (!provider && supabaseMetrics.length === 0) {
                metricsJson = {
                  metrics: [],
                  overall_assessment: "inconclusive",
                  reason: "analytics_disconnected",
                };
              }

              // 4. Combine all metrics for LLM context
              const allMetrics = [...analyticsMetrics, ...supabaseMetrics];
              const dataSources = [
                ...(provider ? [providerName] : []),
                ...(supabaseMetrics.length > 0 ? ["supabase"] : []),
              ];

              // 5. LLM assessment (3 attempts, then deterministic fallback)
              const llmResult = await runCheckpointAssessment({
                change: {
                  element: change.element,
                  before_value: change.before_value,
                  after_value: change.after_value,
                  description: change.description,
                },
                horizonDays,
                metrics: allMetrics,
                priorCheckpoints: existingCheckpoints.map(cp => ({
                  horizon_days: cp.horizon_days,
                  assessment: cp.assessment,
                })),
                hypothesis: change.hypothesis,
                pageFocus: pageFocus,
                pageUrl,
                priorFeedback: priorFeedback.length > 0 ? priorFeedback : undefined,
              });

              if (llmResult) {
                assessment = llmResult.assessment;
                confidence = llmResult.confidence;
                reasoning = llmResult.reasoning;
              } else {
                // Deterministic fallback — uses all metrics (PostHog/GA4 + Supabase)
                const assessed = assessCheckpoint(metricsJson.metrics || []);
                assessment = assessed.assessment;
                // Synthesize reasoning so every checkpoint has an explanation
                const metricCount = metricsJson.metrics?.length ?? 0;
                const improved = metricsJson.metrics?.filter(m => m.assessment === "improved").length ?? 0;
                const regressed = metricsJson.metrics?.filter(m => m.assessment === "regressed").length ?? 0;
                reasoning = metricCount === 0
                  ? `Deterministic fallback: no metric data available. Assessment: ${assessment}.`
                  : `Deterministic fallback (LLM unavailable): ${metricCount} metrics assessed — ${improved} improved, ${regressed} regressed. Assessment: ${assessment}.`;
                confidence = metricCount === 0 ? 0 : 0.3; // Low confidence for deterministic
              }

              // Sync overall_assessment with final assessment (P3 fix: avoid internal inconsistency)
              metricsJson.overall_assessment = assessment;

              // Determine effective provider — reflect Supabase when it's the only data source
              const effectiveProvider = provider ? providerName
                : supabaseMetrics.length > 0 ? "supabase"
                : "none";

              // INSERT checkpoint (upsert with ON CONFLICT DO NOTHING for idempotency)
              const { data: upsertedRows, error: insertError } = await supabase
                .from("change_checkpoints")
                .upsert(
                  {
                    change_id: change.id,
                    horizon_days: horizonDays,
                    window_before_start: windows.beforeStart.toISOString(),
                    window_before_end: windows.beforeEnd.toISOString(),
                    window_after_start: windows.afterStart.toISOString(),
                    window_after_end: windows.afterEnd.toISOString(),
                    metrics_json: metricsJson,
                    assessment,
                    confidence,
                    reasoning,
                    data_sources: dataSources,
                    provider: effectiveProvider,
                    computed_at: now.toISOString(),
                  },
                  { onConflict: "change_id,horizon_days", ignoreDuplicates: true }
                )
                .select("id");

              if (insertError) {
                console.error(`Failed to insert checkpoint for change ${change.id} D+${horizonDays}:`, insertError);
                errors++;
                continue;
              }

              // ignoreDuplicates returns empty array when row already existed — skip transition logic
              if (!upsertedRows?.length) {
                existingCheckpoints.push({ id: "", horizon_days: horizonDays, assessment, reasoning: reasoning ?? undefined });
                continue;
              }

              checkpointsWritten++;

              // Check for status transition
              const { data: currentChange, error: currentChangeError } = await supabase
                .from("detected_changes")
                .select("status, correlation_metrics, correlation_unlocked_at")
                .eq("id", change.id)
                .maybeSingle();

              if (currentChangeError || !currentChange) {
                console.error(`Failed to fetch current status for change ${change.id}:`, currentChangeError);
                errors++;
                continue;
              }

              const currentStatus = currentChange.status as DetectedChange["status"];
              const transition = resolveStatusTransition(
                currentStatus,
                horizonDays,
                assessment,
                existingCheckpoints
              );

              if (transition) {
                const topMetric = metricsJson.metrics.find(
                  (m) => m.assessment === "improved" || m.assessment === "regressed"
                ) || null;
                const transitionAt = new Date().toISOString();

                const { data: updatedRows, error: statusError } = await supabase
                  .from("detected_changes")
                  .update({
                    status: transition.newStatus,
                    correlation_metrics: metricsJson,
                    correlation_unlocked_at: transitionAt,
                    updated_at: transitionAt,
                  })
                  .eq("id", change.id)
                  .eq("status", currentStatus)
                  .select("id");

                if (statusError) {
                  console.error(`Failed to update status for change ${change.id}:`, statusError);
                  errors++;
                  continue; // Don't record lifecycle event or send notification for failed mutation
                }
                if (!updatedRows?.length) {
                  console.warn(
                    `[checkpoint-concurrency] Skipped status transition for change ${change.id}: status changed concurrently`
                  );
                  continue;
                }

                // Insert lifecycle event — required audit evidence for the status change.
                // If this fails, revert the status update to maintain the invariant
                // that every status mutation has a lifecycle record.
                const { error: lifecycleError } = await supabase.from("change_lifecycle_events").insert({
                  change_id: change.id,
                  from_status: currentStatus,
                  to_status: transition.newStatus,
                  reason: transition.reason,
                  actor_type: "system",
                  checkpoint_id: upsertedRows[0].id,
                });

                if (lifecycleError) {
                  console.error(`Failed to insert lifecycle event for change ${change.id}, reverting status:`, lifecycleError);
                  // Revert the full status update — restore status, correlation_metrics,
                  // and correlation_unlocked_at to pre-transition values
                  const { data: revertedRows, error: rollbackError } = await supabase
                    .from("detected_changes")
                    .update({
                      status: currentStatus,
                      correlation_metrics: currentChange.correlation_metrics ?? null,
                      correlation_unlocked_at: currentChange.correlation_unlocked_at ?? null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", change.id)
                    .eq("status", transition.newStatus)
                    .select("id");
                  if (rollbackError || !revertedRows?.length) {
                    console.error(`Failed to rollback status for change ${change.id}:`, rollbackError);
                    Sentry.captureMessage("Checkpoint lifecycle rollback failed", {
                      level: "error",
                      tags: { function: "runCheckpoints", changeId: change.id },
                    });
                  }
                  errors++;
                  continue; // Skip notification — transition didn't complete cleanly
                }

                // Generate observation if none exists
                if (!change.observation_text) {
                  const observation = formatCheckpointObservation(
                    change.element,
                    new Date(change.first_detected_at),
                    horizonDays,
                    topMetric ? { name: topMetric.name, change_percent: topMetric.change_percent } : null,
                    assessment
                  );
                  const { error: obsError } = await supabase
                    .from("detected_changes")
                    .update({ observation_text: observation })
                    .eq("id", change.id);

                  if (obsError) {
                    console.error(`Failed to update observation for change ${change.id}:`, obsError);
                  }
                }

                transitionsApplied++;

                // Collect for notification
                // Only keep final status per change (avoids sending "validated"
                // email for a change that later regresses in a higher horizon)
                if (transition.newStatus === "validated") {
                  validatedByChange.set(change.id, {
                    userId,
                    changeId: change.id,
                    element: change.element,
                    beforeValue: change.before_value,
                    afterValue: change.after_value,
                    firstDetectedAt: change.first_detected_at,
                    analysisId: change.first_detected_analysis_id || change.id,
                    pageUrl,
                    topMetric: topMetric ? { name: topMetric.name, change_percent: topMetric.change_percent } : null,
                  });
                } else {
                  // Status changed away from validated — cancel pending notification
                  validatedByChange.delete(change.id);
                }

                // Update local status for subsequent horizon processing
                (change as { status: string }).status = transition.newStatus;
              }

              // Track for subsequent horizon logic within same run
              existingCheckpoints.push({ id: upsertedRows[0].id, horizon_days: horizonDays, assessment, reasoning: reasoning ?? undefined });
            }
          } catch (err) {
            Sentry.withScope((scope) => {
              scope.setUser({ id: userId });
              scope.setTag("function", "runCheckpoints");
              scope.setTag("changeId", change.id);
              Sentry.captureException(err, { extra: { pageId: change.page_id } });
            });
            await Sentry.flush(2000);
            console.error(`Checkpoint failed for change ${change.id}:`, err);
            errors++;
          }
        }

        return { checkpointsWritten, transitionsApplied, errors, validated: [...validatedByChange.values()] };
      });

      allResults.push({
        userId,
        checkpoints: userResult.checkpointsWritten,
        transitions: userResult.transitionsApplied,
        errors: userResult.errors,
      });
      newlyValidated.push(...userResult.validated);
    }

    // Step 3: Send notifications for newly validated changes
    if (newlyValidated.length > 0) {
      await step.run("send-notifications", async () => {
        for (const item of newlyValidated) {
          try {
            const { data: profile } = await supabase
              .from("profiles")
              .select("email, email_notifications")
              .eq("id", item.userId)
              .single();

            if (!profile?.email || !profile.email_notifications) continue;

            const { subject, html } = correlationUnlockedEmail({
              pageUrl: item.pageUrl,
              analysisId: item.analysisId,
              changeId: item.changeId,
              change: {
                element: item.element,
                before: item.beforeValue,
                after: item.afterValue,
                changedAt: new Date(item.firstDetectedAt).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                }),
              },
              metric: item.topMetric
                ? {
                    friendlyName: friendlyMetricNames[item.topMetric.name] || item.topMetric.name,
                    change: `${item.topMetric.change_percent > 0 ? "+" : ""}${item.topMetric.change_percent}%`,
                  }
                : { friendlyName: "metrics", change: "improved" },
            });

            sendEmail({ to: profile.email, subject, html }).catch(console.error);
          } catch (err) {
            console.error(`Failed to send notification for change ${item.changeId}:`, err);
          }
        }
      });
    }

    // Step 4: Recompose progress + generate strategy narrative on affected pages
    const affectedPageIds = [...new Set(eligible.map((e) => e.change.page_id))];
    if (affectedPageIds.length > 0 && allResults.some((r) => r.checkpoints > 0 || r.transitions > 0)) {
      await step.run("recompose-and-narrate", async () => {
        const { data: pageAnalyses } = await supabase
          .from("pages")
          .select("id, url, last_scan_id, metric_focus")
          .in("id", affectedPageIds)
          .not("last_scan_id", "is", null);

        if (!pageAnalyses?.length) return;

        for (const page of pageAnalyses) {
          try {
            const { data: analysis } = await supabase
              .from("analyses")
              .select("changes_summary")
              .eq("id", page.last_scan_id)
              .single();

            if (!analysis?.changes_summary) continue;

            // 1. Recompose canonical progress (existing logic)
            const canonical = await composeProgressFromCanonicalState(page.id, supabase);
            if (!canonical) continue;

            // 2. Build checkpoint timeline for strategy narrative
            const { data: pageChanges } = await supabase
              .from("detected_changes")
              .select("id, element, status, first_detected_at, hypothesis")
              .eq("page_id", page.id)
              .in("status", ["watching", "validated", "regressed", "inconclusive"])
              .limit(20);

            let strategyResult: Awaited<ReturnType<typeof runStrategyNarrative>> = null;

            if (pageChanges?.length) {
              const changeIds = pageChanges.map((c) => c.id);
              const { data: checkpoints } = await supabase
                .from("change_checkpoints")
                .select("change_id, horizon_days, assessment, metrics_json")
                .in("change_id", changeIds)
                .order("horizon_days", { ascending: true });

              if (checkpoints?.length) {
                const merged = pageChanges.flatMap((c) => {
                  return (checkpoints || [])
                    .filter((cp) => cp.change_id === c.id)
                    .map((cp) => ({
                      change_id: c.id,
                      element: c.element,
                      horizon_days: cp.horizon_days as number,
                      assessment: cp.assessment as string,
                      metrics_json: cp.metrics_json as { metrics: Array<{ name: string; change_percent: number; assessment: string }> },
                      status: c.status,
                      first_detected_at: c.first_detected_at,
                    }));
                });

                const timeline = formatCheckpointTimeline(merged);

                // 3. Run strategy LLM (non-fatal)
                if (timeline) {
                  try {
                    const hypotheses = pageChanges
                      .filter((c) => c.hypothesis)
                      .map((c) => ({ changeId: c.id, element: c.element, hypothesis: c.hypothesis! }));

                    const currentSummary = analysis.changes_summary as ChangesSummary;
                    strategyResult = await runStrategyNarrative({
                      pageUrl: page.url,
                      pageFocus: page.metric_focus,
                      checkpointTimeline: timeline,
                      currentRunningSummary: currentSummary.running_summary,
                      changeHypotheses: hypotheses.length ? hypotheses : null,
                    });
                  } catch (narrativeErr) {
                    console.warn(`[strategy] LLM narrative failed for page ${page.id}:`, narrativeErr);
                    Sentry.captureMessage("Strategy narrative failed in checkpoint job", {
                      level: "warning",
                      tags: { function: "runCheckpoints", pageId: page.id },
                    });
                  }
                }
              }
            }

            // 4. Build updated summary
            const currentSummary = analysis.changes_summary as ChangesSummary;
            const updatedSummary: ChangesSummary = {
              ...currentSummary,
              progress: {
                ...currentSummary.progress,
                validated: canonical.validated,
                watching: canonical.watching,
                open: canonical.open,
                validatedItems: canonical.validatedItems,
                watchingItems: canonical.watchingItems,
                openItems: canonical.openItems,
              },
            };

            // Merge strategy narrative if available (only overwrite with non-empty values)
            if (strategyResult) {
              if (strategyResult.strategy_narrative) {
                updatedSummary.strategy_narrative = strategyResult.strategy_narrative;
              }
              if (strategyResult.running_summary) {
                updatedSummary.running_summary = strategyResult.running_summary;
              }

              // Update observation_text on individual changes (validate changeIds)
              if (strategyResult.observations?.length && pageChanges?.length) {
                const validIds = new Set(pageChanges.map((c) => c.id));
                for (const obs of strategyResult.observations) {
                  if (obs.changeId && validIds.has(obs.changeId) && obs.text) {
                    await supabase
                      .from("detected_changes")
                      .update({ observation_text: obs.text.slice(0, 2000), updated_at: new Date().toISOString() })
                      .eq("id", obs.changeId);
                  }
                }
              }
            }

            await supabase
              .from("analyses")
              .update({ changes_summary: updatedSummary })
              .eq("id", page.last_scan_id);
          } catch (err) {
            console.error(`[recompose-narrate] Failed for page ${page.id}:`, err);
          }
        }
      });
    }

    const totalCheckpoints = allResults.reduce((s, r) => s + r.checkpoints, 0);
    const totalTransitions = allResults.reduce((s, r) => s + r.transitions, 0);
    const totalErrors = allResults.reduce((s, r) => s + r.errors, 0);

    return {
      processed: eligible.length,
      checkpoints: totalCheckpoints,
      transitions: totalTransitions,
      notifications: newlyValidated.length,
      errors: totalErrors,
    };
  }
);
