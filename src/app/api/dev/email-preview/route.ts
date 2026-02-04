import { NextRequest, NextResponse } from "next/server";
import {
  scanCompleteEmail,
  deployScanCompleteEmail,
  waitlistConfirmationEmail,
} from "@/lib/email/templates";

/**
 * GET /api/dev/email-preview?template=scan|deploy|waitlist
 *
 * Dev-only endpoint to preview email templates in browser.
 * Returns raw HTML that renders in the browser.
 */
export async function GET(req: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const template = req.nextUrl.searchParams.get("template");

  const mockData = {
    // Score dropped significantly
    "scan-dropped": () =>
      scanCompleteEmail({
        pageUrl: "https://example.com/pricing",
        score: 62,
        previousScore: 78,
        analysisId: "abc-123-def",
        triggerType: "weekly",
      }),
    // Score improved
    "scan-improved": () =>
      scanCompleteEmail({
        pageUrl: "https://example.com/pricing",
        score: 85,
        previousScore: 72,
        analysisId: "abc-123-def",
        triggerType: "daily",
      }),
    // Score stable
    "scan-stable": () =>
      scanCompleteEmail({
        pageUrl: "https://example.com/pricing",
        score: 78,
        previousScore: 78,
        analysisId: "abc-123-def",
        triggerType: "weekly",
      }),
    // First scan (no previous)
    "scan-first": () =>
      scanCompleteEmail({
        pageUrl: "https://example.com/pricing",
        score: 72,
        previousScore: null,
        analysisId: "abc-123-def",
        triggerType: "weekly",
      }),
    // Deploy - score dropped
    "deploy-dropped": () =>
      deployScanCompleteEmail({
        pageUrl: "https://example.com/pricing",
        score: 65,
        previousScore: 82,
        analysisId: "abc-123-def",
        commitSha: "a1b2c3d4e5f6g7h8i9j0",
        commitMessage: "refactor: Rebuild hero section with new component",
      }),
    // Deploy - looks clean
    "deploy-clean": () =>
      deployScanCompleteEmail({
        pageUrl: "https://example.com/pricing",
        score: 82,
        previousScore: 82,
        analysisId: "abc-123-def",
        commitSha: "f9e8d7c6b5a4",
        commitMessage: "fix: Update button colors",
      }),
    waitlist: () =>
      waitlistConfirmationEmail({
        email: "founder@startup.com",
      }),
  };

  if (!template || !(template in mockData)) {
    // Show index of available templates
    const index = `
      <html>
        <head><title>Email Preview</title></head>
        <body style="font-family: system-ui; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1>Email Templates</h1>

          <h2 style="margin-top: 32px; color: #666; font-size: 14px; text-transform: uppercase;">Scheduled Scans</h2>
          <ul style="line-height: 2;">
            <li><a href="?template=scan-dropped">Score dropped (-16 pts)</a></li>
            <li><a href="?template=scan-improved">Score improved (+13 pts)</a></li>
            <li><a href="?template=scan-stable">Score stable (no change)</a></li>
            <li><a href="?template=scan-first">First scan (no previous)</a></li>
          </ul>

          <h2 style="margin-top: 32px; color: #666; font-size: 14px; text-transform: uppercase;">Deploy Scans</h2>
          <ul style="line-height: 2;">
            <li><a href="?template=deploy-dropped">Deploy broke things (-17 pts)</a></li>
            <li><a href="?template=deploy-clean">Deploy looks clean (no change)</a></li>
          </ul>

          <h2 style="margin-top: 32px; color: #666; font-size: 14px; text-transform: uppercase;">Other</h2>
          <ul style="line-height: 2;">
            <li><a href="?template=waitlist">Waitlist Confirmation</a></li>
          </ul>
        </body>
      </html>
    `;
    return new NextResponse(index, {
      headers: { "Content-Type": "text/html" },
    });
  }

  const { html } = mockData[template as keyof typeof mockData]();

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html" },
  });
}
