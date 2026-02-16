import * as Sentry from "@sentry/nextjs";
import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import sharp from "sharp";
import type { QuickDiffResult } from "@/lib/types/analysis";
import { extractJson, formatWatchingCandidates } from "./pipeline-utils";
import type { PendingChange } from "./pipeline-utils";

/**
 * Quick diff prompt for Haiku - lightweight change detection.
 * Used for deploy scans to detect visual changes without full analysis.
 */
const QUICK_DIFF_PROMPT = `You are a visual change detector. Compare two screenshots of the same webpage and identify what changed.

## Your Task
Look at both screenshots and identify any visible changes. Focus on:
- Text/copy changes (headlines, CTAs, descriptions)
- Layout changes (element positions, sections added/removed)
- Visual changes (colors, images, design elements)

## Aggregation Rules
**For 1-3 specific element changes:**
- Itemize each change separately
- Set scope: "element"
- Example: { element: "Your Headline", before: "Start free", after: "Get started today", scope: "element" }

**For multiple related changes in one area:**
- Aggregate to section level
- Set scope: "section"
- Example: { element: "Hero Section", description: "Hero layout redesigned", before: "3 decorative elements", after: "Clean minimal design", scope: "section" }

**For major redesigns (layout restructured, many sections changed):**
- Aggregate to page level
- Set scope: "page"
- Example: { element: "Page Redesign", description: "Complete visual overhaul", before: "Old design with gradients", after: "New brutalist design", scope: "page" }

## Change Linkage
You may receive Active Watching Changes — existing tracked changes. For each change you detect:
1. If it matches an existing watching change (same element/area, same modification), set matched_change_id to its ID with confidence 0.7-1.0
2. If no match or unsure, set matched_change_id to null with confidence 0.0-0.3
3. Always provide brief rationale

## Output Schema
Return JSON:
{
  "hasChanges": boolean,
  "changes": [
    {
      "element": "<what changed - display-ready label>",
      "scope": "element" | "section" | "page",
      "before": "<previous state>",
      "after": "<new state>",
      "description": "<optional: what changed>",
      "matched_change_id": "<ID from Active Watching Changes if same change, or null>",
      "match_confidence": <0.0-1.0>,
      "match_rationale": "<why this matches or doesn't>"
    }
  ]
}

If the pages look identical, return: { "hasChanges": false, "changes": [] }

## Important: Ignore Screenshot Artifacts
Do NOT report changes that are merely:
- JPEG compression differences or color banding
- Anti-aliasing or font rendering variance
- Tiny positioning shifts (<5 pixels)
- Browser rendering differences (shadows, gradients)
- Skeleton loaders, blank voids, gray placeholder blocks, or unloaded lazy content on EITHER viewport (these are headless browser capture failures, not real changes)
- Cookie consent banners appearing or disappearing between captures

Only report substantive changes: text rewrites, layout restructuring, visual design changes, functional changes. If the pages look essentially identical, return { "hasChanges": false, "changes": [] }.

Be concise. Focus on meaningful changes, not minor rendering differences.

IMPORTANT: Respond with ONLY the JSON object. No text before or after it.`;

/**
 * Cap image height at maxPx (default 7500) to stay under Anthropic's 8000px limit.
 * Returns a data URI. Passes through images already under the limit.
 */
async function capImageHeight(base64: string, maxPx = 7500): Promise<string> {
  const buf = Buffer.from(base64, "base64");
  const meta = await sharp(buf).metadata();
  if (!meta.height || meta.height <= maxPx) {
    return `data:image/jpeg;base64,${base64}`;
  }
  const resized = await sharp(buf)
    .resize({ height: maxPx, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${resized.toString("base64")}`;
}

/**
 * Fetch an image URL and return a height-capped data URI.
 */
async function fetchAndCapImage(url: string, maxPx = 7500): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buf).metadata();
  if (!meta.height || meta.height <= maxPx) {
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  }
  const resized = await sharp(buf)
    .resize({ height: maxPx, withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return `data:image/jpeg;base64,${resized.toString("base64")}`;
}

/**
 * Run a quick visual diff between two screenshots using Haiku.
 * This is a lightweight alternative to full analysis for deploy detection.
 *
 * Cost: ~$0.01 per comparison (vs ~$0.06 for full analysis)
 *
 * @param baselineScreenshotUrl - URL of the baseline screenshot
 * @param currentScreenshotBase64 - Base64 of the current screenshot
 * @returns QuickDiffResult with detected changes
 */
export async function runQuickDiff(
  baselineScreenshotUrl: string,
  currentScreenshotBase64: string,
  baselineMobileUrl?: string | null,
  currentMobileBase64?: string | null,
  watchingCandidates?: PendingChange[] | null
): Promise<QuickDiffResult> {
  const hasMobile = baselineMobileUrl && currentMobileBase64;

  let promptText = hasMobile
    ? "Compare these screenshots of the same webpage. Images 1-2 are DESKTOP (baseline then current). Images 3-4 are MOBILE 390px (baseline then current). Identify what changed."
    : "Compare these two screenshots of the same webpage. The first image is the BASELINE (previous state). The second image is the CURRENT state. Identify what changed.";

  // Inject watching candidates for linkage
  if (watchingCandidates && watchingCandidates.length > 0) {
    promptText = formatWatchingCandidates(watchingCandidates) + "\n" + promptText;
  }

  // Cap all images to 7500px height (Anthropic's limit is 8000px)
  const [baselineDataUri, currentDataUri] = await Promise.all([
    fetchAndCapImage(baselineScreenshotUrl),
    capImageHeight(
      currentScreenshotBase64.startsWith("data:")
        ? currentScreenshotBase64.split(",")[1]
        : currentScreenshotBase64
    ),
  ]);

  const contentParts: Array<{ type: "text"; text: string } | { type: "image"; image: string }> = [
    { type: "text", text: promptText },
    { type: "image", image: baselineDataUri },
    { type: "image", image: currentDataUri },
  ];

  if (hasMobile) {
    const [mobileBaselineUri, mobileCurrentUri] = await Promise.all([
      fetchAndCapImage(baselineMobileUrl!),
      capImageHeight(
        currentMobileBase64!.startsWith("data:")
          ? currentMobileBase64!.split(",")[1]
          : currentMobileBase64!
      ),
    ]);
    contentParts.push(
      { type: "image", image: mobileBaselineUri },
      { type: "image", image: mobileCurrentUri }
    );
  }

  const { text } = await generateText({
    model: anthropic("claude-3-5-haiku-latest"),
    messages: [
      {
        role: "user",
        content: contentParts,
      },
    ],
    system: QUICK_DIFF_PROMPT,
    maxOutputTokens: 2048,
  });

  // Extract JSON from response (handles text preamble and truncated code blocks)
  const jsonStr = extractJson(text);

  let result: QuickDiffResult;
  try {
    result = JSON.parse(jsonStr) as QuickDiffResult;
  } catch (parseErr) {
    Sentry.captureException(parseErr, {
      tags: { pipeline: "quick-diff", step: "json-parse" },
      extra: { rawStart: text.substring(0, 500) },
    });
    console.error("Quick diff JSON parse failed. Raw response:", text);
    throw new Error(`Quick diff returned invalid JSON: ${text.substring(0, 300)}`);
  }

  // Validate and normalize the result
  if (!result.changes || !Array.isArray(result.changes)) {
    result.changes = [];
  }

  // Ensure hasChanges is a boolean (LLM might return string "true")
  if (typeof result.hasChanges !== "boolean") {
    result.hasChanges = result.changes.length > 0;
  }

  // Normalize scope field on each change
  for (const change of result.changes) {
    if (!change.scope) {
      change.scope = "element";
    }
  }

  return result;
}
