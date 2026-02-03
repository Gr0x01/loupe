import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";
import type { EmailOtpType } from "@supabase/supabase-js";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function handleRescan(
  redirectTo: URL,
  rescanId: string,
  userId: string
): Promise<URL> {
  if (!UUID_RE.test(rescanId)) return redirectTo;

  const supabase = createServiceClient();

  // Validate the parent analysis exists and is complete
  const { data: parent } = await supabase
    .from("analyses")
    .select("id, url, status")
    .eq("id", rescanId)
    .eq("status", "complete")
    .single();

  if (!parent) return redirectTo;

  // Idempotency: if a pending/processing re-scan already exists, redirect to it
  const { data: existing } = await supabase
    .from("analyses")
    .select("id")
    .eq("parent_analysis_id", rescanId)
    .eq("user_id", userId)
    .in("status", ["pending", "processing"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    redirectTo.pathname = `/analysis/${existing.id}`;
    return redirectTo;
  }

  // Create re-scan analysis
  const { data: newAnalysis } = await supabase
    .from("analyses")
    .insert({
      url: parent.url,
      user_id: userId,
      parent_analysis_id: rescanId,
      status: "pending",
    })
    .select("id")
    .single();

  if (!newAnalysis) return redirectTo;

  await inngest.send({
    name: "analysis/created",
    data: {
      analysisId: newAnalysis.id,
      url: parent.url,
      parentAnalysisId: rescanId,
    },
  });

  redirectTo.pathname = `/analysis/${newAnalysis.id}`;
  return redirectTo;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rescanId = searchParams.get("rescan");

  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/";
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("rescan");

  const supabase = await createClient();

  // OAuth flow — exchange code for session
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      if (rescanId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const dest = await handleRescan(redirectTo, rescanId, user.id);
          return NextResponse.redirect(dest);
        }
      }
      return NextResponse.redirect(redirectTo);
    }
    console.error("OAuth code exchange failed:", error.message);
  }

  // Magic link flow — verify OTP token hash
  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      if (rescanId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const dest = await handleRescan(redirectTo, rescanId, user.id);
          return NextResponse.redirect(dest);
        }
      }
      return NextResponse.redirect(redirectTo);
    }
    console.error("Magic link verification failed:", error.message);
  }

  // Something went wrong
  redirectTo.pathname = "/auth/error";
  return NextResponse.redirect(redirectTo);
}
