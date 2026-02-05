import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * GET /api/pages/[id] - Get a single page with its details
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

    const { data: page, error } = await supabase
      .from("pages")
      .select(`
        id,
        url,
        name,
        scan_frequency,
        repo_id,
        last_scan_id,
        created_at,
        analyses:last_scan_id (
          id,
          status,
          structured_output,
          created_at
        )
      `)
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    return NextResponse.json({ page });
  } catch (err) {
    console.error("Page GET error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/pages/[id] - Update page settings
 */
export async function PATCH(
  req: NextRequest,
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

    const { name, scan_frequency, repo_id } = await req.json();

    const supabase = createServiceClient();

    // Verify ownership
    const { data: existing } = await supabase
      .from("pages")
      .select("id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Build update object
    const updates: {
      name?: string | null;
      scan_frequency?: string;
      repo_id?: string | null;
    } = {};

    if (name !== undefined) {
      updates.name = name || null;
    }
    if (scan_frequency !== undefined) {
      const validFrequencies = ["weekly", "daily", "manual"];
      if (validFrequencies.includes(scan_frequency)) {
        updates.scan_frequency = scan_frequency;
      }
    }
    if (repo_id !== undefined) {
      updates.repo_id = repo_id || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
    }

    const { data: page, error } = await supabase
      .from("pages")
      .update(updates)
      .eq("id", id)
      .select("id, url, name, scan_frequency, repo_id, last_scan_id, created_at")
      .single();

    if (error) {
      console.error("Failed to update page:", error);
      return NextResponse.json(
        { error: "Failed to update page" },
        { status: 500 }
      );
    }

    return NextResponse.json({ page });
  } catch (err) {
    console.error("Page PATCH error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/pages/[id] - Stop monitoring a page
 */
export async function DELETE(
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

    // Get page first to capture URL for cleanup
    const { data: page } = await supabase
      .from("pages")
      .select("id, url")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Delete all analyses for this page
    await supabase
      .from("analyses")
      .delete()
      .eq("user_id", user.id)
      .eq("url", page.url);

    // Delete the page
    const { error } = await supabase
      .from("pages")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: "Failed to delete page" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Page DELETE error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
