import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractJson, extractMatchingBraces, closeJson } from "../pipeline-utils";

// Mock external dependencies for reconcileChanges tests
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-model"),
}));
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe("extractJson", () => {
  it("extracts JSON from markdown code block", () => {
    const text = 'Here is the result:\n```json\n{"key": "value"}\n```';
    expect(extractJson(text)).toBe('{"key": "value"}');
  });

  it("extracts JSON from code block without json tag", () => {
    const text = 'Result:\n```\n{"key": "value"}\n```';
    expect(extractJson(text)).toBe('{"key": "value"}');
  });

  it("extracts JSON with text preamble (Gemini-style)", () => {
    const text = 'Here is my analysis of the page:\n\n{"verdict": "Good page", "changes": []}';
    const result = extractJson(text);
    expect(JSON.parse(result)).toEqual({ verdict: "Good page", changes: [] });
  });

  it("passes through valid JSON directly", () => {
    const text = '{"key": "value", "nested": {"a": 1}}';
    expect(extractJson(text)).toBe(text);
  });

  it("returns raw text when no JSON found", () => {
    const text = "No JSON here, just text.";
    expect(extractJson(text)).toBe(text);
  });

  it("handles nested objects with strings containing braces", () => {
    const json = '{"text": "Hello {world}", "nested": {"key": "val"}}';
    const text = `Some preamble.\n${json}\nSome postamble.`;
    const result = extractJson(text);
    expect(JSON.parse(result)).toEqual({
      text: "Hello {world}",
      nested: { key: "val" },
    });
  });

  it("handles truncated JSON with closeJson fallback", () => {
    const text = '{"verdict": "Test", "changes": [{"element": "headline"}';
    const result = extractJson(text);
    // Should be parseable after closeJson fixes it
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.verdict).toBe("Test");
  });

  it("repairs code block with malformed content (Bug 3 — Tier 1 bypass)", () => {
    // Code block regex matches but content has unescaped quote
    const text = '```json\n{"title": "She said "hello" today"}\n```';
    const result = extractJson(text);
    expect(() => JSON.parse(result)).not.toThrow();
    // Should recover the title in some form
    const parsed = JSON.parse(result);
    expect(parsed.title).toBeDefined();
  });

  it("repairs mid-stream missing comma (Bug 2 — jsonrepair tier)", () => {
    // Missing comma between object properties
    const text = '{"verdict": "Good" "changes": []}';
    const result = extractJson(text);
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.verdict).toBe("Good");
    expect(parsed.changes).toEqual([]);
  });
});

describe("extractMatchingBraces", () => {
  it("extracts balanced JSON object", () => {
    const text = 'prefix {"a": 1} suffix';
    const idx = text.indexOf("{");
    expect(extractMatchingBraces(text, idx)).toBe('{"a": 1}');
  });

  it("handles nested braces", () => {
    const text = '{"a": {"b": {"c": 1}}}';
    expect(extractMatchingBraces(text, 0)).toBe(text);
  });

  it("handles braces inside strings", () => {
    const text = '{"text": "hello { world }"}';
    expect(extractMatchingBraces(text, 0)).toBe(text);
  });

  it("handles escaped quotes in strings", () => {
    const text = '{"text": "say \\"hello\\""}';
    expect(extractMatchingBraces(text, 0)).toBe(text);
  });

  it("returns everything when no matching close found (truncated)", () => {
    const text = '{"a": {"b": 1}';
    expect(extractMatchingBraces(text, 0)).toBe('{"a": {"b": 1}');
  });
});

describe("closeJson", () => {
  it("closes single unclosed brace", () => {
    const json = '{"key": "value"';
    const result = closeJson(json);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("closes nested unclosed braces", () => {
    const json = '{"a": {"b": 1}';
    const result = closeJson(json);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ a: { b: 1 } });
  });

  it("closes unclosed array and brace", () => {
    const json = '{"items": [1, 2, 3';
    const result = closeJson(json);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("strips trailing incomplete key", () => {
    const json = '{"key": "value", "incomp';
    const result = closeJson(json);
    expect(() => JSON.parse(result)).not.toThrow();
    expect(JSON.parse(result)).toEqual({ key: "value" });
  });

  it("strips trailing comma", () => {
    const json = '{"key": "value",';
    const result = closeJson(json);
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("passes through already valid JSON", () => {
    const json = '{"key": "value"}';
    expect(closeJson(json)).toBe(json);
  });

  it("closes mixed brace+bracket nesting in correct LIFO order", () => {
    // {"findings": [{"title": "test"  →  should close "}]}" not "]}}"
    const json = '{"findings": [{"title": "test"';
    const result = closeJson(json);
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed.findings[0].title).toBe("test");
  });
});

// Import after mocks are set up
import { reconcileChanges } from "../pipeline-utils";
import { generateText } from "ai";
import type { PendingChange } from "../pipeline-utils";

const mockGenerateText = vi.mocked(generateText);

function makeRawChanges(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    element: `Element ${i + 1}`,
    before: `before-${i}`,
    after: `after-${i}`,
    scope: "element" as const,
  }));
}

function makeWatching(count: number): PendingChange[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `watch-${i + 1}`,
    element: `Watching Element ${i + 1}`,
    before_value: `old-${i}`,
    after_value: `current-${i}`,
    scope: "element" as const,
    first_detected_at: new Date(Date.now() - 86400000 * (i + 5)).toISOString(),
  }));
}

describe("reconcileChanges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for empty raw changes", async () => {
    const result = await reconcileChanges([], [], "https://example.com");
    expect(result).toBeNull();
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("returns overhaul with aggregate and supersessions", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        magnitude: "overhaul",
        finalChanges: [
          { element: "Page Redesign", description: "Complete overhaul", before: "Old layout", after: "New layout", scope: "page", final_ref: "agg_1", action: "insert" },
        ],
        supersessions: [
          { old_id: "watch-1", final_ref: "agg_1" },
          { old_id: "watch-2", final_ref: "agg_1" },
          { old_id: "watch-3", final_ref: "agg_1" },
        ],
      }),
    } as never);

    const result = await reconcileChanges(makeRawChanges(6), makeWatching(3), "https://example.com/pricing");

    expect(result).not.toBeNull();
    expect(result!.magnitude).toBe("overhaul");
    expect(result!.finalChanges).toHaveLength(1);
    expect(result!.finalChanges[0].scope).toBe("page");
    expect(result!.supersessions).toHaveLength(3);
  });

  it("returns incremental with match and insert", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        magnitude: "incremental",
        finalChanges: [
          { element: "Headline", description: "Updated", before: "Old", after: "New", scope: "element", final_ref: "match_1", action: "match", matched_change_id: "watch-1" },
          { element: "CTA", description: "New button", before: "Start", after: "Get Started", scope: "element", final_ref: "inc_1", action: "insert" },
        ],
        supersessions: [],
      }),
    } as never);

    const result = await reconcileChanges(makeRawChanges(2), makeWatching(2), "https://example.com");

    expect(result).not.toBeNull();
    expect(result!.magnitude).toBe("incremental");
    expect(result!.finalChanges).toHaveLength(2);
    expect(result!.finalChanges[0].action).toBe("match");
    expect(result!.finalChanges[0].matched_change_id).toBe("watch-1");
    expect(result!.finalChanges[1].action).toBe("insert");
    expect(result!.supersessions).toHaveLength(0);
  });

  it("returns null on LLM failure (non-fatal)", async () => {
    mockGenerateText.mockRejectedValueOnce(new Error("LLM timeout"));

    const result = await reconcileChanges(makeRawChanges(3), makeWatching(1), "https://example.com");

    expect(result).toBeNull();
  });

  it("returns null when LLM returns empty finalChanges", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        magnitude: "overhaul",
        finalChanges: [],
        supersessions: [],
      }),
    } as never);

    const result = await reconcileChanges(makeRawChanges(6), makeWatching(3), "https://example.com");

    expect(result).toBeNull();
  });

  it("filters out supersessions with unknown old_id", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        magnitude: "overhaul",
        finalChanges: [
          { element: "Redesign", description: "All new", before: "Old", after: "New", scope: "page", final_ref: "agg_1", action: "insert" },
        ],
        supersessions: [
          { old_id: "watch-1", final_ref: "agg_1" },
          { old_id: "hallucinated-id", final_ref: "agg_1" }, // doesn't exist
        ],
      }),
    } as never);

    const result = await reconcileChanges(makeRawChanges(6), makeWatching(1), "https://example.com");

    expect(result).not.toBeNull();
    expect(result!.supersessions).toHaveLength(1);
    expect(result!.supersessions[0].old_id).toBe("watch-1");
  });

  it("demotes match to insert when matched_change_id is unknown", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        magnitude: "incremental",
        finalChanges: [
          { element: "Headline", description: "Updated", before: "Old", after: "New", scope: "element", final_ref: "match_1", action: "match", matched_change_id: "nonexistent-id" },
        ],
        supersessions: [],
      }),
    } as never);

    const result = await reconcileChanges(makeRawChanges(1), makeWatching(1), "https://example.com");

    expect(result).not.toBeNull();
    expect(result!.finalChanges[0].action).toBe("insert");
    expect(result!.finalChanges[0].matched_change_id).toBeUndefined();
  });

  it("returns null for invalid magnitude", async () => {
    mockGenerateText.mockResolvedValueOnce({
      text: JSON.stringify({
        magnitude: "massive",
        finalChanges: [{ element: "X", description: "", before: "", after: "", scope: "page", final_ref: "agg_1", action: "insert" }],
        supersessions: [],
      }),
    } as never);

    const result = await reconcileChanges(makeRawChanges(1), [], "https://example.com");

    expect(result).toBeNull();
  });
});
