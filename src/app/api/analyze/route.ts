import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { inngest } from "@/lib/inngest/client";

export async function POST(req: NextRequest) {
  try {
    const { url, email } = await req.json();

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // URL validation
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(url.startsWith("http") ? url : `https://${url}`);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    // Block non-HTTP protocols and internal/private hosts (SSRF protection)
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    const hostname = parsedUrl.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "0.0.0.0" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("172.") ||
      hostname === "169.254.169.254" ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Create analysis record
    const { data, error } = await supabase
      .from("analyses")
      .insert({
        url: parsedUrl.toString(),
        email: email || null,
        status: "pending",
      })
      .select("id")
      .single();

    if (error) {
      console.error("Supabase insert error:", error);
      return NextResponse.json(
        { error: "Failed to create analysis" },
        { status: 500 }
      );
    }

    // Trigger Inngest background job
    await inngest.send({
      name: "analysis/created",
      data: { analysisId: data.id, url: parsedUrl.toString() },
    });

    return NextResponse.json({ id: data.id });
  } catch (err) {
    console.error("Analyze route error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
