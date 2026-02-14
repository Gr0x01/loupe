import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import { checkRateLimit, rateLimitKey, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Require auth
    const authClient = await createClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting
    const rateLimit = checkRateLimit(
      rateLimitKey(user.id, "rescan"),
      RATE_LIMITS.rescan
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

    const { parentAnalysisId, pageId } = await req.json();

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Reject ambiguous requests
    if (parentAnalysisId && pageId) {
      return NextResponse.json(
        { error: "Provide either pageId or parentAnalysisId, not both" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Branch 1: pageId-based first scan (no parent analysis)
    if (pageId && typeof pageId === "string" && UUID_RE.test(pageId)) {
      // Validate page exists and belongs to user
      const { data: page, error: pageError } = await supabase
        .from("pages")
        .select("id, url, user_id")
        .eq("id", pageId)
        .single();

      if (pageError || !page) {
        return NextResponse.json(
          { error: "Page not found" },
          { status: 404 }
        );
      }

      if (page.user_id !== user.id) {
        return NextResponse.json(
          { error: "Page not found" },
          { status: 404 }
        );
      }

      // Create a fresh analysis (no parent)
      const { data: newAnalysis, error: insertError } = await supabase
        .from("analyses")
        .insert({
          url: page.url,
          user_id: user.id,
          trigger_type: "manual",
          status: "pending",
        })
        .select("id")
        .single();

      if (insertError || !newAnalysis) {
        console.error("Failed to create first-scan analysis:", insertError);
        return NextResponse.json(
          { error: "Failed to create scan" },
          { status: 500 }
        );
      }

      // Update last_scan_id on the page
      const { error: updateError } = await supabase
        .from("pages")
        .update({ last_scan_id: newAnalysis.id })
        .eq("id", page.id);

      if (updateError) {
        console.error("Failed to update last_scan_id for first scan:", updateError);
      }

      // Fire Inngest event
      await inngest.send({
        name: "analysis/created",
        data: {
          analysisId: newAnalysis.id,
          url: page.url,
        },
      });

      return NextResponse.json({ id: newAnalysis.id });
    }

    // Branch 2: parentAnalysisId-based rescan (existing flow)
    if (!parentAnalysisId || typeof parentAnalysisId !== "string" || !UUID_RE.test(parentAnalysisId)) {
      return NextResponse.json(
        { error: "parentAnalysisId or pageId is required" },
        { status: 400 }
      );
    }

    // Validate parent exists, belongs to user, and is complete
    const { data: parent, error: parentError } = await supabase
      .from("analyses")
      .select("id, url, status, user_id")
      .eq("id", parentAnalysisId)
      .single();

    if (parentError || !parent) {
      return NextResponse.json(
        { error: "Parent analysis not found" },
        { status: 404 }
      );
    }

    // Verify ownership - user can only rescan their own analyses
    if (parent.user_id && parent.user_id !== user.id) {
      return NextResponse.json(
        { error: "Parent analysis not found" },
        { status: 404 }
      );
    }

    if (parent.status !== "complete") {
      return NextResponse.json(
        { error: "Parent analysis is not complete" },
        { status: 400 }
      );
    }

    // Create new analysis row with parent reference
    const { data: newAnalysis, error: insertError } = await supabase
      .from("analyses")
      .insert({
        url: parent.url,
        user_id: user.id,
        parent_analysis_id: parentAnalysisId,
        trigger_type: "manual",
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !newAnalysis) {
      console.error("Failed to create re-scan analysis:", insertError);
      return NextResponse.json(
        { error: "Failed to create re-scan" },
        { status: 500 }
      );
    }

    // Auto-register page if it doesn't exist, or update last_scan_id for existing
    const { data: existingPage } = await supabase
      .from("pages")
      .select("id")
      .eq("user_id", user.id)
      .eq("url", parent.url)
      .single();

    if (!existingPage) {
      const { error: pageInsertError } = await supabase.from("pages").insert({
        user_id: user.id,
        url: parent.url,
        scan_frequency: "weekly",
        last_scan_id: newAnalysis.id, // Point to new scan so it appears in history immediately
      });
      if (pageInsertError) {
        // Non-fatal: page might already exist due to race condition
        console.warn("Auto-register page failed:", pageInsertError.message);
      }
    } else {
      // Update last_scan_id immediately so new scan appears in history
      await supabase
        .from("pages")
        .update({ last_scan_id: newAnalysis.id })
        .eq("id", existingPage.id);
    }

    // Trigger Inngest with parent reference
    await inngest.send({
      name: "analysis/created",
      data: {
        analysisId: newAnalysis.id,
        url: parent.url,
        parentAnalysisId,
      },
    });

    return NextResponse.json({ id: newAnalysis.id });
  } catch (err) {
    console.error("Rescan route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
