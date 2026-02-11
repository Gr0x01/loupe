import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revokeGoogleToken } from "@/lib/google-oauth";
import { safeDecrypt } from "@/lib/crypto";

// DELETE /api/integrations/ga4 - disconnect GA4
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Fetch token before deleting so we can revoke it
  const { data: integration } = await serviceClient
    .from("integrations")
    .select("access_token")
    .eq("user_id", user.id)
    .eq("provider", "ga4")
    .maybeSingle();

  // Revoke token with Google (best effort)
  // Note: access_token is encrypted in DB, must decrypt before sending to Google
  if (integration?.access_token) {
    await revokeGoogleToken(safeDecrypt(integration.access_token));
  }

  const { error } = await serviceClient
    .from("integrations")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", "ga4");

  if (error) {
    console.error("Failed to disconnect GA4:", error);
    return NextResponse.json({ error: "Failed to disconnect" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
