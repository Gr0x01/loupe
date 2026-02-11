/**
 * Shared URL validation utility for SSRF protection.
 * Blocks internal/private network addresses including IPv6.
 */

export interface UrlValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate URL to prevent SSRF attacks.
 * Blocks internal/private network addresses including IPv6.
 */
export function validateUrl(url: string): UrlValidationResult {
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

/**
 * Simple boolean check for URL validity.
 */
export const isValidUrl = (url: string): boolean => validateUrl(url).valid;
