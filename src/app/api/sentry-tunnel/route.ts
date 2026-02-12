import { NextRequest, NextResponse } from "next/server";

// Parse allowed host + project from our DSN at startup
const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || "";
let allowedHost = "";
let allowedProjectId = "";
try {
  const url = new URL(DSN);
  allowedHost = url.hostname;
  allowedProjectId = url.pathname.replace(/^\//, "");
} catch {
  // DSN not configured — tunnel will reject all requests
}

/**
 * Sentry tunnel — proxies envelopes through our own domain to bypass ad blockers.
 * Validates the DSN in the envelope header matches our project to prevent abuse.
 */
export async function POST(request: NextRequest) {
  if (!allowedHost) {
    return NextResponse.json({ error: "Tunnel not configured" }, { status: 503 });
  }

  try {
    // Reject oversized payloads (Sentry envelopes are typically <200KB)
    const contentLength = request.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 512_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const body = await request.text();
    if (body.length > 512_000) {
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    const [header] = body.split("\n", 1);

    if (!header) {
      return NextResponse.json({ error: "Invalid envelope" }, { status: 400 });
    }

    const envelope = JSON.parse(header);
    const dsn = new URL(envelope?.dsn || "");

    // Validate: must be our Sentry project
    if (dsn.hostname !== allowedHost) {
      return NextResponse.json({ error: "Invalid DSN host" }, { status: 403 });
    }

    const projectId = dsn.pathname.replace(/^\//, "");
    if (projectId !== allowedProjectId) {
      return NextResponse.json({ error: "Invalid project" }, { status: 403 });
    }

    const upstreamUrl = `https://${allowedHost}/api/${projectId}/envelope/`;

    const response = await fetch(upstreamUrl, {
      method: "POST",
      body,
      headers: {
        "Content-Type": "application/x-sentry-envelope",
      },
    });

    return new NextResponse(response.body, { status: response.status });
  } catch {
    return NextResponse.json({ error: "Tunnel error" }, { status: 500 });
  }
}
