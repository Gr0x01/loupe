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
      .select("id, url, name, scan_frequency, repo_id, created_at, last_scan_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Build history by following the last_scan_id chain
    // This handles cases where analyses may have been created before user auth
    const analyses: Array<{
      id: string;
      url: string;
      status: string;
      changes_summary: { progress?: unknown } | null;
      created_at: string;
      parent_analysis_id: string | null;
    }> = [];

    // Start from last_scan_id and follow parent_analysis_id chain
    let currentId = page.last_scan_id;
    const seenIds = new Set<string>();

    while (currentId && !seenIds.has(currentId)) {
      seenIds.add(currentId);

      const { data: analysis } = await supabase
        .from("analyses")
        .select(`
          id,
          url,
          status,
          changes_summary,
          created_at,
          parent_analysis_id
        `)
        .eq("id", currentId)
        .single();

      if (analysis) {
        analyses.push(analysis);
        currentId = analysis.parent_analysis_id;
      } else {
        break;
      }
    }

    console.log("[history] Found", analyses.length, "analyses via last_scan_id chain");

    // Format the history with status and changes preview
    const history = analyses.map((analysis, index) => ({
      id: analysis.id,
      scan_number: (analyses?.length || 0) - index,
      status: analysis.status,
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
