import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import type { HorizonDays, CheckpointAssessment, CheckpointAssessmentResult } from "@/lib/types/analysis";
import { extractJson, sanitizeUserInput, formatChangeHypotheses } from "./pipeline-utils";

const CHECKPOINT_ASSESSMENT_PROMPT = `You are a product analyst assessing whether a page change had a positive, negative, or neutral impact on metrics.

## Your Task
Given a page change and metric data from one or more sources, determine the overall assessment.

## Assessment Rules
- "improved": Metrics show meaningful positive movement that aligns with the change's intent
- "regressed": Metrics show meaningful negative movement
- "neutral": Metrics moved but not meaningfully, or movements cancel out
- "inconclusive": Not enough data to make any determination

## Confidence Bands
- 0.8-1.0: Strong signal — multiple metrics agree, sufficient data volume
- 0.5-0.79: Moderate signal — some metrics agree, or single clear metric
- 0.2-0.49: Weak signal — conflicting metrics, small sample, or short horizon
- 0.0-0.19: Very weak — barely any data, or too early to tell

## Attribution Language
- Never claim causation. Use "associated with", "coincided with", "following the change"
- Reference specific metrics and their sources (PostHog, GA4, Supabase DB)
- If prior checkpoints exist, note the trajectory (improving, worsening, stable)
- If a hypothesis was provided, evaluate whether the evidence supports it

## User Feedback Calibration
If the user provided feedback on prior assessments for this change, factor it in:
- "agreed" = your prior reasoning was sound, continue the pattern
- "disagreed" = reconsider what external factors you may have missed
Do NOT blindly flip your assessment — use feedback as additional context.

## Output
Return JSON only:
{
  "assessment": "improved" | "regressed" | "neutral" | "inconclusive",
  "confidence": 0.0-1.0,
  "reasoning": "2-3 sentences explaining the assessment with specific metric references"
}`;

export interface CheckpointAssessmentContext {
  change: { element: string; before_value: string; after_value: string; description?: string };
  horizonDays: HorizonDays;
  metrics: Array<{ name: string; source?: string; before: number; after: number; change_percent: number }>;
  priorCheckpoints: Array<{ horizon_days: number; assessment: string; reasoning?: string }>;
  hypothesis?: string | null;
  pageFocus?: string | null;
  pageUrl: string;
  priorFeedback?: Array<{
    horizon_days: number;
    feedback_type: 'accurate' | 'inaccurate';
    feedback_text: string | null;
    assessment: string;
  }>;
}

/**
 * LLM-based checkpoint assessment. Returns null on failure (caller falls back to deterministic).
 */
export async function runCheckpointAssessment(
  context: CheckpointAssessmentContext
): Promise<CheckpointAssessmentResult | null> {
  // Build prompt once, retry the LLM call
  const promptParts: string[] = [
    `Page: ${context.pageUrl}`,
    `Horizon: D+${context.horizonDays}`,
    "",
    "## Change",
    `Element: ${sanitizeUserInput(context.change.element, 100)}`,
    `Before: ${sanitizeUserInput(context.change.before_value, 300)}`,
    `After: ${sanitizeUserInput(context.change.after_value, 300)}`,
  ];

  if (context.change.description) {
    promptParts.push(`Description: ${sanitizeUserInput(context.change.description, 200)}`);
  }

  promptParts.push("");

  if (context.metrics.length > 0) {
    promptParts.push("## Metrics");
    for (const m of context.metrics) {
      const src = m.source ? ` [${m.source}]` : "";
      promptParts.push(`- ${m.name}${src}: ${m.before} → ${m.after} (${m.change_percent > 0 ? "+" : ""}${m.change_percent}%)`);
    }
  } else {
    promptParts.push("## Metrics\nNo metric data available.");
  }

  if (context.priorCheckpoints.length > 0) {
    promptParts.push("");
    promptParts.push("## Prior Checkpoints");
    for (const cp of context.priorCheckpoints) {
      const reason = cp.reasoning ? ` — ${cp.reasoning}` : "";
      promptParts.push(`- D+${cp.horizon_days}: ${cp.assessment}${reason}`);
    }
  }

  if (context.hypothesis) {
    promptParts.push("");
    promptParts.push(`## User Hypothesis\n${sanitizeUserInput(context.hypothesis, 500)}`);
  }

  if (context.pageFocus) {
    promptParts.push("");
    promptParts.push(`## Page Focus Metric\n${sanitizeUserInput(context.pageFocus, 200)}`);
  }

  if (context.priorFeedback?.length) {
    promptParts.push("");
    promptParts.push("## User Feedback on Prior Assessments");
    for (const f of context.priorFeedback) {
      const text = f.feedback_text ? ` — "${sanitizeUserInput(f.feedback_text, 500)}"` : "";
      promptParts.push(`- D+${f.horizon_days}: We said "${f.assessment}", user ${f.feedback_type === 'accurate' ? 'agreed' : 'disagreed'}${text}`);
    }
  }

  const prompt = promptParts.join("\n");
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const result = await generateText({
        model: google("gemini-3-pro-preview"),
        system: CHECKPOINT_ASSESSMENT_PROMPT,
        prompt,
        maxOutputTokens: 1024,
      });

      const jsonStr = extractJson(result.text);
      const parsed = JSON.parse(jsonStr);

      // Validate output
      const validAssessments = ["improved", "regressed", "neutral", "inconclusive"];
      if (!validAssessments.includes(parsed.assessment)) {
        console.warn(`[checkpoint-assessment] Invalid assessment: ${parsed.assessment} (attempt ${attempt})`);
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1000 * attempt));
          continue;
        }
        return null;
      }

      const confidence = typeof parsed.confidence === "number"
        ? Math.max(0, Math.min(1, parsed.confidence))
        : 0;

      return {
        assessment: parsed.assessment as CheckpointAssessment,
        confidence: Math.round(confidence * 100) / 100,
        reasoning: typeof parsed.reasoning === "string" ? parsed.reasoning.slice(0, 1000) : "",
      };
    } catch (err) {
      console.warn(`[checkpoint-assessment] LLM call failed (attempt ${attempt}/${MAX_ATTEMPTS}):`, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  }

  return null;
}

const STRATEGY_NARRATIVE_PROMPT = `You are an analyst writing a strategy update after new checkpoint evidence arrived.

## Voice
- Direct and specific. Reference actual metrics and horizons.
- One insight per change. No hedging.
- If a hypothesis was provided, evaluate it against the evidence.

## Output
Return JSON:
{
  "observations": [{ "changeId": "<id>", "text": "<dated, specific observation>" }],
  "strategy_narrative": "<2-4 sentences: page trajectory, evidence, recommended action>",
  "running_summary": "<1-2 sentence running summary update>"
}`;

export interface StrategyNarrativeContext {
  pageUrl: string;
  pageFocus?: string | null;
  checkpointTimeline: string;
  currentRunningSummary?: string | null;
  changeHypotheses?: Array<{ changeId: string; element: string; hypothesis: string }> | null;
}

/**
 * Lightweight text-only LLM call for richer checkpoint observations.
 * No images, no tool calls. Returns null on any failure.
 */
export async function runStrategyNarrative(
  context: StrategyNarrativeContext
): Promise<{ observations: Array<{ changeId: string; text: string }>; strategy_narrative: string; running_summary: string } | null> {
  try {
    const promptParts: string[] = [
      `Page: ${context.pageUrl}`,
      context.checkpointTimeline,
    ];

    if (context.pageFocus) {
      promptParts.push(`Page focus metric: ${sanitizeUserInput(context.pageFocus, 200)}`);
    }
    if (context.currentRunningSummary) {
      promptParts.push(`Current running summary: ${context.currentRunningSummary}`);
    }
    if (context.changeHypotheses?.length) {
      promptParts.push(formatChangeHypotheses(context.changeHypotheses.map(h => ({
        element: h.element,
        hypothesis: h.hypothesis,
      }))));
    }

    const result = await generateText({
      model: google("gemini-3-pro-preview"),
      system: STRATEGY_NARRATIVE_PROMPT,
      prompt: promptParts.join("\n\n"),
      maxOutputTokens: 2048,
    });

    const jsonStr = extractJson(result.text);
    const parsed = JSON.parse(jsonStr);

    return {
      observations: Array.isArray(parsed.observations) ? parsed.observations : [],
      strategy_narrative: parsed.strategy_narrative || "",
      running_summary: parsed.running_summary || "",
    };
  } catch (err) {
    console.warn("[strategy-narrative] LLM call failed:", err);
    return null;
  }
}
