import { describe, it, expect } from "vitest";
import { extractJson, extractMatchingBraces, closeJson } from "../pipeline";

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
});
