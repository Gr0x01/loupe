import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type {
  AttentionStatus,
  ChangesSummary,
  AnalysisResult,
} from "@/lib/types/analysis";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";
import { validateUrl, isBlockedDomain } from "@/lib/url-validation";
import {
  getPageLimit,
  getEffectiveTier,
  validateScanFrequency,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/permissions";

const MAX_URL_LENGTH = 2048;

/**
 * Compute attention status for a page based on its last scan data.
 * Priority order:
 * 1. scan_failed — high severity
 * 2. no_scans_yet — low severity
 * 3. negative_correlation — high severity
 * 4. recent_change — medium severity
 * 5. high_impact_suggestions — medium severity
 * 6. Default: stable (no attention needed)
 */
function computeAttentionStatus(
  lastScan: {
    status: string;
    created_at: string;
    changes_summary: ChangesSummary | null;
    structured_output: AnalysisResult["structured"] | null;
    parent_analysis_id: string | null;
  } | null
): AttentionStatus {
  // No scan data at all
  if (!lastScan) {
    return {
      needs_attention: true,
      reason: "no_scans_yet",
      headline: "No scans yet",
      subheadline: "Run your first audit to start tracking",
      severity: "low",
    };
  }

  // Scan failed
  if (lastScan.status === "failed") {
    return {
      needs_attention: true,
      reason: "scan_failed",
      headline: "Last scan failed",
      subheadline: "Check the page is accessible",
      severity: "high",
    };
  }

  // Still processing — don't flag as attention yet
  if (lastScan.status === "processing" || lastScan.status === "pending") {
    return {
      needs_attention: false,
      reason: null,
      headline: null,
      subheadline: null,
      severity: null,
    };
  }

  const changesSummary = lastScan.changes_summary;

  // Check for N+1 scan with chronicle data
  if (changesSummary && lastScan.parent_analysis_id) {
    // Check for negative correlation (regressed metrics)
    const correlation = changesSummary.correlation;
    if (correlation?.hasEnoughData && correlation.metrics) {
      const regressedMetric = correlation.metrics.find(
        (m) => m.assessment === "regressed"
      );
      if (regressedMetric) {
        const changeDate = new Date(lastScan.created_at);
        const dayName = changeDate.toLocaleDateString("en-US", { weekday: "long" });
        return {
          needs_attention: true,
          reason: "negative_correlation",
          headline: `Change detected ${dayName}`,
          subheadline: `${regressedMetric.friendlyName} ${regressedMetric.change}`,
          severity: "high",
        };
      }
    }

    // Check for watching items (recent changes collecting data)
    const progress = changesSummary.progress;
    if (progress?.watching && progress.watching > 0 && changesSummary.changes?.length > 0) {
      const firstChange = changesSummary.changes[0];
      return {
        needs_attention: true,
        reason: "recent_change",
        headline: firstChange?.element
          ? `${firstChange.element} changed`
          : "Change detected",
        subheadline: `Watching for impact (${progress.watching} item${progress.watching > 1 ? "s" : ""})`,
        severity: "medium",
      };
    }

    // Check for open high-impact suggestions
    const highImpactSuggestions = changesSummary.suggestions?.filter(
      (s) => s.impact === "high"
    );
    if (highImpactSuggestions && highImpactSuggestions.length > 0) {
      return {
        needs_attention: true,
        reason: "high_impact_suggestions",
        headline: `${highImpactSuggestions.length} high-impact suggestion${highImpactSuggestions.length > 1 ? "s" : ""}`,
        subheadline: highImpactSuggestions[0].title,
        severity: "medium",
      };
    }
  }

  // Check initial audit for high-impact findings
  const structuredOutput = lastScan.structured_output;
  if (structuredOutput && !lastScan.parent_analysis_id) {
    const highImpactFindings = structuredOutput.findings?.filter(
      (f) => f.impact === "high"
    );
    if (highImpactFindings && highImpactFindings.length > 0) {
      return {
        needs_attention: true,
        reason: "high_impact_suggestions",
        headline: `${highImpactFindings.length} high-impact issue${highImpactFindings.length > 1 ? "s" : ""}`,
        subheadline: highImpactFindings[0].title,
        severity: "medium",
      };
    }
  }

  // Default: stable, no attention needed
  return {
    needs_attention: false,
    reason: null,
    headline: null,
    subheadline: null,
    severity: null,
  };
}

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

    // Get pages with their latest scan info including changes_summary for attention status
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
          changes_summary,
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
      changes_summary: ChangesSummary | null;
      structured_output: AnalysisResult["structured"] | null;
      parent_analysis_id: string | null;
    } | null;

    // Transform pages with attention status
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
        attention_status: computeAttentionStatus(lastScan),
      };
    });

    return NextResponse.json({ pages: pagesFormatted }, {
      headers: {
        "Cache-Control": "private, max-age=10, stale-while-revalidate=60",
      },
    });
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

    // Rate limiting
    const rateLimit = checkRateLimit(
      rateLimitKey(user.id, "pages"),
      RATE_LIMITS.pages
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

    // SSRF protection with shared validation
    const validation = validateUrl(parsedUrl.toString());
    if (!validation.valid) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block major domains that users don't own
    if (isBlockedDomain(parsedUrl.toString())) {
      return NextResponse.json(
        { error: "This domain cannot be monitored. Loupe is designed for sites you own." },
        { status: 403 }
      );
    }

    const supabase = createServiceClient();
    const normalizedUrl = parsedUrl.toString();

    // Get user profile to check page limit and tier
    const { data: profile } = await supabase
      .from("profiles")
      .select("bonus_pages, is_founding_50, subscription_tier, subscription_status")
      .eq("id", user.id)
      .single();

    const bonusPages = profile?.bonus_pages ?? 0;
    const isFounder = profile?.is_founding_50 ?? false;
    const rawTier = (profile?.subscription_tier as SubscriptionTier) || "free";
    const status = profile?.subscription_status as SubscriptionStatus | null;
    const tier = getEffectiveTier(rawTier, status);
    const maxPages = getPageLimit(tier, bonusPages);

    // Count current pages
    const { count: pageCount } = await supabase
      .from("pages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const currentPageCount = pageCount ?? 0;

    // If this is the user's first page and not already a founder, attempt atomic claim
    // Do this BEFORE the page limit check so we use the correct tier limits
    let wasJustMarkedFounder = false;
    if (currentPageCount === 0 && !isFounder) {
      // Atomic RPC prevents race condition when multiple requests try to claim simultaneously
      const { data: claimed } = await supabase.rpc("claim_founding_50", {
        p_user_id: user.id,
      });
      wasJustMarkedFounder = claimed === true;
    }

    // Calculate effective tier and page limit (accounting for just-claimed founding status)
    const effectiveTier: SubscriptionTier = wasJustMarkedFounder ? "starter" : tier;
    const effectiveMaxPages = getPageLimit(effectiveTier, bonusPages);

    // Check page limit
    if (currentPageCount >= effectiveMaxPages) {
      return NextResponse.json(
        {
          error: "page_limit_reached",
          current: currentPageCount,
          max: effectiveMaxPages,
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

    // Determine scan frequency based on tier
    // Free tier can only use weekly; Starter/Pro can use daily
    // Founding 50 are on Starter tier, so they get daily
    const frequency = validateScanFrequency(
      effectiveTier,
      scan_frequency || (effectiveTier === "free" ? "weekly" : "daily")
    );

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
