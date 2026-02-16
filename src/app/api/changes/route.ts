import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { DetectedChange, CorrelationMetrics, ChangesApiResponse } from "@/lib/types/analysis";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

// Database row type with page join
interface DetectedChangeRow {
  id: string;
  page_id: string;
  user_id: string;
  element: string;
  element_type: string | null;
  scope: "element" | "section" | "page";
  before_value: string;
  after_value: string;
  description: string | null;
  first_detected_at: string;
  first_detected_analysis_id: string | null;
  status: string;
  correlation_metrics: CorrelationMetrics | null;
  correlation_unlocked_at: string | null;
  hypothesis: string | null;
  hypothesis_at: string | null;
  observation_text: string | null;
  deploy_id: string | null;
  created_at: string;
  updated_at: string;
  pages: {
    url: string;
    name: string | null;
  } | null;
}

/**
 * GET /api/changes - Get user's validated/regressed changes for dashboard display
 *
 * Query params:
 * - status: 'validated' | 'regressed' | 'all' (default: returns validated + regressed)
 * - limit: number (default: 4 for dashboard, pass higher for full list)
 */
export async function GET(req: NextRequest) {
  try {
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      rateLimitKey(user.id, "changes"),
      RATE_LIMITS.changes
    );
    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfter) },
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status");
    const limitParam = searchParams.get("limit");
    const parsed = limitParam ? parseInt(limitParam, 10) : 4;
    const limit = Number.isNaN(parsed) ? 4 : Math.min(Math.max(parsed, 1), 50);

    // Parse cursor for pagination (base64 encoded JSON: {t: timestamp, id: string})
    const cursorParam = searchParams.get("cursor");
    let cursorData: { t: string; id: string } | null = null;
    if (cursorParam) {
      try {
        const parsed = JSON.parse(Buffer.from(cursorParam, "base64").toString());
        // Validate: t must be ISO timestamp, id must be UUID (prevent PostgREST filter injection)
        if (
          typeof parsed.t === "string" &&
          /^\d{4}-\d{2}-\d{2}T[\d:.]+Z?$/.test(parsed.t) &&
          typeof parsed.id === "string" &&
          /^[0-9a-f-]{36}$/i.test(parsed.id)
        ) {
          cursorData = parsed;
        }
      } catch {
        // Invalid cursor, ignore
      }
    }

    const supabase = createServiceClient();

    // Build query for detected_changes
    let query = supabase
      .from("detected_changes")
      .select(
        `
        id,
        page_id,
        user_id,
        element,
        element_type,
        scope,
        before_value,
        after_value,
        description,
        first_detected_at,
        first_detected_analysis_id,
        status,
        hypothesis,
        hypothesis_at,
        observation_text,
        correlation_metrics,
        correlation_unlocked_at,
        deploy_id,
        created_at,
        updated_at,
        pages:page_id (
          url,
          name
        )
      `
      )
      .eq("user_id", user.id);

    // Filter by status
    if (statusFilter === "validated") {
      query = query.eq("status", "validated");
    } else if (statusFilter === "regressed") {
      query = query.eq("status", "regressed");
    } else if (statusFilter === "watching") {
      query = query.eq("status", "watching");
    } else {
      // Default: get both validated and regressed
      query = query.in("status", ["validated", "regressed"]);
    }

    // Add cursor condition for pagination (composite: timestamp, id)
    if (cursorData) {
      query = query.or(
        `correlation_unlocked_at.lt.${cursorData.t},` +
        `and(correlation_unlocked_at.eq.${cursorData.t},id.lt.${cursorData.id})`
      );
    }

    // Order by correlation unlock date (most recent first), with id for tie-breaking
    // Fetch limit + 1 to detect hasMore
    query = query
      .order("correlation_unlocked_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false })
      .limit(limit + 1);

    const { data: rows, error } = await query;

    if (error) {
      console.error("Failed to fetch detected_changes:", error);
      return NextResponse.json(
        { error: "Failed to fetch changes" },
        { status: 500 }
      );
    }

    // Helper to safely extract domain from URL
    const getDomainSafe = (url: string | undefined): string | undefined => {
      if (!url) return undefined;
      try {
        return new URL(url).hostname;
      } catch {
        return url; // Return raw URL if parsing fails
      }
    };

    // Check hasMore and slice to actual limit
    const allRows = rows as unknown as DetectedChangeRow[];
    const hasMore = allRows.length > limit;
    const resultRows = hasMore ? allRows.slice(0, limit) : allRows;

    // Build next cursor from last result
    const lastRow = resultRows[resultRows.length - 1];
    const nextCursor =
      hasMore && lastRow?.correlation_unlocked_at
        ? Buffer.from(
            JSON.stringify({
              t: lastRow.correlation_unlocked_at,
              id: lastRow.id,
            })
          ).toString("base64")
        : undefined;

    // Fetch checkpoint data for these changes
    const changeIds = resultRows.map((r) => r.id);
    const checkpointsByChange: Record<string, Array<{ horizon_days: number; assessment: string; confidence: number | null; reasoning: string | null; data_sources: string[]; computed_at: string }>> = {};
    if (changeIds.length > 0) {
      const { data: checkpoints } = await supabase
        .from("change_checkpoints")
        .select("change_id, horizon_days, assessment, confidence, reasoning, data_sources, computed_at")
        .in("change_id", changeIds)
        .order("horizon_days", { ascending: true });

      if (checkpoints) {
        for (const cp of checkpoints) {
          if (!checkpointsByChange[cp.change_id]) checkpointsByChange[cp.change_id] = [];
          checkpointsByChange[cp.change_id].push({
            horizon_days: cp.horizon_days,
            assessment: cp.assessment,
            confidence: cp.confidence ?? null,
            reasoning: cp.reasoning ?? null,
            data_sources: cp.data_sources ?? [],
            computed_at: cp.computed_at,
          });
        }
      }
    }

    // Transform to DetectedChange with domain info + checkpoints
    const changes: ChangesApiResponse["changes"] =
      resultRows.map((row) => ({
        id: row.id,
        page_id: row.page_id,
        user_id: row.user_id,
        element: row.element,
        element_type: row.element_type ?? undefined,
        scope: row.scope,
        before_value: row.before_value,
        after_value: row.after_value,
        description: row.description ?? undefined,
        first_detected_at: row.first_detected_at,
        first_detected_analysis_id: row.first_detected_analysis_id ?? undefined,
        status: row.status as DetectedChange["status"],
        hypothesis: row.hypothesis ?? undefined,
        hypothesis_at: row.hypothesis_at ?? undefined,
        observation_text: row.observation_text ?? undefined,
        correlation_metrics: row.correlation_metrics ?? undefined,
        correlation_unlocked_at: row.correlation_unlocked_at ?? undefined,
        deploy_id: row.deploy_id ?? undefined,
        created_at: row.created_at,
        updated_at: row.updated_at,
        // Add domain for UI
        domain: getDomainSafe(row.pages?.url),
        page_name: row.pages?.name ?? undefined,
        checkpoints: checkpointsByChange[row.id] || undefined,
      }));

    // Optimized stats: Use database COUNT instead of fetching all rows
    const [validatedCountResult, regressedCountResult, topImprovements] =
      await Promise.all([
        supabase
          .from("detected_changes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "validated"),
        supabase
          .from("detected_changes")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("status", "regressed"),
        // Only fetch top 20 improvements for cumulative calc (avoids inflated compounding)
        supabase
          .from("detected_changes")
          .select("correlation_metrics")
          .eq("user_id", user.id)
          .eq("status", "validated")
          .order("correlation_unlocked_at", { ascending: false })
          .limit(20),
      ]);

    const totalValidated = validatedCountResult.count ?? 0;
    const totalRegressed = regressedCountResult.count ?? 0;

    let cumulativeImprovement = 0;
    if (topImprovements.data) {
      for (const row of topImprovements.data) {
        const metrics = row.correlation_metrics as CorrelationMetrics | null;
        if (metrics?.metrics) {
          const improved = metrics.metrics.find(
            (m) => m.assessment === "improved"
          );
          if (improved && improved.change_percent > 0) {
            // Compound improvements: (1 + a%) * (1 + b%) - 1
            const factor = 1 + improved.change_percent / 100;
            cumulativeImprovement =
              (1 + cumulativeImprovement / 100) * factor * 100 - 100;
          }
        }
      }
    }

    const response: ChangesApiResponse = {
      changes,
      stats: {
        totalValidated,
        totalRegressed,
        cumulativeImprovement: Math.round(cumulativeImprovement * 10) / 10,
      },
      pagination: {
        nextCursor,
        hasMore,
      },
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
      },
    });
  } catch (err) {
    console.error("Changes GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
