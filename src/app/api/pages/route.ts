import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const MAX_URL_LENGTH = 2048;

/**
 * GET /api/pages - List user's monitored pages with latest scan info
 */
export async function GET() {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Get pages with their latest scan info
    const { data: pages, error } = await supabase
      .from("pages")
      .select(`
        id,
        url,
        name,
        scan_frequency,
        last_scan_id,
        created_at,
        analyses:last_scan_id (
          id,
          status,
          structured_output,
          created_at,
          parent_analysis_id
        )
      `)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch pages:", error);
      return NextResponse.json(
        { error: "Failed to fetch pages" },
        { status: 500 }
      );
    }

    // Type for the joined analysis
    type AnalysisJoin = {
      id: string;
      status: string;
      structured_output: { overallScore: number } | null;
      created_at: string;
      parent_analysis_id: string | null;
    } | null;

    // Collect all parent analysis IDs for batch fetch
    const parentIds = (pages || [])
      .map((p) => (p.analyses as unknown as AnalysisJoin)?.parent_analysis_id)
      .filter((id): id is string => id !== null && id !== undefined);

    // Batch fetch all parent analyses in one query
    let parentScoreMap = new Map<string, number | null>();
    if (parentIds.length > 0) {
      const { data: parents } = await supabase
        .from("analyses")
        .select("id, structured_output")
        .in("id", parentIds);

      parentScoreMap = new Map(
        (parents || []).map((p) => [
          p.id,
          (p.structured_output as { overallScore?: number } | null)?.overallScore ?? null,
        ])
      );
    }

    // Transform pages with delta info
    const pagesWithDeltas = (pages || []).map((page) => {
      const lastScan = page.analyses as unknown as AnalysisJoin;
      const previousScore = lastScan?.parent_analysis_id
        ? parentScoreMap.get(lastScan.parent_analysis_id) ?? null
        : null;

      return {
        id: page.id,
        url: page.url,
        name: page.name,
        scan_frequency: page.scan_frequency,
        created_at: page.created_at,
        last_scan: lastScan
          ? {
              id: lastScan.id,
              status: lastScan.status,
              score: lastScan.structured_output?.overallScore ?? null,
              previous_score: previousScore,
              created_at: lastScan.created_at,
            }
          : null,
      };
    });

    return NextResponse.json({ pages: pagesWithDeltas });
  } catch (err) {
    console.error("Pages GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pages - Register a URL to monitor
 */
export async function POST(req: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { url, name, scan_frequency } = await req.json();

    // Validate URL
    if (!url || typeof url !== "string" || url.length > MAX_URL_LENGTH) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block non-HTTP protocols and internal hosts
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    const hostname = parsedUrl.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.") ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Validate scan_frequency
    const validFrequencies = ["weekly", "daily", "manual"];
    const frequency = validFrequencies.includes(scan_frequency)
      ? scan_frequency
      : "weekly";

    const supabase = createServiceClient();
    const normalizedUrl = parsedUrl.toString();

    // Check if page already exists for this user
    const { data: existing } = await supabase
      .from("pages")
      .select("id")
      .eq("user_id", user.id)
      .eq("url", normalizedUrl)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Page already registered", id: existing.id },
        { status: 409 }
      );
    }

    // Check if user has an existing analysis for this URL to link
    const { data: existingAnalysis } = await supabase
      .from("analyses")
      .select("id")
      .eq("user_id", user.id)
      .eq("url", normalizedUrl)
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // Create page record
    const { data: page, error } = await supabase
      .from("pages")
      .insert({
        user_id: user.id,
        url: normalizedUrl,
        name: name || null,
        scan_frequency: frequency,
        last_scan_id: existingAnalysis?.id || null,
      })
      .select("id, url, name, scan_frequency, last_scan_id, created_at")
      .single();

    if (error) {
      console.error("Failed to create page:", error);
      return NextResponse.json(
        { error: "Failed to create page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ page });
  } catch (err) {
    console.error("Pages POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
