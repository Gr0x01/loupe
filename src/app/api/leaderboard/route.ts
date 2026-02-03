import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface LeaderboardEntry {
  rank: number;
  analysis_id: string;
  url: string;
  domain: string;
  score: number;
  improvement?: number;
  first_score?: number;
  screenshot_url: string | null;
  created_at: string;
}

function getDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

/**
 * GET /api/leaderboard - Public endpoint returning leaderboard entries
 *
 * Query params:
 * - category: 'top_scores' | 'most_improved' (default: top_scores)
 * - period: 'month' | 'all_time' (default: all_time)
 * - limit: number (default: 20)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category") || "top_scores";
    const period = searchParams.get("period") || "all_time";
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    if (!["top_scores", "most_improved"].includes(category)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    if (!["month", "all_time"].includes(period)) {
      return NextResponse.json({ error: "Invalid period" }, { status: 400 });
    }

    const supabase = createServiceClient();

    let entries: LeaderboardEntry[];
    if (category === "top_scores") {
      entries = await getTopScores(supabase, period, limit);
    } else {
      entries = await getMostImproved(supabase, period, limit);
    }

    // Return with cache headers (public, 60s cache, 5min stale-while-revalidate)
    const response = NextResponse.json({ entries, total: entries.length });
    response.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return response;
  } catch (err) {
    console.error("Leaderboard error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function getTopScores(
  supabase: ReturnType<typeof createServiceClient>,
  period: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  // Raw SQL query for top scores
  // Include analyses where:
  // 1. No matching page record exists (anonymous audits), OR
  // 2. Page exists but hide_from_leaderboard is false
  const { data, error } = await supabase.rpc("get_leaderboard_top_scores", {
    period_filter: period,
    result_limit: limit,
  });

  if (error) {
    // Fallback to direct query if RPC doesn't exist
    console.error("RPC error, using fallback query:", error);
    return getTopScoresFallback(supabase, period, limit);
  }

  return (data || []).map((row: any, index: number) => ({
    rank: index + 1,
    analysis_id: row.analysis_id,
    url: row.url,
    domain: getDomain(row.url),
    score: row.score,
    screenshot_url: row.screenshot_url,
    created_at: row.created_at,
  }));
}

async function getTopScoresFallback(
  supabase: ReturnType<typeof createServiceClient>,
  period: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  // Get all complete analyses with scores
  let query = supabase
    .from("analyses")
    .select("id, url, user_id, screenshot_url, structured_output, created_at")
    .eq("status", "complete")
    .not("structured_output", "is", null)
    .order("created_at", { ascending: false });

  if (period === "month") {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    query = query.gte("created_at", startOfMonth.toISOString());
  }

  const { data: analyses, error: analysisError } = await query;

  if (analysisError) {
    console.error("Analysis query error:", analysisError);
    return [];
  }

  // Get hidden pages for filtering
  const { data: hiddenPages } = await supabase
    .from("pages")
    .select("url, user_id")
    .eq("hide_from_leaderboard", true);

  const hiddenSet = new Set(
    (hiddenPages || []).map((p) => `${p.url}:${p.user_id}`)
  );

  // Filter, dedupe by URL (keep best score), and sort
  const allEntries = (analyses || [])
    .filter((a) => {
      // Include if not in hidden set (either no page or not hidden)
      const key = `${a.url}:${a.user_id}`;
      return !hiddenSet.has(key);
    })
    .map((a) => ({
      analysis_id: a.id,
      url: a.url,
      score: (a.structured_output as any)?.overallScore ?? 0,
      screenshot_url: a.screenshot_url,
      created_at: a.created_at,
    }))
    .filter((a) => a.score > 0);

  // Dedupe by URL - keep highest score for each URL
  const bestByUrl = new Map<string, typeof allEntries[0]>();
  for (const entry of allEntries) {
    const existing = bestByUrl.get(entry.url);
    if (!existing || entry.score > existing.score) {
      bestByUrl.set(entry.url, entry);
    }
  }

  const entries = Array.from(bestByUrl.values())
    .sort((a, b) => b.score - a.score || new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(0, limit);

  return entries.map((e, index) => ({
    rank: index + 1,
    analysis_id: e.analysis_id,
    url: e.url,
    domain: getDomain(e.url),
    score: e.score,
    screenshot_url: e.screenshot_url,
    created_at: e.created_at,
  }));
}

async function getMostImproved(
  supabase: ReturnType<typeof createServiceClient>,
  period: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  // Try RPC first
  const { data, error } = await supabase.rpc("get_leaderboard_most_improved", {
    period_filter: period,
    result_limit: limit,
  });

  if (error) {
    console.error("RPC error, using fallback query:", error);
    return getMostImprovedFallback(supabase, period, limit);
  }

  return (data || []).map((row: any, index: number) => ({
    rank: index + 1,
    analysis_id: row.analysis_id,
    url: row.url,
    domain: getDomain(row.url),
    score: row.latest_score,
    first_score: row.first_score,
    improvement: row.improvement,
    screenshot_url: row.screenshot_url,
    created_at: row.created_at,
  }));
}

async function getMostImprovedFallback(
  supabase: ReturnType<typeof createServiceClient>,
  period: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  // Get all complete analyses with scores
  let query = supabase
    .from("analyses")
    .select("id, url, user_id, screenshot_url, structured_output, created_at")
    .eq("status", "complete")
    .not("structured_output", "is", null)
    .order("created_at", { ascending: true }); // Oldest first for grouping

  const { data: analyses, error: analysisError } = await query;

  if (analysisError) {
    console.error("Analysis query error:", analysisError);
    return [];
  }

  // Get hidden pages for filtering
  const { data: hiddenPages } = await supabase
    .from("pages")
    .select("url, user_id")
    .eq("hide_from_leaderboard", true);

  const hiddenSet = new Set(
    (hiddenPages || []).map((p) => `${p.url}:${p.user_id}`)
  );

  // Group by URL+user_id to find first and latest scores
  const urlGroups = new Map<string, {
    first: { id: string; score: number; created_at: string };
    latest: { id: string; score: number; screenshot_url: string | null; created_at: string };
    url: string;
  }>();

  for (const a of analyses || []) {
    const key = `${a.url}:${a.user_id}`;

    // Skip if hidden
    if (hiddenSet.has(key)) continue;

    const score = (a.structured_output as any)?.overallScore ?? 0;
    if (score <= 0) continue;

    const entry = urlGroups.get(key);
    if (!entry) {
      urlGroups.set(key, {
        first: { id: a.id, score, created_at: a.created_at },
        latest: { id: a.id, score, screenshot_url: a.screenshot_url, created_at: a.created_at },
        url: a.url,
      });
    } else {
      // Update latest (analyses are ordered by created_at asc, so each new one is later)
      entry.latest = { id: a.id, score, screenshot_url: a.screenshot_url, created_at: a.created_at };
    }
  }

  // Filter by period for latest scan date
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  // Calculate improvement and filter
  const improved = Array.from(urlGroups.values())
    .filter((g) => {
      // Must have improvement
      if (g.latest.score <= g.first.score) return false;
      // Period filter on latest scan
      if (period === "month" && new Date(g.latest.created_at) < startOfMonth) return false;
      return true;
    })
    .map((g) => ({
      url: g.url,
      analysis_id: g.latest.id,
      first_score: g.first.score,
      latest_score: g.latest.score,
      improvement: g.latest.score - g.first.score,
      screenshot_url: g.latest.screenshot_url,
      created_at: g.latest.created_at,
    }))
    .sort((a, b) => b.improvement - a.improvement)
    .slice(0, limit);

  return improved.map((e, index) => ({
    rank: index + 1,
    analysis_id: e.analysis_id,
    url: e.url,
    domain: getDomain(e.url),
    score: e.latest_score,
    first_score: e.first_score,
    improvement: e.improvement,
    screenshot_url: e.screenshot_url,
    created_at: e.created_at,
  }));
}
