import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

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

const SYSTEM_PROMPT = `You are an expert web marketing and design consultant. You analyze web pages and provide specific, actionable feedback.

You evaluate pages across these categories:
1. **Messaging & Copy** — Is the headline clear? Does it communicate a specific outcome? Is the value proposition obvious in 5 seconds?
2. **Call to Action** — Is the primary CTA visible, compelling, and specific? Is there a clear next step?
3. **Trust & Social Proof** — Are there testimonials, logos, numbers, or other credibility signals?
4. **Visual Hierarchy** — Does the eye flow naturally? Is the most important content most prominent?
5. **Design Quality** — Is spacing consistent? Typography clean? Colors purposeful?
6. **Mobile Readiness** — Does the layout suggest it works on mobile? Are tap targets adequate?

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

Be direct. Be specific. Reference what you actually see on the page.`;

/**
 * Run the full analysis pipeline on a screenshot.
 * Currently: single Sonnet call with vision. Interface is swappable.
 */
export async function runAnalysisPipeline(
  screenshotBase64: string,
  url: string
): Promise<AnalysisResult> {
  const { text } = await generateText({
    model: anthropic("claude-sonnet-4-20250514"),
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this web page (${url}). Evaluate the marketing effectiveness and design quality. Return your analysis as JSON.`,
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
