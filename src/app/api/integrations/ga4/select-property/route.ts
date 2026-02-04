import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getValidAccessToken } from "@/lib/google-oauth";

const GA4_DATA_API_URL = "https://analyticsdata.googleapis.com/v1beta";

// POST /api/integrations/ga4/select-property - select a GA4 property
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { property_id, property_name } = body;

  // Validate property_id is numeric to prevent path injection
  if (!property_id || !/^\d+$/.test(property_id)) {
    return NextResponse.json({ error: "Invalid property_id format" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  // Get GA4 integration
  const { data: integration, error: fetchError } = await serviceClient
    .from("integrations")
    .select("id, access_token, metadata")
    .eq("user_id", user.id)
    .eq("provider", "ga4")
    .maybeSingle();

  if (fetchError) {
    console.error("Failed to fetch GA4 integration:", fetchError);
    return NextResponse.json({ error: "Failed to fetch integration" }, { status: 500 });
  }

  if (!integration) {
    return NextResponse.json({ error: "GA4 not connected" }, { status: 404 });
  }

  try {
    // Get valid access token, refreshing if needed
    const { accessToken } = await getValidAccessToken(
      { id: integration.id, access_token: integration.access_token, metadata: integration.metadata || {} },
      serviceClient
    );

    // Validate by making a test query to the GA4 Data API
    const testRes = await fetch(
      `${GA4_DATA_API_URL}/properties/${property_id}:runReport`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
          dimensions: [{ name: "date" }],
          metrics: [{ name: "screenPageViews" }],
          limit: 1,
        }),
      }
    );

    if (!testRes.ok) {
      const errorText = await testRes.text();
      console.error("GA4 test query failed:", errorText);

      // Check for specific errors
      if (testRes.status === 403) {
        return NextResponse.json(
          { error: "Access denied. Make sure you have access to this property." },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: "Failed to access this property. Please check permissions." },
        { status: 400 }
      );
    }

    // Fetch current metadata to preserve all fields (token may have been refreshed)
    const { data: current } = await serviceClient
      .from("integrations")
      .select("metadata")
      .eq("id", integration.id)
      .single();

    // Update integration with selected property
    const { error: updateError } = await serviceClient
      .from("integrations")
      .update({
        access_token: accessToken,
        metadata: {
          ...current?.metadata,
          property_id,
          property_name: property_name || property_id,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", integration.id);

    if (updateError) {
      console.error("Failed to update GA4 integration:", updateError);
      return NextResponse.json({ error: "Failed to save property selection" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to select GA4 property:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to select property" },
      { status: 500 }
    );
  }
}
