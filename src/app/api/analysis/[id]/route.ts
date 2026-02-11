import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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

  // Get current user (if logged in)
  let currentUserId: string | null = null;
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();
    currentUserId = user?.id ?? null;
  } catch {
    // Not logged in
  }

  // Privacy check: If analysis has a user_id, only that user can view it
  // Analyses without user_id (anonymous/free audits) remain public
  if (data.user_id && data.user_id !== currentUserId) {
    return NextResponse.json(
      { error: "Analysis not found" },
      { status: 404 }
    );
  }

  // If this is a re-scan, include parent's structured_output for comparison view
  let parent_structured_output = null;
  if (data.parent_analysis_id) {
    const { data: parent } = await supabase
      .from("analyses")
      .select("structured_output")
      .eq("id", data.parent_analysis_id)
      .single();
    parent_structured_output = parent?.structured_output ?? null;
  }

  // If this analysis was triggered by a deploy, include the deploy info
  let deploy_context = null;
  if (data.deploy_id) {
    const { data: deploy } = await supabase
      .from("deploys")
      .select("commit_sha, commit_message, commit_author, commit_timestamp, changed_files")
      .eq("id", data.deploy_id)
      .single();

    if (deploy) {
      deploy_context = {
        commit_sha: deploy.commit_sha,
        commit_message: deploy.commit_message,
        commit_author: deploy.commit_author,
        commit_timestamp: deploy.commit_timestamp,
        changed_files: deploy.changed_files || [],
      };
    }
  }

  // Check if this URL is claimed by anyone (for showing/hiding claim form)
  let claim_status: {
    is_claimed: boolean;
    claimed_by_current_user: boolean;
    claimed_page_id: string | null;
  } = {
    is_claimed: false,
    claimed_by_current_user: false,
    claimed_page_id: null,
  };

  const { data: claimedPage } = await supabase
    .from("pages")
    .select("id, user_id")
    .eq("url", data.url)
    .limit(1)
    .maybeSingle();

  if (claimedPage) {
    claim_status.is_claimed = true;
    if (currentUserId && claimedPage.user_id === currentUserId) {
      claim_status.claimed_by_current_user = true;
      claim_status.claimed_page_id = claimedPage.id;
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
        // Single RPC call replaces 5 parallel queries
        const { data: ctx } = await supabase.rpc("get_analysis_context", {
          p_user_id: data.user_id,
          p_url: data.url,
          p_created_at: data.created_at,
        }).single() as { data: {
          scan_number: number;
          total_scans: number;
          prev_analysis_id: string | null;
          next_analysis_id: string | null;
          baseline_date: string;
        } | null };

        page_context = {
          page_id: page.id,
          page_name: page.name,
          scan_number: ctx?.scan_number || 1,
          total_scans: ctx?.total_scans || 1,
          prev_analysis_id: ctx?.prev_analysis_id ?? null,
          next_analysis_id: ctx?.next_analysis_id ?? null,
          baseline_date: ctx?.baseline_date ?? data.created_at,
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
