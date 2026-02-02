import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { PageMetadata } from "@/lib/screenshot";

export interface AnalysisResult {
  output: string;
  structured: {
    overallScore: number;
    categories: {
      name: string;
      score: number;
      findings: {
        type: "strength" | "issue" | "suggestion";
        title: string;
        detail: string;
      }[];
    }[];
    summary: string;
    topActions: string[];
  };
}

const SYSTEM_PROMPT = `You are an expert web marketing and design consultant. You analyze web pages using both a screenshot AND extracted page metadata (headings, meta tags, CTAs, link counts, etc.).

You evaluate pages across these categories:
1. **Messaging & Copy** — Is the headline clear? Does it communicate a specific outcome? Is the value proposition obvious in 5 seconds?
2. **Call to Action** — Is the primary CTA visible, compelling, and specific? Is there a clear next step?
3. **Trust & Social Proof** — Are there testimonials, logos, numbers, or other credibility signals?
4. **Visual Hierarchy** — Does the eye flow naturally? Is the most important content most prominent?
5. **Design Quality** — Is spacing consistent? Typography clean? Colors purposeful?
6. **SEO & Metadata** — Are meta title/description set and compelling? Is heading hierarchy correct? Are images accessible (alt text)?

Use the screenshot for visual assessment (layout, colors, spacing, hierarchy).
Use the metadata for structural assessment (heading hierarchy, meta tags, link counts, alt text, CTA text, social proof signals).

For each finding, be SPECIFIC to this page. Reference actual text, actual elements, actual colors you see. Never give generic advice.

Respond with a JSON object matching this exact schema:
{
  "overallScore": <1-100>,
  "categories": [
    {
      "name": "<category name>",
      "score": <1-100>,
      "findings": [
        {
          "type": "strength" | "issue" | "suggestion",
          "title": "<short title>",
          "detail": "<specific, actionable detail referencing actual page content>"
        }
      ]
    }
  ],
  "summary": "<2-3 sentence executive summary of the page's marketing effectiveness>",
  "topActions": ["<top 3 most impactful changes to make, ordered by impact>"]
}

Be direct. Be specific. Reference what you actually see on the page and in the metadata.`;

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
  lines.push(`- H1: ${metadata.headings.h1.join(" | ") || "(none)"}`);
  lines.push(`- H2: ${metadata.headings.h2.join(" | ") || "(none)"}`);
  lines.push(`- H3: ${metadata.headings.h3.join(" | ") || "(none)"}`);

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
  metadata?: PageMetadata
): Promise<AnalysisResult> {
  const metadataText = metadata
    ? `\n\n${formatMetadataForPrompt(metadata)}`
    : "";

  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this web page (${url}). Evaluate the marketing effectiveness and design quality. Return your analysis as JSON.${metadataText}`,
          },
          {
            type: "image",
            image: screenshotBase64,
          },
        ],
      },
    ],
    system: SYSTEM_PROMPT,
    maxOutputTokens: 4000,
  });

  // Extract JSON from response (handle markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [
    null,
    text,
  ];
  const jsonStr = jsonMatch[1]!.trim();
  let structured;
  try {
    structured = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `Failed to parse LLM response as JSON. Raw start: ${text.substring(0, 200)}`
    );
  }

  // Build readable output from structured data
  const output = formatOutput(structured, url);

  return { output, structured };
}

function formatOutput(
  structured: AnalysisResult["structured"],
  url: string
): string {
  const lines: string[] = [];
  lines.push(`# Page Analysis: ${url}`);
  lines.push(`**Overall Score: ${structured.overallScore}/100**`);
  lines.push("");
  lines.push(structured.summary);
  lines.push("");

  for (const cat of structured.categories) {
    lines.push(`## ${cat.name} (${cat.score}/100)`);
    for (const f of cat.findings) {
      const icon =
        f.type === "strength" ? "✓" : f.type === "issue" ? "✗" : "→";
      lines.push(`${icon} **${f.title}** — ${f.detail}`);
    }
    lines.push("");
  }

  if (structured.topActions.length > 0) {
    lines.push("## Top Actions");
    structured.topActions.forEach((a, i) => lines.push(`${i + 1}. ${a}`));
  }

  return lines.join("\n");
}
