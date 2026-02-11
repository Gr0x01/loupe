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

/**
 * Domains that cannot be claimed as monitored pages.
 * Major sites that users don't own — prevents wasted scans from people playing around.
 */
const BLOCKED_DOMAINS = new Set([
  // Search & portals
  "google.com",
  "bing.com",
  "yahoo.com",
  "baidu.com",
  "yandex.ru",
  "duckduckgo.com",
  "ask.com",
  "aol.com",
  "ecosia.org",
  "brave.com",
  // Social media
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "linkedin.com",
  "tiktok.com",
  "snapchat.com",
  "pinterest.com",
  "reddit.com",
  "tumblr.com",
  "threads.net",
  "mastodon.social",
  "bsky.app",
  "quora.com",
  "flickr.com",
  "deviantart.com",
  "myspace.com",
  "nextdoor.com",
  // Video & streaming
  "youtube.com",
  "netflix.com",
  "twitch.tv",
  "spotify.com",
  "hulu.com",
  "disneyplus.com",
  "vimeo.com",
  "dailymotion.com",
  "soundcloud.com",
  "peacocktv.com",
  "paramountplus.com",
  "max.com",
  "crunchyroll.com",
  "pandora.com",
  "deezer.com",
  "tidal.com",
  // Messaging
  "whatsapp.com",
  "telegram.org",
  "discord.com",
  "slack.com",
  "signal.org",
  "messenger.com",
  "skype.com",
  "viber.com",
  // E-commerce
  "amazon.com",
  "ebay.com",
  "walmart.com",
  "target.com",
  "etsy.com",
  "aliexpress.com",
  "shopify.com",
  "bestbuy.com",
  "costco.com",
  "homedepot.com",
  "lowes.com",
  "wayfair.com",
  "shein.com",
  "temu.com",
  "alibaba.com",
  "wish.com",
  "newegg.com",
  "nordstrom.com",
  "macys.com",
  "zappos.com",
  "chewy.com",
  // Tech platforms
  "apple.com",
  "microsoft.com",
  "github.com",
  "gitlab.com",
  "stackoverflow.com",
  "openai.com",
  "anthropic.com",
  "notion.so",
  "figma.com",
  "canva.com",
  "dropbox.com",
  "zoom.us",
  "adobe.com",
  "salesforce.com",
  "atlassian.com",
  "vercel.com",
  "netlify.com",
  "heroku.com",
  "oracle.com",
  "ibm.com",
  "samsung.com",
  "intel.com",
  "nvidia.com",
  "amd.com",
  "dell.com",
  "hp.com",
  "lenovo.com",
  "sony.com",
  "twilio.com",
  "databricks.com",
  "snowflake.com",
  "elastic.co",
  "docker.com",
  "kubernetes.io",
  "hashicorp.com",
  "digitalocean.com",
  "linode.com",
  "render.com",
  "fly.io",
  "railway.app",
  "supabase.com",
  "mongodb.com",
  "redis.com",
  "planetscale.com",
  "neon.tech",
  // News & media
  "cnn.com",
  "bbc.com",
  "nytimes.com",
  "washingtonpost.com",
  "reuters.com",
  "bloomberg.com",
  "forbes.com",
  "techcrunch.com",
  "theverge.com",
  "wired.com",
  "medium.com",
  "substack.com",
  "theguardian.com",
  "wsj.com",
  "usatoday.com",
  "foxnews.com",
  "nbcnews.com",
  "cbsnews.com",
  "apnews.com",
  "huffpost.com",
  "buzzfeed.com",
  "vice.com",
  "mashable.com",
  "engadget.com",
  "arstechnica.com",
  "zdnet.com",
  "cnet.com",
  "businessinsider.com",
  // Finance
  "paypal.com",
  "stripe.com",
  "chase.com",
  "bankofamerica.com",
  "wellsfargo.com",
  "coinbase.com",
  "robinhood.com",
  "venmo.com",
  "cashapp.com",
  "wise.com",
  "revolut.com",
  "binance.com",
  "kraken.com",
  "fidelity.com",
  "schwab.com",
  "vanguard.com",
  "americanexpress.com",
  "capitalone.com",
  "discover.com",
  "citibank.com",
  // Productivity & SaaS
  "outlook.com",
  "office.com",
  "trello.com",
  "asana.com",
  "monday.com",
  "airtable.com",
  "hubspot.com",
  "mailchimp.com",
  "intercom.com",
  "zendesk.com",
  "freshdesk.com",
  "linear.app",
  "clickup.com",
  "basecamp.com",
  "1password.com",
  "lastpass.com",
  "bitwarden.com",
  "calendly.com",
  "loom.com",
  "miro.com",
  "zapier.com",
  "ifttt.com",
  "typeform.com",
  "surveymonkey.com",
  "docusign.com",
  // Hosting & domains
  "godaddy.com",
  "namecheap.com",
  "cloudflare.com",
  "squarespace.com",
  "wix.com",
  "wordpress.com",
  "webflow.com",
  "wordpress.org",
  "bluehost.com",
  "hostinger.com",
  "siteground.com",
  "dreamhost.com",
  // AI tools (people will definitely try these)
  "chatgpt.com",
  "claude.ai",
  "perplexity.ai",
  "midjourney.com",
  "poe.com",
  "character.ai",
  "huggingface.co",
  "replicate.com",
  "stability.ai",
  "runway.ml",
  "jasper.ai",
  "copy.ai",
  // AI coding tools (Loupe's ICP will try their own tools)
  "lovable.dev",
  "bolt.new",
  "cursor.com",
  "v0.dev",
  "replit.com",
  "base44.com",
  "codeium.com",
  "tabnine.com",
  // Travel & food
  "tripadvisor.com",
  "booking.com",
  "airbnb.com",
  "expedia.com",
  "kayak.com",
  "hotels.com",
  "vrbo.com",
  "uber.com",
  "lyft.com",
  "doordash.com",
  "grubhub.com",
  "ubereats.com",
  "instacart.com",
  "yelp.com",
  "opentable.com",
  // Misc major
  "wikipedia.org",
  "craigslist.org",
  "imdb.com",
  "archive.org",
  "weather.com",
  "espn.com",
  "nfl.com",
  "nba.com",
  "mlb.com",
  "twitch.tv",
  "roblox.com",
  "epicgames.com",
  "steampowered.com",
  "ea.com",
  "xbox.com",
  "playstation.com",
  "nintendo.com",
  // Loupe itself
  "getloupe.io",
]);

/** TLDs that are entirely blocked — nobody owns these. */
const BLOCKED_TLDS = new Set(["gov", "edu", "mil"]);

/**
 * Check if a URL belongs to a blocked domain.
 * Matches the root domain and all subdomains (e.g. "mail.google.com" matches "google.com").
 */
export function isBlockedDomain(url: string): boolean {
  let hostname: string;
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    return false;
  }

  // Check exact match and parent domains
  // e.g. for "mail.google.com", check "mail.google.com", "google.com"
  const parts = hostname.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    const domain = parts.slice(i).join(".");
    if (BLOCKED_DOMAINS.has(domain)) {
      return true;
    }
  }

  // Block entire TLDs (.gov, .edu, .mil)
  const tld = parts[parts.length - 1];
  if (BLOCKED_TLDS.has(tld)) {
    return true;
  }

  return false;
}
