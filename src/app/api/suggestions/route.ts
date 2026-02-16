import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/suggestions?page_id=<uuid>
 * Fetch open tracked suggestions for a page.
 */
export async function GET(req: NextRequest) {
  try {
    const authClient = await createClient();
    const { data: { user } } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pageId = req.nextUrl.searchParams.get("page_id");
    if (!pageId || !UUID_RE.test(pageId)) {
      return NextResponse.json({ error: "Valid page_id required" }, { status: 400 });
    }

    const supabase = createServiceClient();

    const { data: suggestions, error } = await supabase
      .from("tracked_suggestions")
      .select("*")
      .eq("page_id", pageId)
      .eq("user_id", user.id)
      .eq("status", "open")
      .order("impact", { ascending: true })
      .order("times_suggested", { ascending: false });

    if (error) {
      console.error("Suggestions fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch suggestions" }, { status: 500 });
    }

    return NextResponse.json({ suggestions: suggestions || [] });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
