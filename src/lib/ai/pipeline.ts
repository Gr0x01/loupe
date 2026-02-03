import { generateText } from "ai";
import { google } from "@ai-sdk/google";
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
        impact?: "high" | "medium" | "low";
        fix?: string;
        methodology?: string;
        element?: string;
      }[];
    }[];
    summary: string;
    topActions: ({ action: string; impact: string } | string)[];
    whatsWorking?: string[];
    whatsNot?: string[];
    headlineRewrite?: {
      current: string;
      suggested: string;
      reasoning: string;
    } | null;
  };
}

export interface ChangesSummary {
  findings_status: {
    title: string;
    element: string;
    previous_status: string;
    current_status: "resolved" | "persists" | "regressed" | "new";
    detail: string;
  }[];
  score_delta: number;
  category_deltas: { name: string; previous: number; current: number; delta: number }[];
  running_summary: string;
  progress: {
    total_original: number;
    resolved: number;
    persisting: number;
    new_issues: number;
  };
}

const SYSTEM_PROMPT = `You are an expert web marketing and design consultant. You analyze web pages using both a screenshot AND extracted page metadata (headings, meta tags, CTAs, link counts, etc.).

You evaluate pages across these categories:
1. **Messaging & Copy** — Ground in PAS (Problem-Agitate-Solve), the "So What?" test, and the specificity ladder. Is the headline clear? Does it communicate a specific outcome? Is the value proposition obvious in 5 seconds? E.g. "Your headline fails the 'So What?' test — it says what you do but not the outcome."
2. **Call to Action** — Ground in Fogg Behavior Model (motivation + ability + trigger) and friction audit. Is the primary CTA visible, compelling, and specific? Is there a clear next step? E.g. "CTA lacks urgency trigger (Fogg model) — no reason to act now vs. later."
3. **Trust & Social Proof** — Ground in Cialdini's principles (social proof, authority, scarcity). Are there testimonials, logos, numbers, or other credibility signals? E.g. "No social proof above the fold — Cialdini's social proof principle suggests testimonials near the CTA convert 2x better."
4. **Visual Hierarchy** — Ground in Gutenberg diagram, F-pattern, and visual weight. Does the eye flow naturally? Is the most important content most prominent? E.g. "Primary CTA doesn't follow the F-pattern reading flow."
5. **Design Quality** — Ground in Gestalt principles (proximity, contrast, alignment). Is spacing consistent? Typography clean? Colors purposeful? E.g. "Inconsistent spacing breaks the proximity principle — related elements should be grouped tighter."
6. **SEO & Metadata** — Ground in search intent matching and click-through optimization. Are meta title/description set and compelling? Is heading hierarchy correct? Are images accessible (alt text)? E.g. "Meta description is generic — doesn't match transactional search intent for this page type."

Use the screenshot for visual assessment (layout, colors, spacing, hierarchy).
Use the metadata for structural assessment (heading hierarchy, meta tags, link counts, alt text, CTA text, social proof signals).

CRITICAL RULES FOR SPECIFICITY:
- Reference ACTUAL text from the page. Quote their headline, their CTA button text, their meta description.
- Give ACTUAL rewrites. Don't say "make the headline clearer" — write the new headline.
- Reference ACTUAL elements. Don't say "improve the CTA" — say "the blue 'Get Started' button in the hero".
- For each finding's "fix" field, give ONE specific, concrete action: an actual copy rewrite, an actual element change, an actual CSS property to adjust.

Respond with a JSON object matching this exact schema:
{
  "overallScore": <1-100>,
  "whatsWorking": ["<strength 1, one line>", "<strength 2, one line>", "<strength 3, one line>"],
  "whatsNot": ["<weakness 1, one line>", "<weakness 2, one line>", "<weakness 3, one line>"],
  "headlineRewrite": {
    "current": "<the actual current headline text from the page>",
    "suggested": "<your rewritten version>",
    "reasoning": "<1-2 sentences on why this is better>"
  } OR null if the headline is already strong,
  "categories": [
    {
      "name": "<category name>",
      "score": <1-100>,
      "findings": [
        {
          "type": "strength" | "issue" | "suggestion",
          "title": "<short title>",
          "detail": "<specific, actionable detail referencing actual page content>",
          "impact": "high" | "medium" | "low",
          "fix": "<one specific, concrete fix — actual copy rewrites, actual element changes>",
          "methodology": "<the framework/principle this finding is grounded in, e.g. 'PAS framework', 'Cialdini social proof', 'Fogg Behavior Model', 'F-pattern', 'Gestalt proximity'>",
          "element": "<the specific page element this references, e.g. 'hero headline', 'primary CTA button', 'testimonials section'>"
        }
      ]
    }
  ],
  "summary": "<2-3 sentence executive summary of the page's marketing effectiveness>",
  "topActions": [
    { "action": "<specific action referencing actual page elements>", "impact": "<estimated impact, e.g. '15-25% more signups'>" },
    { "action": "<specific action>", "impact": "<estimated impact>" },
    { "action": "<specific action>", "impact": "<estimated impact>" }
  ]
}

Be direct. Be specific. Reference what you actually see on the page and in the metadata. Every finding must include a concrete fix.`;

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
    model: google("gemini-3-pro-preview"),
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
    structured.topActions.forEach((a, i) => {
      const actionText = typeof a === "string" ? a : a.action;
      lines.push(`${i + 1}. ${actionText}`);
    });
  }

  return lines.join("\n");
}

const COMPARISON_PROMPT = `You are evaluating whether issues from a previous page audit have been addressed in a new audit of the same page.

For each previous finding (issues and suggestions only), determine:
- "resolved" — the issue is fixed based on the current findings
- "persists" — the issue still exists
- "regressed" — the issue got worse

Also identify any NEW findings in the current audit that weren't in the previous one (mark as "new").

Return JSON matching this exact schema:
{
  "findings_status": [
    {
      "title": "<finding title>",
      "element": "<page element referenced>",
      "previous_status": "issue" | "suggestion",
      "current_status": "resolved" | "persists" | "regressed" | "new",
      "detail": "<brief explanation of what changed or didn't>"
    }
  ],
  "score_delta": <current overall score minus previous overall score>,
  "category_deltas": [
    { "name": "<category>", "previous": <old score>, "current": <new score>, "delta": <difference> }
  ],
  "running_summary": "<2-3 sentence narrative of progress so far, incorporating previous running summary if provided>",
  "progress": {
    "total_original": <number of original issues/suggestions>,
    "resolved": <how many are now resolved>,
    "persisting": <how many still persist>,
    "new_issues": <how many new issues found>
  }
}`;

/**
 * Compare current findings against previous findings to produce a changes summary.
 * Uses a cheap text-only model (Gemini Flash).
 */
export async function runComparisonPipeline(
  previousStructured: AnalysisResult["structured"],
  currentStructured: AnalysisResult["structured"],
  previousRunningSummary?: string | null
): Promise<ChangesSummary> {
  const { text } = await generateText({
    model: google("gemini-2.0-flash"),
    system: COMPARISON_PROMPT,
    prompt: `Previous findings:\n${JSON.stringify(previousStructured, null, 2)}\n\nCurrent findings:\n${JSON.stringify(currentStructured, null, 2)}\n\nPrevious running summary: ${previousRunningSummary || "(first re-scan, no previous summary)"}`,
    maxOutputTokens: 2000,
  });

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]!.trim();
  try {
    return JSON.parse(jsonStr) as ChangesSummary;
  } catch {
    throw new Error(`Failed to parse comparison response as JSON. Raw start: ${text.substring(0, 200)}`);
  }
}
