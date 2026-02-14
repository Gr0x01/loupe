import * as Sentry from "@sentry/nextjs";
import { validateUrl } from "./url-validation";

const SCREENSHOT_URL = process.env.SCREENSHOT_SERVICE_URL!;
const SCREENSHOT_API_KEY = process.env.SCREENSHOT_API_KEY!;

export interface PageMetadata {
  meta: {
    title: string | null;
    description: string | null;
    ogTitle: string | null;
    ogDescription: string | null;
    ogImage: string | null;
    viewport: string | null;
    canonical: string | null;
  };
  headings: {
    h1: string[];
    h2: string[];
    h3: string[];
  };
  buttons: { text: string; tag: string; href: string | null }[];
  links: { total: number; external: number };
  images: { total: number; withoutAlt: number };
  forms: number;
  scripts: number;
  stylesheets: number;
  socialProof: {
    hasTestimonials: boolean;
    hasNumbers: boolean;
    hasLogos: boolean;
    hasStarRating: boolean;
  };
  navigation: { text: string; href: string }[];
  hasFooter: boolean;
}

export interface ScreenshotResult {
  base64: string;
  mimeType: "image/jpeg";
  metadata: PageMetadata;
}

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 2000;

/**
 * Capture a screenshot and extract page metadata via the Vultr Puppeteer service.
 * Returns base64 JPEG + structured metadata from the rendered DOM.
 * Retries on 429 (rate limit) with exponential backoff.
 */
export async function captureScreenshot(
  url: string,
  options?: { width?: number }
): Promise<ScreenshotResult> {
  // SSRF protection: validate URL before sending to screenshot service
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid URL");
  }

  const params = new URLSearchParams({ url });
  if (options?.width) {
    params.set("width", String(options.width));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }

    let response: Response;
    try {
      response = await fetch(
        `${SCREENSHOT_URL}/screenshot-and-extract?${params}`,
        {
          headers: {
            "x-api-key": SCREENSHOT_API_KEY,
          },
          signal: AbortSignal.timeout(45000),
        }
      );
    } catch (err) {
      lastError = new Error(
        `Screenshot service ${err instanceof DOMException ? "timed out (45s)" : "unreachable"}: ${err instanceof Error ? err.message : err}`
      );
      if (attempt < MAX_RETRIES) {
        continue;
      }
      Sentry.captureException(lastError, {
        tags: { service: "screenshot", reason: err instanceof DOMException ? "timeout" : "network" },
        extra: { url, width: options?.width, attempt },
      });
      throw lastError;
    }

    if (response.ok) {
      const data = await response.json();
      return {
        base64: data.screenshot,
        mimeType: "image/jpeg",
        metadata: data.metadata,
      };
    }

    const text = await response.text();
    lastError = new Error(`Screenshot failed (${response.status}): ${text}`);

    if (response.status === 429 && attempt < MAX_RETRIES) {
      continue;
    }

    Sentry.captureException(lastError, {
      tags: { service: "screenshot", status: response.status },
      extra: { url, width: options?.width, attempt },
    });
    throw lastError;
  }

  throw lastError!;
}

/**
 * Lightweight health ping — hits the service root with a 10s timeout.
 * Returns true if reachable, false otherwise. Reports failures to Sentry.
 */
export async function pingScreenshotService(): Promise<boolean> {
  try {
    const res = await fetch(SCREENSHOT_URL, {
      headers: { "x-api-key": SCREENSHOT_API_KEY },
      signal: AbortSignal.timeout(10000),
    });
    return res.ok;
  } catch (err) {
    Sentry.captureException(
      new Error(`Screenshot service health check failed: ${err instanceof Error ? err.message : err}`),
      {
        level: "error",
        tags: { service: "screenshot", reason: "health_check" },
      }
    );
    return false;
  }
}

/**
 * Upload a base64 screenshot to Supabase Storage.
 * Returns the public URL.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function uploadScreenshot(
  supabase: any,
  analysisId: string,
  base64: string,
  suffix?: string
): Promise<string> {
  if (suffix && !/^[a-z0-9_-]+$/i.test(suffix)) {
    throw new Error(`Invalid screenshot suffix: ${suffix}`);
  }
  const buffer = Buffer.from(base64, "base64");
  const path = suffix
    ? `analyses/${analysisId}_${suffix}.jpg`
    : `analyses/${analysisId}.jpg`;

  const { error } = await supabase.storage
    .from("screenshots")
    .upload(path, buffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const {
    data: { publicUrl },
  } = supabase.storage.from("screenshots").getPublicUrl(path);

  return publicUrl;
}
