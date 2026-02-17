import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Sentry before importing the module under test
vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
  captureMessage: vi.fn(),
}));

import * as Sentry from "@sentry/nextjs";
import { resyncInngest } from "../resync";

describe("resyncInngest", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://getloupe.io";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends PUT to production URL, not VERCEL_URL", async () => {
    process.env.VERCEL_URL = "myapp-abc123.vercel.app";
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    await resyncInngest();

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe("https://getloupe.io/api/inngest");
    expect(url).not.toContain("myapp-abc123");
    expect(options.method).toBe("PUT");

    delete process.env.VERCEL_URL;
  });

  it("falls back to hardcoded URL when NEXT_PUBLIC_APP_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const mockFetch = vi.fn().mockResolvedValue({ ok: true });
    globalThis.fetch = mockFetch;

    await resyncInngest();

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe("https://getloupe.io/api/inngest");
  });

  it("reports non-2xx responses to Sentry", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await resyncInngest();

    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("500"),
      expect.objectContaining({
        tags: { function: "resyncInngest" },
        level: "warning",
      })
    );
  });

  it("reports 404 responses to Sentry", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await resyncInngest();

    expect(Sentry.captureMessage).toHaveBeenCalledOnce();
    expect(Sentry.captureMessage).toHaveBeenCalledWith(
      expect.stringContaining("404"),
      expect.objectContaining({ level: "warning" })
    );
  });

  it("does not report successful responses to Sentry", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });

    await resyncInngest();

    expect(Sentry.captureMessage).not.toHaveBeenCalled();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it("reports network errors to Sentry without throwing", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await resyncInngest(); // should not throw

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({ message: "ECONNREFUSED" }),
      expect.objectContaining({
        tags: { function: "resyncInngest" },
      })
    );
  });
});
