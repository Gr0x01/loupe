import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { FOUNDING_50_CAP, BASE_PAGE_LIMIT } from "@/lib/constants";

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
      created_at: string;
    } | null;

    // Transform pages
    const pagesFormatted = (pages || []).map((page) => {
      const lastScan = page.analyses as unknown as AnalysisJoin;

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
              created_at: lastScan.created_at,
            }
          : null,
      };
    });

    return NextResponse.json({ pages: pagesFormatted });
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

    const supabase = createServiceClient();
    const normalizedUrl = parsedUrl.toString();

    // Get user profile to check page limit and founding status
    const { data: profile } = await supabase
      .from("profiles")
      .select("bonus_pages, is_founding_50")
      .eq("id", user.id)
      .single();

    const bonusPages = profile?.bonus_pages ?? 0;
    const isFounder = profile?.is_founding_50 ?? false;
    const maxPages = BASE_PAGE_LIMIT + bonusPages;

    // Count current pages
    const { count: pageCount } = await supabase
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const currentPageCount = pageCount ?? 0;

    // Check page limit
    if (currentPageCount >= maxPages) {
      return NextResponse.json(
        {
          error: "page_limit_reached",
          current: currentPageCount,
          max: maxPages,
        },
        { status: 403 }
      );
    }

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

    // If this is the user's first page and founding 50 cap not reached, mark as founding member
    let wasJustMarkedFounder = false;
    if (currentPageCount === 0 && !isFounder) {
      const { count: founderCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("is_founding_50", true);

      if ((founderCount ?? 0) < FOUNDING_50_CAP) {
        await supabase
          .from("profiles")
          .update({ is_founding_50: true })
          .eq("id", user.id);
        wasJustMarkedFounder = true;
      }
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

    // Determine scan frequency: Founding 50 get daily, others get weekly
    const validFrequencies = ["weekly", "daily", "manual"];
    let frequency: string;
    if (scan_frequency && validFrequencies.includes(scan_frequency)) {
      frequency = scan_frequency;
    } else {
      // Default: daily for founding members, weekly for others
      const effectivelyFounder = isFounder || wasJustMarkedFounder;
      frequency = effectivelyFounder ? "daily" : "weekly";
    }

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
