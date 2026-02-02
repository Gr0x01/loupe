const SCREENSHOT_URL = process.env.SCREENSHOT_SERVICE_URL!;
const SCREENSHOT_API_KEY = process.env.SCREENSHOT_API_KEY!;

export interface ScreenshotResult {
  base64: string;
  mimeType: "image/jpeg";
}

/**
 * Capture a screenshot of a URL via the Vultr Puppeteer service.
 * Returns base64 JPEG for LLM vision input.
 */
export async function captureScreenshot(
  url: string
): Promise<ScreenshotResult> {
  const params = new URLSearchParams({ url });
  const response = await fetch(`${SCREENSHOT_URL}/screenshot?${params}`, {
    headers: {
      "x-api-key": SCREENSHOT_API_KEY,
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Screenshot failed (${response.status}): ${text}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return {
    base64,
    mimeType: "image/jpeg",
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
