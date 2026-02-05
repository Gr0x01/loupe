import { NextRequest, NextResponse } from "next/server";

// Wayback CDX API endpoint
const CDX_API_URL = "https://web.archive.org/cdx/search/cdx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL parameter required" }, { status: 400 });
  }

  // Validate URL to prevent SSRF
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
    }
    // Block internal/localhost URLs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.endsWith(".local")
    ) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    // Query Wayback CDX API for snapshots
    const cdxUrl = new URL(CDX_API_URL);
    cdxUrl.searchParams.set("url", url);
    cdxUrl.searchParams.set("output", "json");
    cdxUrl.searchParams.set("limit", "5");
    cdxUrl.searchParams.set("fl", "timestamp,original,statuscode");
    cdxUrl.searchParams.set("filter", "statuscode:200"); // Only successful captures
    cdxUrl.searchParams.set("collapse", "timestamp:6"); // One per month

    const response = await fetch(cdxUrl.toString(), {
      headers: {
        "User-Agent": "Loupe/1.0 (https://getloupe.io)",
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { snapshots: [], error: "Wayback Machine unavailable" },
        { status: 200 }
      );
    }

    const data = await response.json();

    // First row is headers, rest are data
    if (!Array.isArray(data) || data.length <= 1) {
      return NextResponse.json({ snapshots: [] });
    }

    // Skip header row, map to snapshots
    const snapshots = data.slice(1).map((row: string[]) => {
      const [timestamp, original] = row;
      return {
        timestamp,
        original,
        // Wayback Machine thumbnail format
        thumbnailUrl: `https://web.archive.org/web/${timestamp}im_/${original}`,
        // Full snapshot URL
        snapshotUrl: `https://web.archive.org/web/${timestamp}/${original}`,
        // Human-readable date
        date: formatTimestamp(timestamp),
      };
    });

    return NextResponse.json({ snapshots });
  } catch (error) {
    console.error("Wayback API error:", error);
    return NextResponse.json(
      { snapshots: [], error: "Failed to fetch history" },
      { status: 200 }
    );
  }
}

// Convert Wayback timestamp (YYYYMMDDHHmmss) to readable date
function formatTimestamp(ts: string): string {
  const year = ts.slice(0, 4);
  const month = ts.slice(4, 6);
  const day = ts.slice(6, 8);
  const date = new Date(`${year}-${month}-${day}`);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
