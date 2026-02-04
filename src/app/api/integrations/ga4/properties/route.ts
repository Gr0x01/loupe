import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { listGA4Properties, getValidAccessToken } from "@/lib/google-oauth";

// GET /api/integrations/ga4/properties - list available GA4 properties
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Fetch properties from GA4 Admin API
    const properties = await listGA4Properties(accessToken);

    return NextResponse.json({ properties });
  } catch (err) {
    console.error("Failed to list GA4 properties:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to list properties" },
      { status: 500 }
    );
  }
}
