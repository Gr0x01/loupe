import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

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

    const { parentAnalysisId } = await req.json();

    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!parentAnalysisId || typeof parentAnalysisId !== "string" || !UUID_RE.test(parentAnalysisId)) {
      return NextResponse.json(
        { error: "parentAnalysisId is required" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Validate parent exists and is complete
    const { data: parent, error: parentError } = await supabase
      .from("analyses")
      .select("id, url, status")
      .eq("id", parentAnalysisId)
      .single();

    if (parentError || !parent) {
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

    // Auto-register page if it doesn't exist
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
        last_scan_id: parentAnalysisId, // Link to parent, will be updated when new scan completes
      });
      if (pageInsertError) {
        // Non-fatal: page might already exist due to race condition
        console.warn("Auto-register page failed:", pageInsertError.message);
      }
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
