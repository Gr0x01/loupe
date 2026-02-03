import { generateText, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageMetadata } from "@/lib/screenshot";
import type { AnalyticsCredentials } from "@/lib/analytics/types";
import { createProvider } from "@/lib/analytics/provider";
import { createAnalyticsTools } from "@/lib/analytics/tools";

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

export interface FindingEvaluation {
  title: string;
  element: string;
  previous_status: "issue" | "suggestion";
  evaluation: "resolved" | "improved" | "unchanged" | "regressed" | "new";
  quality_assessment: string; // Nuanced evaluation of the change quality
  detail: string;
}

export interface ChangesSummary {
  findings_evaluations: FindingEvaluation[];
  score_delta: number;
  category_deltas: { name: string; previous: number; current: number; delta: number }[];
  running_summary: string;
  progress: {
    total_original: number;
    resolved: number;
    improved: number;
    unchanged: number;
    regressed: number;
    new_issues: number;
  };
  // Analytics correlation (populated when analytics tools available)
  analytics_insights?: string;
  metrics_summary?: {
    pageviews_7d: number;
    unique_visitors_7d: number;
    bounce_rate_7d: number;
  } | null;
  tool_calls_made?: string[];
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
  "verdict": "<one-liner verdict specific to this page — what's the single most important takeaway? For strong pages, name what's working ('Your copy does the selling — the trust signals seal it'). For weak pages, name the biggest problem ('Visitors can't tell what you do in 5 seconds'). Never generic. Max 12 words.>",
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

const POST_ANALYSIS_PROMPT = `You are an expert marketing analyst evaluating changes between page audits and correlating them with analytics data when available.

## Your Task

1. **Evaluate Changes** (when previous findings provided):
   - Don't just detect if something changed — evaluate the QUALITY of the change
   - A headline change from "We help businesses" to "We help businesses grow" is NOT a fix — it's still vague
   - Judge whether fixes actually address the underlying issue or just shuffle words around
   - Consider if execution was poor even when intent was good

2. **Correlate with Analytics** (when tools available):
   - Query relevant metrics using the tools provided
   - Look for patterns: did metrics move after changes?
   - Connect specific changes to specific metric movements when plausible
   - Be careful about causation vs correlation

3. **Provide Actionable Intelligence**:
   - What's actually improving vs what looks like change but isn't
   - Where metrics suggest the changes are/aren't working
   - What to focus on next based on both audit findings and real data

## Evaluation Scale for Changes:
- "resolved" — The issue is genuinely fixed, good execution
- "improved" — Better than before but not fully resolved
- "unchanged" — Changed superficially but core issue remains (or literally unchanged)
- "regressed" — Made worse than before
- "new" — New issue not in previous audit

## When Analytics Tools Available:
Call tools strategically (max 5 calls). Good patterns:
1. Start with get_page_stats to understand baseline traffic
2. Use compare_periods to see before/after for key metrics
3. Query specific events if relevant to findings (e.g., CTA click events)

## Output Format
Return JSON matching this schema:
{
  "findings_evaluations": [
    {
      "title": "<finding title from previous audit>",
      "element": "<page element>",
      "previous_status": "issue" | "suggestion",
      "evaluation": "resolved" | "improved" | "unchanged" | "regressed" | "new",
      "quality_assessment": "<1-2 sentences on WHY this evaluation — what specifically is better/worse/same>",
      "detail": "<what changed or didn't>"
    }
  ],
  "score_delta": <current score - previous score>,
  "category_deltas": [
    { "name": "<category>", "previous": <old>, "current": <new>, "delta": <diff> }
  ],
  "running_summary": "<2-3 sentence narrative of progress, what's working, what isn't>",
  "progress": {
    "total_original": <count>,
    "resolved": <count>,
    "improved": <count>,
    "unchanged": <count>,
    "regressed": <count>,
    "new_issues": <count>
  },
  "analytics_insights": "<if analytics available: 2-4 sentences connecting changes to metrics. e.g., 'Bounce rate dropped 12% after the headline change, suggesting the new copy resonates better. However, CTA clicks are flat, indicating the button copy change didn't help.'>",
  "metrics_summary": {
    "pageviews_7d": <number>,
    "unique_visitors_7d": <number>,
    "bounce_rate_7d": <number>
  }
}

If this is a first scan (no previous findings), focus on analytics context only and return minimal findings_evaluations.`;

export interface PostAnalysisContext {
  analysisId: string;
  userId: string;
  pageUrl: string;
  currentFindings: AnalysisResult["structured"];
  previousFindings?: AnalysisResult["structured"] | null;
  previousRunningSummary?: string | null;
}

export interface PostAnalysisOptions {
  supabase: SupabaseClient;
  analyticsCredentials?: AnalyticsCredentials | null;
}

/**
 * Unified post-analysis pipeline that handles both comparison and correlation.
 * Uses Gemini 3 Pro for nuanced evaluation.
 * Analytics tools are conditionally available based on credentials.
 */
export async function runPostAnalysisPipeline(
  context: PostAnalysisContext,
  options: PostAnalysisOptions
): Promise<ChangesSummary> {
  const { currentFindings, previousFindings, previousRunningSummary, pageUrl } = context;
  const { supabase, analyticsCredentials } = options;

  // Build the prompt
  const promptParts: string[] = [];

  if (previousFindings) {
    promptParts.push(`## Previous Audit Findings\n${JSON.stringify(previousFindings, null, 2)}`);
    promptParts.push(`\n## Current Audit Findings\n${JSON.stringify(currentFindings, null, 2)}`);
    if (previousRunningSummary) {
      promptParts.push(`\n## Previous Running Summary\n${previousRunningSummary}`);
    }
  } else {
    promptParts.push(`## Current Audit Findings (First Scan)\n${JSON.stringify(currentFindings, null, 2)}`);
    promptParts.push(`\nThis is the first scan of this page. Focus on providing analytics context if available.`);
  }

  promptParts.push(`\n## Page URL\n${pageUrl}`);

  // Create analytics tools if credentials available
  let tools = {};
  const toolCallsMade: string[] = [];

  if (analyticsCredentials) {
    try {
      const provider = await createProvider("posthog", analyticsCredentials);
      tools = createAnalyticsTools({
        provider,
        supabase,
        analysisId: context.analysisId,
        userId: context.userId,
        pageUrl,
        providerType: "posthog",
      });
      promptParts.push(`\n## Analytics Available\nYou have access to analytics tools. Use them to correlate changes with metrics.`);
    } catch (err) {
      console.error("Failed to create analytics provider:", err);
      promptParts.push(`\n## Analytics\nAnalytics tools unavailable.`);
    }
  } else {
    promptParts.push(`\n## Analytics\nNo analytics connected. Focus on evaluating the changes only.`);
  }

  const hasTools = Object.keys(tools).length > 0;

  const result = await generateText({
    model: google("gemini-3-pro-preview"),
    system: POST_ANALYSIS_PROMPT,
    prompt: promptParts.join("\n"),
    tools: hasTools ? tools : undefined,
    stopWhen: stepCountIs(hasTools ? 6 : 1), // Allow tool calls if tools available
    maxOutputTokens: 3000,
    onStepFinish: ({ toolCalls }) => {
      if (toolCalls) {
        for (const call of toolCalls) {
          toolCallsMade.push(call.toolName);
        }
      }
    },
  });

  // Extract JSON from response
  const jsonMatch = result.text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, result.text];
  const jsonStr = jsonMatch[1]!.trim();

  let parsed: ChangesSummary;
  try {
    parsed = JSON.parse(jsonStr) as ChangesSummary;
  } catch {
    throw new Error(`Failed to parse post-analysis response as JSON. Raw start: ${result.text.substring(0, 200)}`);
  }

  // Add tool calls metadata
  parsed.tool_calls_made = toolCallsMade;

  // Ensure backwards compatibility with old field name
  if (!parsed.findings_evaluations && (parsed as unknown as { findings_status?: unknown }).findings_status) {
    // Map old format to new if LLM used old field name
    const oldFormat = parsed as unknown as { findings_status: Array<{
      title: string;
      element: string;
      previous_status: string;
      current_status: string;
      detail: string;
    }> };
    parsed.findings_evaluations = oldFormat.findings_status.map(f => ({
      title: f.title,
      element: f.element,
      previous_status: f.previous_status as "issue" | "suggestion",
      evaluation: f.current_status as "resolved" | "improved" | "unchanged" | "regressed" | "new",
      quality_assessment: f.detail,
      detail: f.detail,
    }));
  }

  return parsed;
}

/**
 * @deprecated Use runPostAnalysisPipeline instead
 * Kept for backwards compatibility during migration
 */
export async function runComparisonPipeline(
  previousStructured: AnalysisResult["structured"],
  currentStructured: AnalysisResult["structured"],
  previousRunningSummary?: string | null
): Promise<ChangesSummary> {
  // This is a compatibility shim - use the new pipeline without analytics
  // We need a supabase client and context, so this creates a minimal version
  console.warn("runComparisonPipeline is deprecated. Use runPostAnalysisPipeline instead.");

  const { text } = await generateText({
    model: google("gemini-3-pro-preview"),
    system: POST_ANALYSIS_PROMPT,
    prompt: `## Previous Audit Findings\n${JSON.stringify(previousStructured, null, 2)}\n\n## Current Audit Findings\n${JSON.stringify(currentStructured, null, 2)}\n\n## Previous Running Summary\n${previousRunningSummary || "(first re-scan)"}\n\n## Analytics\nNo analytics connected.`,
    maxOutputTokens: 3000,
  });

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]!.trim();
  try {
    return JSON.parse(jsonStr) as ChangesSummary;
  } catch {
    throw new Error(`Failed to parse comparison response as JSON. Raw start: ${text.substring(0, 200)}`);
  }
}
