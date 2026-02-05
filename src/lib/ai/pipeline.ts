import { generateText, stepCountIs } from "ai";
import { google } from "@ai-sdk/google";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PageMetadata } from "@/lib/screenshot";
import type { AnalyticsCredentials, GA4Credentials } from "@/lib/analytics/types";
import { createProvider } from "@/lib/analytics/provider";
import { createAnalyticsTools, createDatabaseTools } from "@/lib/analytics/tools";
import { createSupabaseAdapter } from "@/lib/analytics/supabase-adapter";

// Re-export types from canonical source
export type {
  MetricType,
  Prediction,
  Finding,
  ElementType,
  HeadlineRewrite,
  AnalysisResult,
  FindingEvaluation,
  ChangesSummary,
  Change,
  ChronicleSuggestion,
  Correlation,
  ChronicleCorrelationMetric,
  DeployContext,
  ValidatedItem,
  WatchingItem,
  OpenItem,
} from "@/lib/types/analysis";

import type { ChangesSummary, AnalysisResult, DeployContext } from "@/lib/types/analysis";

const SYSTEM_PROMPT = `You are an observant analyst who notices what founders miss. You analyze web pages using both a screenshot AND extracted page metadata.

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
  const jsonStr = (jsonMatch[1] ?? text).trim();
  let structured: AnalysisResult["structured"];
  try {
    structured = JSON.parse(jsonStr);
  } catch {
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

const POST_ANALYSIS_PROMPT = `You are an observant analyst tracking what changed and whether it helped. Your job is NOT to re-audit — it's to tell users what changed, whether it's working, and what to focus on next.

## Brand Voice
- Direct, specific, confident — like an observant friend giving you the rundown
- Verdicts should be punchy: "You made 2 changes. One helped."
- No hedging ("perhaps", "consider") — be direct
- Use human-friendly language, not marketing jargon

## FriendlyText Translation Table
Use these phrases when describing metric impacts:
| bounce_rate down | "Visitors actually stick around" |
| bounce_rate up | "Visitors bounce before reading" |
| conversion_rate up | "More visitors become customers" |
| conversion_rate down | "You're losing signups" |
| time_on_page up | "People actually read your page" |
| time_on_page down | "People leave before the good stuff" |
| ctr up | "Your button gets noticed" |
| ctr down | "Your button is invisible" |
| scroll_depth up | "People scroll to see more" |
| scroll_depth down | "People stop scrolling early" |
| form_completion up | "More people finish the form" |
| form_completion down | "People abandon your form" |

## Your Three Tasks

### 1. Detect What Changed
Compare current vs. previous audit. For each change detected, output to the "changes" array:
- What element changed
- What it was before
- What it is now
- Whether the change addresses a previous finding

### 2. Categorize Progress
Map each previous finding to one of three states:
- **validated**: Fixed AND (if analytics available) metrics improved. Celebrate this!
- **watching**: Fixed but waiting for enough data to confirm impact
- **open**: Not yet addressed

Be strict about "validated" — you need evidence, not just a fix.

### 3. Provide Next Suggestions
Based on the current state, what should they focus on next? Output to "suggestions" array.
- Prioritize by impact
- Include predictions using FriendlyText
- Make suggestions copy-paste ready

## Evaluation Quality Standards
When judging if something was "fixed":
- **Differentiation**: Does the new copy pass the "Only" test? Could a competitor say the same?
- **Specificity**: Are there concrete details, numbers, outcomes — not just clearer phrasing?
- **JTBD**: Does it address the job the visitor is trying to accomplish?

Example: "We help you grow" → "SaaS founders: reduce churn 23% in 90 days" = validated candidate
Example: "We help you grow" → "We help startups grow faster" = still open (too generic)

## When Analytics Tools Available (PostHog/GA4)
Call tools strategically (max 5 calls):
1. get_page_stats — understand baseline
2. compare_periods — before/after for key metrics
3. Query specific events if relevant

## When Database Tools Available (Supabase)
Supabase provides REAL business outcomes, not proxy metrics:
- Row counts in tables like "users", "orders", "signups", "waitlist"
- These are actual conversions, not bounce rates or pageviews

Call database tools strategically:
1. discover_tables — see what business data is available
2. identify_conversion_tables — find tables that track conversions
3. get_table_count — check current counts for key tables

When correlating changes with database metrics, be specific:
- "5 new signups since you changed your headline" (real outcome)
- NOT "bounce rate decreased" (proxy metric)

The user cares about: "Did my change get me more customers?"

## Output Schema
Return JSON matching this schema:
{
  "verdict": "<Punchy summary: 'You made 2 changes. One helped. One didn't move the needle.'>",
  "changes": [
    {
      "element": "<display-ready label>",
      "description": "<what changed>",
      "before": "<previous value>",
      "after": "<new value>",
      "detectedAt": "<ISO timestamp or 'this scan'>"
    }
  ],
  "suggestions": [
    {
      "title": "<short title>",
      "element": "<display-ready label>",
      "observation": "<what we noticed>",
      "prediction": {
        "metric": "bounce_rate" | "conversion_rate" | "time_on_page" | "ctr" | "scroll_depth" | "form_completion",
        "direction": "up" | "down",
        "range": "<X-Y%>",
        "friendlyText": "<human-friendly phrase>"
      },
      "suggestedFix": "<copy-paste ready>",
      "impact": "high" | "medium" | "low"
    }
  ],
  "correlation": {
    "hasEnoughData": <true if 7+ days of data>,
    "insights": "<2-3 sentences connecting changes to metrics>",
    "metrics": [
      {
        "name": "bounce_rate",
        "friendlyName": "Bounce Rate",
        "before": <number>,
        "after": <number>,
        "change": "<+X% or -X%>",
        "assessment": "improved" | "regressed" | "neutral"
      }
    ]
  } | null,
  "progress": {
    "validated": <count>,
    "watching": <count>,
    "open": <count>,
    "validatedItems": [
      {
        "id": "<finding id that was validated>",
        "element": "<display label: 'Your Headline'>",
        "title": "<what was fixed: 'Headline made specific'>",
        "metric": "bounce_rate",
        "friendlyText": "<e.g., 'Visitors actually stick around'>",
        "change": "<+8%>"
      }
    ],
    "watchingItems": [
      {
        "id": "<finding id being watched>",
        "element": "<display label>",
        "title": "<what was changed>",
        "daysOfData": <1-6>,
        "daysNeeded": 7
      }
    ],
    "openItems": [
      {
        "id": "<finding id still open>",
        "element": "<display label>",
        "title": "<issue title>",
        "impact": "high" | "medium" | "low"
      }
    ]
  },
  "running_summary": "<2-3 sentence narrative carried forward>"
}

## Progress Item Rules
- validatedItems: Only include if you have metric evidence the change helped
- watchingItems: Fixed items awaiting enough data (daysOfData < 7)
- openItems: Previous findings not yet addressed
- For first scans, openItems should list current findings with their ids

## First Scan (No Previous Findings)
If this is the first scan, return:
- verdict: "Baseline captured. Watching for changes."
- changes: []
- suggestions: from current findings
- correlation: null (no comparison period)
- progress: { validated: 0, watching: 0, open: <count>, validatedItems: [], watchingItems: [], openItems: [...] }`;

export interface PostAnalysisContext {
  analysisId: string;
  userId: string;
  pageUrl: string;
  currentFindings: AnalysisResult["structured"];
  previousFindings?: AnalysisResult["structured"] | null;
  previousRunningSummary?: string | null;
  deployContext?: DeployContext | null;
}

export type AnalyticsCredentialsWithType =
  | ({ type: "posthog" } & AnalyticsCredentials)
  | ({ type: "ga4" } & GA4Credentials);

export interface SupabaseIntegrationCredentials {
  type: "supabase";
  projectUrl: string;
  accessToken: string;
  keyType: "anon" | "service_role";
}

export interface PostAnalysisOptions {
  supabase: SupabaseClient;
  analyticsCredentials?: AnalyticsCredentialsWithType | null;
  databaseCredentials?: SupabaseIntegrationCredentials | null;
}

/**
 * Format deploy context for inclusion in the LLM prompt
 */
function formatDeployContext(deploy: DeployContext): string {
  const lines: string[] = ["## Deploy Context"];
  lines.push("This scan was triggered by a code deploy. Here's what changed:\n");

  const shortSha = deploy.commitSha.slice(0, 7);
  const timestamp = new Date(deploy.commitTimestamp);
  const timeAgo = getTimeAgo(timestamp);

  lines.push(`**Commit:** ${shortSha} (pushed ${timeAgo})`);
  lines.push(`**Author:** ${deploy.commitAuthor}`);
  lines.push(`**Message:** ${deploy.commitMessage}`);

  if (deploy.changedFiles.length > 0) {
    lines.push("\n**Changed Files:**");
    // Show up to 15 files, truncate if more
    const filesToShow = deploy.changedFiles.slice(0, 15);
    for (const file of filesToShow) {
      lines.push(`- ${file}`);
    }
    if (deploy.changedFiles.length > 15) {
      lines.push(`- ...and ${deploy.changedFiles.length - 15} more files`);
    }
  }

  lines.push("\nConsider how these code changes might relate to any page changes you observe.");

  return lines.join("\n");
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
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
  const { currentFindings, previousFindings, previousRunningSummary, pageUrl, deployContext } = context;
  const { supabase, analyticsCredentials, databaseCredentials } = options;

  // Build the prompt
  const promptParts: string[] = [];

  // Add deploy context first if available (most relevant context for this scan)
  if (deployContext) {
    promptParts.push(formatDeployContext(deployContext));
    promptParts.push("");
  }

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
      const providerType = analyticsCredentials.type;

      // Create the appropriate provider based on type
      let provider;
      if (providerType === "posthog") {
        provider = await createProvider("posthog", {
          apiKey: analyticsCredentials.apiKey,
          projectId: analyticsCredentials.projectId,
          host: analyticsCredentials.host,
        });
      } else {
        // GA4 - needs supabase for token refresh
        provider = await createProvider("ga4", {
          accessToken: analyticsCredentials.accessToken,
          refreshToken: analyticsCredentials.refreshToken,
          tokenExpiresAt: analyticsCredentials.tokenExpiresAt,
          propertyId: analyticsCredentials.propertyId,
          integrationId: analyticsCredentials.integrationId,
        }, { supabase });
      }

      tools = createAnalyticsTools({
        provider,
        supabase,
        analysisId: context.analysisId,
        userId: context.userId,
        pageUrl,
        providerType,
      });
      promptParts.push(`\n## Analytics Available\nYou have access to ${providerType === "ga4" ? "Google Analytics 4" : "PostHog"} tools. Use them to correlate changes with metrics.`);
    } catch (err) {
      console.error("Failed to create analytics provider:", err);
      promptParts.push(`\n## Analytics\nAnalytics tools unavailable.`);
    }
  } else {
    promptParts.push(`\n## Analytics\nNo analytics connected.`);
  }

  // Add Supabase database tools if credentials available
  if (databaseCredentials) {
    try {
      const adapter = createSupabaseAdapter(
        databaseCredentials.projectUrl,
        databaseCredentials.accessToken,
        databaseCredentials.keyType
      );

      const databaseTools = createDatabaseTools({
        adapter,
        supabase,
        analysisId: context.analysisId,
        userId: context.userId,
        pageUrl,
      });

      // Merge database tools with existing tools
      tools = { ...tools, ...databaseTools };
      promptParts.push(`\n## Database Available\nYou have access to Supabase database tools. Use them to track REAL business outcomes (signups, orders) rather than proxy metrics.`);
    } catch (err) {
      console.error("Failed to create database adapter:", err);
      promptParts.push(`\n## Database\nDatabase tools unavailable.`);
    }
  }

  // Final note if no tools at all
  if (Object.keys(tools).length === 0) {
    promptParts.push(`Focus on evaluating the changes only.`);
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
  const jsonStr = (jsonMatch[1] ?? result.text).trim();

  let parsed: ChangesSummary;
  try {
    parsed = JSON.parse(jsonStr) as ChangesSummary;
  } catch {
    throw new Error(`Failed to parse post-analysis response as JSON. Raw start: ${result.text.substring(0, 200)}`);
  }

  // Add tool calls metadata
  parsed.tool_calls_made = toolCallsMade;

  // Ensure required fields have defaults if LLM omits them
  if (!parsed.verdict) {
    parsed.verdict = parsed.running_summary || "Analysis complete.";
  }
  if (!parsed.changes) {
    parsed.changes = [];
  }
  if (!parsed.suggestions) {
    parsed.suggestions = [];
  }
  if (!parsed.progress) {
    parsed.progress = { validated: 0, watching: 0, open: 0, validatedItems: [], watchingItems: [], openItems: [] };
  } else {
    // Ensure item arrays exist even if counts are provided
    parsed.progress.validatedItems = parsed.progress.validatedItems ?? [];
    parsed.progress.watchingItems = parsed.progress.watchingItems ?? [];
    parsed.progress.openItems = parsed.progress.openItems ?? [];
  }
  if (!parsed.running_summary) {
    parsed.running_summary = parsed.verdict;
  }

  return parsed;
}
