import { ImageResponse } from "next/og";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

export const alt = "Loupe Audit";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch analysis data using anon key (analyses are publicly viewable)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { data: analysis } = await supabase
    .from("analyses")
    .select("url, structured_output")
    .eq("id", id)
    .single();

  // Extract domain with error handling
  let domain = "example.com";
  if (analysis?.url) {
    try {
      domain = new URL(analysis.url).hostname;
    } catch {
      // Invalid URL, use fallback
    }
  }

  const structured = analysis?.structured_output as {
    verdict?: string;
    projectedImpactRange?: string;
  } | null;

  const verdict = structured?.verdict || "Your page has opportunities to improve";
  const impactRange = structured?.projectedImpactRange || "15-30%";

  // Truncate verdict if too long
  const displayVerdict =
    verdict.length > 80 ? verdict.slice(0, 77) + "..." : verdict;

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #faf9fb 0%, #f3f1f5 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Header with logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 40,
          }}
        >
          {/* Logo icon placeholder */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              background: "linear-gradient(135deg, #FF5A36 0%, #E64D2E 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "white", fontSize: 24, fontWeight: 700 }}>L</span>
          </div>
          <span
            style={{
              fontSize: 32,
              fontWeight: 600,
              color: "#111118",
              letterSpacing: "-0.01em",
            }}
          >
            Loupe
          </span>
        </div>

        {/* Domain */}
        <div
          style={{
            fontSize: 28,
            color: "#64617a",
            marginBottom: 24,
          }}
        >
          {domain}
        </div>

        {/* Verdict - the main attraction */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#111118",
            lineHeight: 1.2,
            letterSpacing: "-0.02em",
            flex: 1,
            display: "flex",
            alignItems: "center",
            maxWidth: 900,
          }}
        >
          &ldquo;{displayVerdict}&rdquo;
        </div>

        {/* Impact range badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "linear-gradient(135deg, rgba(255,90,54,0.1) 0%, rgba(124,77,171,0.1) 100%)",
              padding: "16px 24px",
              borderRadius: 12,
              border: "2px solid rgba(255,90,54,0.2)",
            }}
          >
            <span style={{ fontSize: 24, color: "#FF5A36" }}>+{impactRange}</span>
            <span style={{ fontSize: 20, color: "#64617a" }}>potential improvement</span>
          </div>

          {/* CTA */}
          <div
            style={{
              fontSize: 20,
              color: "#64617a",
            }}
          >
            Get your free audit at getloupe.io
          </div>
        </div>

        {/* Bottom accent bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 8,
            background: "linear-gradient(90deg, #FF5A36 0%, #E64D2E 100%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
