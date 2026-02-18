import * as Sentry from "@sentry/nextjs";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { PageMetadata } from "@/lib/screenshot";
import type { AnalysisResult } from "@/lib/types/analysis";
import { extractJson } from "./pipeline-utils";

// Re-export everything from submodules for backward compatibility
export * from "./pipeline-utils";
export * from "./post-analysis";
export * from "./checkpoint-assessment";
export * from "./quick-diff";

function getSystemPrompt(): string {
  return `Today's date is ${new Date().toISOString().split("T")[0]}. Use this as your reference for the current year.

You are an observant analyst who notices what founders miss. You analyze web pages using both a screenshot AND extracted page metadata.

## Brand Voice
- Direct, specific, confident — like an observant friend who notices what you missed
- No scores or grades — only predictions about what will happen if issues are fixed
- No hedging ("perhaps", "consider", "might want to") — be direct
- No buzzwords ("optimize", "leverage", "synergy") — use plain language
- Verdicts must trigger one emotion: "Ouch" (painful truth), "Aha" (sudden clarity), or "Huh" (curiosity gap)

## Core Marketing Principles

**Jobs-to-be-Done (JTBD)**: What job is the visitor hiring this product to do? Does the page speak to that job's functional, emotional, and social dimensions — or just list features?

**Message-Market Match**: Is this messaging for a specific audience with a specific problem? Or generic copy that tries to appeal to everyone and resonates with no one?

**Differentiation ("Only" Test)**: Could a competitor say the same thing? If you can swap in a competitor's name and the copy still works, it fails.

**Awareness Stages (Schwartz)**:
- Problem-aware: Need to feel understood before hearing solutions
- Solution-aware: Need to see why THIS solution vs. alternatives
- Product-aware: Need proof, specifics, and reasons to act now

**Risk Reversal**: How does the page address objections and reduce perceived risk? Guarantees, social proof, free trials reduce friction.

**Fogg Behavior Model**: motivation + ability + trigger. Is the CTA specific about what happens next?

**Cialdini's Principles**: Social proof, authority, scarcity, reciprocity. Are signals specific and relevant?

**Visual Hierarchy**: Gutenberg diagram, F-pattern, visual weight. Does the eye flow naturally?

**Gestalt Principles**: Proximity, contrast, alignment. Is spacing consistent? Typography clean?

**Mobile Experience**: Does the page work at mobile viewport (390px)?
- Is the CTA visible above the fold on mobile?
- Does text remain readable without zooming?
- Are tap targets large enough?
- Does navigation collapse appropriately?
- Is mobile a thoughtful adaptation or just a squeezed desktop?

## CRITICAL: Screenshot Capture Artifacts
Screenshots are captured by an automated headless browser. Both desktop AND mobile screenshots may contain rendering failures that do NOT reflect the real user experience:
- Skeleton loaders, placeholder blocks, or loading spinners that haven't resolved
- Lazy-loaded sections appearing as blank voids, gray rectangles, or solid color blocks
- JavaScript-dependent content (charts, tables, dynamic lists) not rendering
- Cookie consent banners or overlays blocking content

These are screenshot capture failures, NOT real page issues. NEVER flag blank areas, skeleton loaders, or unloaded content as findings. Assume the content loads normally for real visitors and analyze something else instead.

For mobile specifically: if desktop shows rich content but mobile shows blank areas in the same region, it is a rendering failure. Only flag confirmed responsive design problems: text too small to read, elements overlapping or cut off, navigation not collapsing, layout breaks at 390px.

## FriendlyText Translation Table
When writing predictions, use these human-friendly phrases with emotional stakes:
| Metric | Direction | FriendlyText |
| bounce_rate | down | "Visitors actually stick around" |
| bounce_rate | up | "Visitors bounce before reading" |
| conversion_rate | up | "More visitors become customers" |
| conversion_rate | down | "You're losing signups" |
| time_on_page | up | "People actually read your page" |
| time_on_page | down | "People leave before the good stuff" |
| ctr | up | "Your button gets noticed" |
| ctr | down | "Your button is invisible" |
| scroll_depth | up | "People scroll to see more" |
| scroll_depth | down | "People stop scrolling early" |
| form_completion | up | "More people finish the form" |
| form_completion | down | "People abandon your form" |

## Verdict Guidelines
Good verdicts are specific and quotable:
- "Your CTA is buried below 4 screens of scrolling."
- "Your headline assumes visitors already know what you do."
- "The only thing above the fold is your logo."
- "Your signup button says 'Submit.' Nobody wants to submit."

Bad verdicts (avoid):
- Too vague: "There are several optimization opportunities."
- Too passive: "Consider reviewing your CTA placement."
- Uses scores: "Your page could use improvement."

## Output Schema

Respond with JSON matching this exact schema:
{
  "verdict": "<60-80 chars max. State the key observation. Triggers Ouch/Aha/Huh.>",
  "verdictContext": "<1-2 sentences explaining the verdict>",
  "findingsCount": <number of findings>,
  "projectedImpactRange": "<e.g., '15-30%' projected change if addressed>",
  "headlineRewrite": {
    "current": "<actual headline text from page>",
    "suggested": "<your rewritten version>",
    "currentAnnotation": "<What's wrong: 'Generic. Says nothing about what you do.'>",
    "suggestedAnnotation": "<Why it's better: 'Specific outcome + time contrast = curiosity'>"
  } | null,
  "findings": [
    {
      "id": "f1",
      "title": "<short, specific title>",
      "element": "<display-ready label: 'Your Headline', 'Your CTA Button', 'Your Hero Section'>",
      "elementType": "headline" | "cta" | "copy" | "layout" | "social-proof" | "form" | "image" | "navigation" | "pricing" | "other",
      "currentValue": "<actual text/element on page, quoted>",
      "suggestion": "<copy-paste ready fix, NO 'Try:' prefix>",
      "prediction": {
        "metric": "bounce_rate" | "conversion_rate" | "time_on_page" | "ctr" | "scroll_depth" | "form_completion",
        "direction": "up" | "down",
        "range": "<X-Y%>",
        "friendlyText": "<human-friendly phrase from table above>"
      },
      "assumption": "<why this matters, what we're betting on>",
      "methodology": "<PAS, JTBD, Fogg, Cialdini, F-pattern, Gestalt, etc.>",
      "impact": "high" | "medium" | "low"
    }
  ],
  "summary": "<2-3 sentence executive summary focusing on biggest opportunities>"
}

## CRITICAL: Knowledge Cutoff
Your training data has a cutoff date. NEVER claim that specific products, companies, AI models, technologies, or services are "fictional", "don't exist", or "haven't been released yet." You do not know what exists today — only what existed in your training data. Focus on analyzing the PAGE (messaging, design, conversion), not fact-checking whether external entities mentioned on the page are real.

## Rules for Findings
- Each finding MUST have a unique id (f1, f2, f3, etc.)
- Element labels should be human-friendly: "Your Headline" not "hero headline"
- Suggestions should be copy-paste ready — don't include "Try:" or other prefixes
- Predictions should use the FriendlyText table for user-facing language
- Quote actual text from the page in currentValue
- 3-7 findings typical. Quality over quantity.
- Order by impact (high first)

Use the screenshot for visual assessment (layout, colors, spacing, hierarchy).
Use the metadata for structural assessment (heading hierarchy, meta tags, link counts, CTA text).

Be direct. Be specific. Reference what you actually see.`;
}

function formatMetadataForPrompt(metadata: PageMetadata): string {
  const lines: string[] = ["## Extracted Page Metadata"];

  lines.push("\n### Meta Tags");
  lines.push(`- Title: ${metadata.meta.title || "(not set)"}`);
  lines.push(`- Description: ${metadata.meta.description || "(not set)"}`);
  lines.push(`- OG Title: ${metadata.meta.ogTitle || "(not set)"}`);
  lines.push(`- OG Description: ${metadata.meta.ogDescription || "(not set)"}`);
  lines.push(`- OG Image: ${metadata.meta.ogImage ? "set" : "(not set)"}`);
  lines.push(
    `- Viewport: ${metadata.meta.viewport || "(not set — may not be mobile-responsive)"}`
  );

  lines.push("\n### Heading Structure");
  lines.push(`- H1: ${metadata.headings?.h1?.join(" | ") || "(none)"}`);
  lines.push(`- H2: ${metadata.headings?.h2?.join(" | ") || "(none)"}`);
  lines.push(`- H3: ${metadata.headings?.h3?.join(" | ") || "(none)"}`);

  lines.push("\n### CTAs & Buttons");
  if (metadata.buttons.length === 0) {
    lines.push("- (no buttons found)");
  } else {
    for (const btn of metadata.buttons.slice(0, 10)) {
      lines.push(`- [${btn.tag}] "${btn.text}"`);
    }
    if (metadata.buttons.length > 10) {
      lines.push(`- ...and ${metadata.buttons.length - 10} more`);
    }
  }

  lines.push("\n### Page Stats");
  lines.push(
    `- Links: ${metadata.links.total} total, ${metadata.links.external} external`
  );
  lines.push(
    `- Images: ${metadata.images.total} total, ${metadata.images.withoutAlt} missing alt text`
  );
  lines.push(`- Forms: ${metadata.forms}`);
  lines.push(
    `- Scripts: ${metadata.scripts} | Stylesheets: ${metadata.stylesheets}`
  );

  lines.push("\n### Social Proof Signals");
  lines.push(
    `- Testimonials/reviews: ${metadata.socialProof.hasTestimonials ? "detected" : "not found"}`
  );
  lines.push(
    `- Customer numbers: ${metadata.socialProof.hasNumbers ? "detected" : "not found"}`
  );
  lines.push(
    `- Partner/client logos: ${metadata.socialProof.hasLogos ? "detected" : "not found"}`
  );
  lines.push(
    `- Star ratings: ${metadata.socialProof.hasStarRating ? "detected" : "not found"}`
  );

  lines.push("\n### Structure");
  lines.push(`- Has navigation: ${metadata.navigation.length > 0 ? "yes" : "no"}`);
  lines.push(`- Has footer: ${metadata.hasFooter ? "yes" : "no"}`);
  if (metadata.navigation.length > 0) {
    lines.push(
      `- Nav items: ${metadata.navigation.map((n) => n.text).join(", ")}`
    );
  }

  return lines.join("\n");
}

/**
 * Run the full analysis pipeline on a screenshot + metadata.
 * Single Sonnet call with vision + structured page data.
 */
export async function runAnalysisPipeline(
  screenshotBase64: string,
  url: string,
  metadata?: PageMetadata,
  mobileScreenshotBase64?: string
): Promise<AnalysisResult> {
  const metadataText = metadata
    ? `\n\n${formatMetadataForPrompt(metadata)}`
    : "";

  const imageLabel = mobileScreenshotBase64
    ? "First image is desktop. Second image is mobile (390px viewport). "
    : "";

  const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
    {
      type: "text",
      text: `Analyze this web page (${url}). ${imageLabel}Evaluate the marketing effectiveness and design quality. Return your analysis as JSON.${metadataText}`,
    },
    {
      type: "image",
      image: screenshotBase64,
    },
  ];

  if (mobileScreenshotBase64) {
    contentParts.push({
      type: "image",
      image: mobileScreenshotBase64,
    });
  }

  const { text } = await generateText({
    model: google("gemini-3-pro-preview"),
    messages: [
      {
        role: "user",
        content: contentParts,
      },
    ],
    system: getSystemPrompt(),
    maxOutputTokens: 4000,
  });

  // Extract JSON from response (handles text preamble and truncated code blocks)
  const jsonStr = extractJson(text);
  let structured: AnalysisResult["structured"];
  try {
    structured = JSON.parse(jsonStr);
  } catch (parseErr) {
    Sentry.captureException(parseErr, {
      tags: { pipeline: "analysis", step: "json-parse" },
      extra: { url, rawStart: text.substring(0, 500) },
    });
    throw new Error(
      `Failed to parse LLM response as JSON. Raw start: ${text.substring(0, 200)}`
    );
  }

  // Ensure required fields have defaults if LLM omits them
  if (!structured.verdict) {
    structured.verdict = structured.summary || "Analysis complete.";
  }
  if (!structured.verdictContext) {
    structured.verdictContext = "";
  }
  if (!structured.findings) {
    structured.findings = [];
  }
  if (structured.findingsCount === undefined) {
    structured.findingsCount = structured.findings.length;
  }
  if (!structured.projectedImpactRange) {
    structured.projectedImpactRange = "Unknown";
  }
  if (!structured.summary) {
    structured.summary = structured.verdictContext || structured.verdict;
  }

  // Build readable output from structured data
  const output = formatOutput(structured, url);

  return { output, structured };
}

/**
 * Format structured output into readable text.
 */
function formatOutput(
  structured: AnalysisResult["structured"],
  url: string
): string {
  const lines: string[] = [];
  lines.push(`# Page Analysis: ${url}`);
  lines.push(`**Verdict:** ${structured.verdict}`);
  lines.push("");
  lines.push(structured.summary);
  lines.push("");

  if (structured.findings?.length > 0) {
    lines.push("## Findings");
    for (const f of structured.findings) {
      const icon = f.impact === "high" ? "!" : f.impact === "medium" ? "•" : "·";
      lines.push(`${icon} **${f.title}** — ${f.suggestion}`);
      lines.push(`   Prediction: ${f.prediction.friendlyText} (${f.prediction.range})`);
    }
  }

  return lines.join("\n");
}
