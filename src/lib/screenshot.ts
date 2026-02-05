const SCREENSHOT_URL = process.env.SCREENSHOT_SERVICE_URL!;
const SCREENSHOT_API_KEY = process.env.SCREENSHOT_API_KEY!;

/**
 * Validate URL to prevent SSRF attacks.
 * Blocks internal/private network addresses including IPv6.
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }

  // Only allow HTTP(S)
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { valid: false, error: "Invalid URL protocol" };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block IPv6 addresses entirely (brackets stripped by URL parser)
  // IPv6 loopback ::1, link-local fe80::, unique-local fc/fd, mapped ::ffff:
  if (
    hostname === "::1" ||
    hostname === "::" ||
    hostname.startsWith("::ffff:") ||
    hostname.startsWith("fe80:") ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd") ||
    hostname.includes(":")
  ) {
    return { valid: false, error: "Invalid URL" };
  }

  // Block localhost and loopback
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.")
  ) {
    return { valid: false, error: "Invalid URL" };
  }

  // Block decimal/hex/octal IP representations (e.g., 2130706433, 0x7f000001)
  // These could resolve to private IPs - reject any all-numeric or hex-prefixed hostname
  if (/^[0-9]+$/.test(hostname) || /^0x[0-9a-f]+$/i.test(hostname)) {
    return { valid: false, error: "Invalid URL" };
  }

  // Block private networks (RFC 1918)
  if (
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
  ) {
    return { valid: false, error: "Invalid URL" };
  }

  // Block link-local and AWS metadata
  if (
    hostname.startsWith("169.254.") ||
    hostname === "169.254.169.254"
  ) {
    return { valid: false, error: "Invalid URL" };
  }

  // Block .local and .internal domains
  if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    return { valid: false, error: "Invalid URL" };
  }

  return { valid: true };
}

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

/**
 * Capture a screenshot and extract page metadata via the Vultr Puppeteer service.
 * Returns base64 JPEG + structured metadata from the rendered DOM.
 */
export async function captureScreenshot(
  url: string
): Promise<ScreenshotResult> {
  // SSRF protection: validate URL before sending to screenshot service
  const validation = validateUrl(url);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid URL");
  }

  const params = new URLSearchParams({ url });
  const response = await fetch(
    `${SCREENSHOT_URL}/screenshot-and-extract?${params}`,
    {
      headers: {
        "x-api-key": SCREENSHOT_API_KEY,
      },
      signal: AbortSignal.timeout(45000),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Screenshot failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  return {
    base64: data.screenshot,
    mimeType: "image/jpeg",
    metadata: data.metadata,
  };
}

/**
 * Upload a base64 screenshot to Supabase Storage.
 * Returns the public URL.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function uploadScreenshot(
  supabase: any,
  analysisId: string,
  base64: string
): Promise<string> {
  const buffer = Buffer.from(base64, "base64");
  const path = `analyses/${analysisId}.jpg`;

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
