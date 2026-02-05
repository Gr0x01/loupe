import { NextRequest, NextResponse } from "next/server";
import {
  changeDetectedEmail,
  allQuietEmail,
  correlationUnlockedEmail,
  weeklyDigestEmail,
  waitlistConfirmationEmail,
} from "@/lib/email/templates";

/**
 * GET /api/dev/email-preview?template=scan|deploy|waitlist|change-detected|...
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
    // Change detected templates
    "change-detected": () =>
      changeDetectedEmail({
        pageUrl: "https://acme.io/pricing",
        analysisId: "abc-123-def",
        triggerType: "daily",
        primaryChange: {
          element: "Your headline",
          before: "Start free today",
          after: "Get started in 60 seconds",
        },
        additionalChangesCount: 2,
        correlation: {
          hasEnoughData: false,
        },
        topSuggestion: {
          element: "CTA Button",
          friendlyText: "More people clicking",
          range: "+10-15%",
        },
      }),
    "change-detected-improved": () =>
      changeDetectedEmail({
        pageUrl: "https://acme.io/pricing",
        analysisId: "abc-123-def",
        triggerType: "weekly",
        primaryChange: {
          element: "Your headline",
          before: "Start free today",
          after: "Get started in 60 seconds",
        },
        additionalChangesCount: 0,
        correlation: {
          hasEnoughData: true,
          primaryMetric: {
            friendlyName: "More people sticking around",
            change: "+8%",
            assessment: "improved",
          },
        },
      }),
    "change-detected-regressed": () =>
      changeDetectedEmail({
        pageUrl: "https://acme.io/pricing",
        analysisId: "abc-123-def",
        triggerType: "daily",
        primaryChange: {
          element: "Your CTA button",
          before: "Start free trial",
          after: "Sign up now",
        },
        additionalChangesCount: 1,
        correlation: {
          hasEnoughData: true,
          primaryMetric: {
            friendlyName: "Bounce rate",
            change: "+12%",
            assessment: "regressed",
          },
        },
        topSuggestion: {
          element: "CTA Button",
          friendlyText: "Revert to previous CTA",
          range: "-10-15% bounce rate",
        },
      }),
    "change-detected-deploy": () =>
      changeDetectedEmail({
        pageUrl: "https://acme.io",
        analysisId: "abc-123-def",
        triggerType: "deploy",
        primaryChange: {
          element: "Your hero image",
          before: "Product screenshot",
          after: "Team photo",
        },
        additionalChangesCount: 3,
        commitSha: "a1b2c3d4e5f6g7h8",
        commitMessage: "refactor: Update hero section with new visuals",
      }),

    "all-quiet": () =>
      allQuietEmail({
        pageUrl: "https://acme.io/pricing",
        analysisId: "abc-123-def",
        lastChangeDate: "Jan 15",
        topSuggestion: {
          title: "Move CTA above fold",
          element: "CTA Button",
          friendlyText: "More people clicking",
          range: "+10-15%",
        },
      }),
    "all-quiet-no-suggestion": () =>
      allQuietEmail({
        pageUrl: "https://acme.io/pricing",
        analysisId: "abc-123-def",
        lastChangeDate: "Jan 15",
      }),

    "correlation-unlocked": () =>
      correlationUnlockedEmail({
        pageUrl: "https://acme.io",
        analysisId: "abc-123-def",
        change: {
          element: "headline",
          before: "Start free today",
          after: "Get started in 60 seconds",
          changedAt: "Jan 20",
        },
        metric: {
          friendlyName: "More people sticking around",
          change: "+8%",
        },
        topSuggestion: {
          element: "CTA Button",
          friendlyText: "Move CTA above fold",
          range: "+10-15% clicks",
        },
      }),
    "correlation-unlocked-no-suggestion": () =>
      correlationUnlockedEmail({
        pageUrl: "https://acme.io",
        analysisId: "abc-123-def",
        change: {
          element: "CTA button",
          before: "Sign up",
          after: "Start free trial",
          changedAt: "Jan 18",
        },
        metric: {
          friendlyName: "More clicks",
          change: "+15%",
        },
      }),

    "weekly-digest": () =>
      weeklyDigestEmail({
        pages: [
          {
            url: "https://acme.io",
            domain: "acme.io",
            status: "changed",
            changesCount: 1,
            helped: true,
          },
          {
            url: "https://acme.io/pricing",
            domain: "acme.io/pricing",
            status: "stable",
          },
          {
            url: "https://acme.io/features",
            domain: "acme.io/features",
            status: "suggestion",
            suggestionTitle: "Move CTA above fold",
          },
        ],
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

          <h2 style="margin-top: 32px; color: #666; font-size: 14px; text-transform: uppercase;">Change Detected</h2>
          <ul style="line-height: 2;">
            <li><a href="?template=change-detected">Watching for impact</a></li>
            <li><a href="?template=change-detected-improved">Correlation improved</a></li>
            <li><a href="?template=change-detected-regressed">Correlation regressed</a></li>
            <li><a href="?template=change-detected-deploy">Deploy trigger</a></li>
          </ul>

          <h2 style="margin-top: 32px; color: #666; font-size: 14px; text-transform: uppercase;">All Quiet</h2>
          <ul style="line-height: 2;">
            <li><a href="?template=all-quiet">With suggestion</a></li>
            <li><a href="?template=all-quiet-no-suggestion">No suggestion</a></li>
          </ul>

          <h2 style="margin-top: 32px; color: #666; font-size: 14px; text-transform: uppercase;">Correlation Unlocked</h2>
          <ul style="line-height: 2;">
            <li><a href="?template=correlation-unlocked">With suggestion</a></li>
            <li><a href="?template=correlation-unlocked-no-suggestion">No suggestion</a></li>
          </ul>

          <h2 style="margin-top: 32px; color: #666; font-size: 14px; text-transform: uppercase;">Digest & Other</h2>
          <ul style="line-height: 2;">
            <li><a href="?template=weekly-digest">Weekly Digest</a></li>
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
