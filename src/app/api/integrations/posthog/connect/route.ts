import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { validateCredentials } from "@/lib/posthog-api";

/**
 * POST /api/integrations/posthog/connect
 * Connect PostHog by validating and storing API credentials
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { apiKey, projectId, host } = body;

    if (!apiKey || !projectId) {
      return NextResponse.json(
        { error: "API key and Project ID are required" },
        { status: 400 }
      );
    }

    // Validate credentials by running a test query
    const validation = await validateCredentials({
      apiKey,
      projectId,
      host,
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid credentials" },
        { status: 400 }
      );
    }

    const serviceClient = createServiceClient();

    // Check if PostHog is already connected
    const { data: existing } = await serviceClient
      .from("integrations")
      .select("id")
      .eq("user_id", user.id)
      .eq("provider", "posthog")
      .maybeSingle();

    if (existing) {
      // Update existing integration
      const { error: updateError } = await serviceClient
        .from("integrations")
        .update({
          provider_account_id: projectId,
          access_token: apiKey,
          metadata: { host: host || "https://us.i.posthog.com" },
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        console.error("Failed to update PostHog integration:", updateError);
        return NextResponse.json(
          { error: "Failed to update integration" },
          { status: 500 }
        );
      }
    } else {
      // Create new integration
      const { error: insertError } = await serviceClient
        .from("integrations")
        .insert({
          user_id: user.id,
          provider: "posthog",
          provider_account_id: projectId,
          access_token: apiKey,
          metadata: { host: host || "https://us.i.posthog.com" },
        });

      if (insertError) {
        console.error("Failed to create PostHog integration:", insertError);
        return NextResponse.json(
          { error: "Failed to save integration" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("PostHog connect error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
