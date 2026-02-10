import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

/**
 * Debug endpoint to check recent deploys and associated analyses.
 * Only works in development or for authenticated users.
 */
export async function GET() {
  // Check auth
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Get user's repos
  const { data: repos } = await supabase
    .from("repos")
    .select("id, full_name, default_branch, github_repo_id")
    .eq("user_id", user.id);

  // Get recent deploys (last 24h)
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data: deploys } = await supabase
    .from("deploys")
    .select("id, repo_id, commit_sha, commit_message, status, created_at")
    .in("repo_id", repos?.map(r => r.id) || [])
    .gte("created_at", oneDayAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  // Get recent analyses (last 24h)
  const { data: analyses } = await supabase
    .from("analyses")
    .select("id, url, status, trigger_type, deploy_id, created_at, changes_summary")
    .eq("user_id", user.id)
    .gte("created_at", oneDayAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(10);

  // Get user's pages
  const { data: pages } = await supabase
    .from("pages")
    .select("id, url, last_scan_id")
    .eq("user_id", user.id);

  return NextResponse.json({
    user_id: user.id,
    repos: repos?.map(r => ({
      id: r.id,
      full_name: r.full_name,
      default_branch: r.default_branch,
      github_repo_id: r.github_repo_id,
    })),
    recent_deploys: deploys?.map(d => ({
      id: d.id,
      commit_sha: d.commit_sha?.slice(0, 7),
      commit_message: d.commit_message?.slice(0, 50),
      status: d.status,
      created_at: d.created_at,
    })),
    recent_analyses: analyses?.map(a => ({
      id: a.id,
      url: a.url,
      status: a.status,
      trigger_type: a.trigger_type,
      deploy_id: a.deploy_id,
      created_at: a.created_at,
      has_changes: !!(a.changes_summary as { changes?: unknown[] })?.changes?.length,
      changes_count: (a.changes_summary as { changes?: unknown[] })?.changes?.length || 0,
    })),
    pages: pages?.map(p => ({
      id: p.id,
      url: p.url,
      last_scan_id: p.last_scan_id,
    })),
  });
}
