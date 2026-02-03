import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/pages/[id]/history - Get scan history for a page
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "Invalid page ID" }, { status: 400 });
    }

    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get the page to verify ownership and get URL
    const { data: page, error: pageError } = await supabase
      .from("pages")
      .select("id, url, name, scan_frequency, repo_id, hide_from_leaderboard, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Get all analyses for this URL by this user, ordered by date desc
    const { data: analyses, error: analysesError } = await supabase
      .from("analyses")
      .select(`
        id,
        url,
        status,
        structured_output,
        changes_summary,
        created_at,
        parent_analysis_id
      `)
      .eq("user_id", user.id)
      .eq("url", page.url)
      .order("created_at", { ascending: false });

    if (analysesError) {
      console.error("Failed to fetch analyses:", analysesError);
      return NextResponse.json(
        { error: "Failed to fetch scan history" },
        { status: 500 }
      );
    }

    // Format the history with score, status, and changes preview
    const history = (analyses || []).map((analysis, index) => ({
      id: analysis.id,
      scan_number: (analyses?.length || 0) - index,
      status: analysis.status,
      score: analysis.structured_output?.overallScore ?? null,
      score_delta: analysis.changes_summary?.score_delta ?? null,
      progress: analysis.changes_summary?.progress ?? null,
      created_at: analysis.created_at,
      is_baseline: !analysis.parent_analysis_id,
    }));

    return NextResponse.json({
      page,
      history,
      total_scans: history.length,
    });
  } catch (err) {
    console.error("Page history GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
