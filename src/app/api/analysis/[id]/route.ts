import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getEffectiveTier, getMaxHorizonDays } from "@/lib/permissions";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Validate UUID format
  if (!UUID_RE.test(id)) {
    return NextResponse.json(
      { error: "Invalid analysis ID" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("analyses")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 }
    );
  }

  // Run auth, parent, deploy, and claim queries in parallel
  // (all independent once we have the analysis data)
  const [authResult, parentResult, deployResult, claimResult] = await Promise.all([
    // Auth: get current user
    (async () => {
      try {
        const authClient = await createClient();
        const { data: { user } } = await authClient.auth.getUser();
        return user?.id ?? null;
      } catch {
        return null;
      }
    })(),
    // Parent: structured_output for comparison view
    data.parent_analysis_id
      ? supabase
          .from("analyses")
          .select("structured_output")
          .eq("id", data.parent_analysis_id)
          .single()
          .then(({ data: parent }) => parent?.structured_output ?? null)
      : Promise.resolve(null),
    // Deploy: commit context
    data.deploy_id
      ? supabase
          .from("deploys")
          .select("commit_sha, commit_message, commit_author, commit_timestamp, changed_files")
          .eq("id", data.deploy_id)
          .single()
          .then(({ data: deploy }) =>
            deploy
              ? {
                  commit_sha: deploy.commit_sha,
                  commit_message: deploy.commit_message,
                  commit_author: deploy.commit_author,
                  commit_timestamp: deploy.commit_timestamp,
                  changed_files: deploy.changed_files || [],
                }
              : null
          )
      : Promise.resolve(null),
    // Claim: check if URL is claimed
    supabase
      .from("pages")
      .select("id, user_id")
      .eq("url", data.url)
      .limit(1)
      .maybeSingle()
      .then(({ data: claimedPage }) => claimedPage),
  ]);

  const currentUserId = authResult;
  const parent_structured_output = parentResult;
  const deploy_context = deployResult;

  // Privacy check: If analysis has a user_id, only that user can view it
  // Analyses without user_id (anonymous/free audits) remain public
  if (data.user_id && data.user_id !== currentUserId) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 }
    );
  }

  // Build claim status from parallel result
  const claim_status: {
    is_claimed: boolean;
    claimed_by_current_user: boolean;
    claimed_page_id: string | null;
  } = {
    is_claimed: false,
    claimed_by_current_user: false,
    claimed_page_id: null,
  };

  if (claimResult) {
    claim_status.is_claimed = true;
    if (currentUserId && claimResult.user_id === currentUserId) {
      claim_status.claimed_by_current_user = true;
      claim_status.claimed_page_id = claimResult.id;
    }
  }

  // Check if this analysis belongs to a registered page
  // Only show page_context if the requesting user owns this analysis (privacy)
  let page_context = null;
  if (data.user_id) {
    // Only fetch page context if the current user owns this analysis
    if (currentUserId && currentUserId === data.user_id) {
      const { data: page } = await supabase
        .from("pages")
        .select("id, name, url")
        .eq("user_id", data.user_id)
        .eq("url", data.url)
        .single();

      if (page) {
        // Round 1: analysis context + changes + profile (independent)
        const [ctxResult, changeResult, profileResult] = await Promise.all([
          supabase.rpc("get_analysis_context", {
            p_user_id: data.user_id,
            p_url: data.url,
            p_created_at: data.created_at,
          }).single(),
          supabase
            .from("detected_changes")
            .select("id, hypothesis, status")
            .eq("page_id", page.id),
          supabase
            .from("profiles")
            .select("subscription_tier, subscription_status, trial_ends_at")
            .eq("id", currentUserId!)
            .single(),
        ]);
        const ctx = ctxResult.data as {
          scan_number: number;
          total_scans: number;
          prev_analysis_id: string | null;
          next_analysis_id: string | null;
          baseline_date: string;
        } | null;
        const changeRows = changeResult.data;
        const changeIds = (changeRows || []).map(r => r.id);

        // Build hypothesis map from detected_changes
        let hypothesis_map: Record<string, string> | undefined;
        if (changeRows && changeRows.length > 0) {
          const withHypothesis = changeRows.filter(r => r.hypothesis);
          if (withHypothesis.length > 0) {
            hypothesis_map = {};
            for (const row of withHypothesis) {
              hypothesis_map[row.id] = row.hypothesis!;
            }
          }
        }

        // Round 2: feedback + checkpoints (scoped to this page's changes)
        const resolvedIds = (changeRows || [])
          .filter(r => r.status === "validated" || r.status === "regressed")
          .map(r => r.id);

        const [feedbackResult, checkpointResult] = changeIds.length > 0
          ? await Promise.all([
              supabase
                .from("outcome_feedback")
                .select("change_id, checkpoint_id, feedback_type")
                .eq("user_id", currentUserId!)
                .in("change_id", changeIds),
              resolvedIds.length > 0
                ? supabase
                    .from("change_checkpoints")
                    .select("change_id, id, horizon_days, assessment")
                    .in("change_id", resolvedIds)
                    .order("horizon_days", { ascending: false })
                : Promise.resolve({ data: [] as { change_id: string; id: string; horizon_days: number; assessment: string }[] }),
            ])
          : [
              { data: [] as { change_id: string; checkpoint_id: string; feedback_type: string }[] },
              { data: [] as { change_id: string; id: string; horizon_days: number; assessment: string }[] },
            ];

        // Build feedback map keyed by checkpoint_id (supports multiple feedbacks per change)
        let feedback_map: Record<string, { feedback_type: string; checkpoint_id: string }> | undefined;
        if (feedbackResult.data?.length) {
          feedback_map = {};
          for (const f of feedbackResult.data) {
            feedback_map[f.checkpoint_id] = { feedback_type: f.feedback_type, checkpoint_id: f.checkpoint_id };
          }
        }

        // Build checkpoint map (change_id → checkpoint that matches displayed outcome)
        // The card shows correlation_metrics from the transition that set validated/regressed,
        // so feedback must target the checkpoint whose assessment matches that status.
        let checkpoint_map: Record<string, { checkpoint_id: string; horizon_days: number }> | undefined;
        if (checkpointResult.data?.length) {
          // Build status lookup from changeRows
          const statusByChangeId = new Map<string, string>();
          for (const r of changeRows || []) {
            statusByChangeId.set(r.id, r.status);
          }
          // Map status → matching checkpoint assessment
          const statusToAssessment: Record<string, string> = { validated: "improved", regressed: "regressed" };

          checkpoint_map = {};
          for (const cp of checkpointResult.data) {
            if (checkpoint_map[cp.change_id]) continue; // already found best match
            const changeStatus = statusByChangeId.get(cp.change_id);
            const expectedAssessment = changeStatus ? statusToAssessment[changeStatus] : null;
            // Prefer checkpoint whose assessment matches the displayed outcome
            if (cp.assessment === expectedAssessment) {
              checkpoint_map[cp.change_id] = { checkpoint_id: cp.id, horizon_days: cp.horizon_days };
            }
          }
          // Fallback: if no assessment-matched checkpoint found, use highest horizon
          for (const cp of checkpointResult.data) {
            if (!checkpoint_map[cp.change_id]) {
              checkpoint_map[cp.change_id] = { checkpoint_id: cp.id, horizon_days: cp.horizon_days };
            }
          }
          if (Object.keys(checkpoint_map).length === 0) checkpoint_map = undefined;
        }

        const profile = profileResult.data;
        const effectiveTier = profile
          ? getEffectiveTier(profile.subscription_tier, profile.subscription_status, profile.trial_ends_at)
          : "free";

        page_context = {
          page_id: page.id,
          page_name: page.name,
          scan_number: ctx?.scan_number || 1,
          total_scans: ctx?.total_scans || 1,
          prev_analysis_id: ctx?.prev_analysis_id ?? null,
          next_analysis_id: ctx?.next_analysis_id ?? null,
          baseline_date: ctx?.baseline_date ?? data.created_at,
          hypothesis_map,
          feedback_map,
          checkpoint_map,
          max_horizon_days: getMaxHorizonDays(effectiveTier),
        };
      }
    }
  }

  // Cache complete analyses for 60s, revalidate in background for 5min
  // Pending/processing analyses should not be cached
  const cacheHeader = data.status === "complete"
    ? "private, max-age=60, stale-while-revalidate=300"
    : "private, no-cache";

  return NextResponse.json({
    ...data,
    parent_structured_output,
    page_context,
    deploy_context,
    trigger_type: data.trigger_type || null,
    claim_status,
  }, {
    headers: { "Cache-Control": cacheHeader },
  });
}
