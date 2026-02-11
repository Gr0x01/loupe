import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/pages/[id]/history - Get scan history for a page
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const parsed = parseInt(searchParams.get("limit") || "100", 10);
    const limit = Math.min(Math.max(Number.isNaN(parsed) ? 100 : parsed, 1), 100);

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

    // Single RPC call replaces N+1 while loop
    // The RPC function walks the parent_analysis_id chain with user_id security check
    const { data: analyses, error: chainError } = await supabase.rpc("get_analysis_chain", {
      p_start_id: page.last_scan_id,
      p_user_id: user.id,
    });

    if (chainError) {
      console.error("Failed to fetch analysis chain:", chainError);
      return NextResponse.json(
        { error: "Failed to fetch history" },
        { status: 500 }
      );
    }


    // Type for the RPC response
    type AnalysisChainRow = {
      id: string;
      url: string;
      status: string;
      changes_summary: { progress?: unknown } | null;
      created_at: string;
      parent_analysis_id: string | null;
    };

    const analysisRows = (analyses || []) as AnalysisChainRow[];
    const limitedRows = analysisRows.slice(0, limit);

    // Format the history with status and changes preview
    // scan_number is relative to total, not limited results
    const totalCount = analysisRows.length;
    const history = limitedRows.map((analysis, index) => ({
      id: analysis.id,
      scan_number: totalCount - index,
      status: analysis.status,
      progress: analysis.changes_summary?.progress ?? null,
      created_at: analysis.created_at,
      is_baseline: !analysis.parent_analysis_id,
    }));

    return NextResponse.json({
      page,
      history,
      total_scans: totalCount,
    }, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("Page history GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
