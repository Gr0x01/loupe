const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

const { KnownDevices } = require("puppeteer");
const MOBILE_DEVICE = {
  ...KnownDevices["iPhone 14"],
  viewport: { ...KnownDevices["iPhone 14"].viewport, deviceScaleFactor: 1 },
};

const API_KEY = process.env.API_KEY || "<REDACTED — see SCREENSHOT_API_KEY in .env.local>";
const PORT = process.env.PORT || 3333;
const MAX_CONCURRENT = 3;
let activeTasks = 0;

// Decodo residential proxy
const PROXY_URL = "http://gate.decodo.com:7000";
const PROXY_USER = process.env.PROXY_USER || "spnouemsou";
const PROXY_PASS = process.env.PROXY_PASS || "=xw9EhzpjrqPi53VA1";

// Browser pool
let proxyBrowser = null;
let directBrowser = null;

const BLOCKED_DOMAINS = [
  "google-analytics.com", "googletagmanager.com", "segment.com",
  "mixpanel.com", "amplitude.com", "heapanalytics.com", "clarity.ms",
  "fullstory.com", "hotjar.com", "facebook.net", "fbevents",
  "sentry.io", "bugsnag.com", "intercom.io", "crisp.chat",
  "doubleclick.net", "googlesyndication.com", "adservice.google.com",
];

const BLOCKED_RESOURCE_TYPES = ["media", "websocket", "eventsource"];

async function launchBrowser(useProxy) {
  const args = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--no-zygote",
    "--single-process",
  ];
  if (useProxy) args.push(`--proxy-server=${PROXY_URL}`);

  return puppeteer.launch({
    headless: "new",
    args,
    executablePath: "/usr/bin/google-chrome-stable",
  });
}

async function initBrowsers() {
  console.log("Warming up browser pool...");
  [proxyBrowser, directBrowser] = await Promise.all([
    launchBrowser(true),
    launchBrowser(false),
  ]);
  console.log("Browser pool ready (proxy + direct)");
}

function isPrivateIP(hostname) {
  const patterns = [
    /^localhost$/i, /^127\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./,
    /^192\.168\./, /^0\./, /^169\.254\./, /^::1$/, /^fc00:/i, /^fe80:/i,
  ];
  return patterns.some((p) => p.test(hostname));
}

async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const maxHeight = 15000;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        const scrollHeight = document.body.scrollHeight;
        if (totalHeight >= scrollHeight || totalHeight >= maxHeight) {
          clearInterval(timer);
          window.scrollTo(0, 0);
          resolve();
        }
      }, 150);
    });
  });
  await new Promise((r) => setTimeout(r, 1500));
}

async function navigateWithRetry(page, url, opts = {}) {
  const { timeout = 25000, retries = 1 } = opts;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout });
      return;
    } catch (err) {
      const msg = err.message || "";
      const isFrameDetached =
        msg.includes("frame was detached") ||
        msg.includes("net::ERR_ABORTED");
      if (isFrameDetached && attempt < retries) {
        console.log(`Frame detached, retrying ${url} (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

async function extractMetadata(page) {
  return page.evaluate(() => {
    const getMeta = (name) => {
      const el = document.querySelector(`meta[name="${name}"], meta[property="${name}"], meta[property="og:${name}"]`);
      return el ? el.getAttribute("content") : null;
    };
    const getHeadings = (tag) =>
      [...document.querySelectorAll(tag)].map((el) => el.textContent.trim()).filter(Boolean);
    const buttons = [...document.querySelectorAll("button, a.btn, a.button, [role='button'], input[type='submit']")]
      .slice(0, 20)
      .map((el) => ({
        text: el.textContent.trim().substring(0, 100),
        tag: el.tagName.toLowerCase(),
        href: el.getAttribute("href"),
      }));
    const allLinks = [...document.querySelectorAll("a[href]")];
    const externalLinks = allLinks.filter((a) => {
      try { return new URL(a.href).hostname !== location.hostname; } catch { return false; }
    });
    const images = [...document.querySelectorAll("img")];
    const nav = [...document.querySelectorAll("nav a, header a")].slice(0, 15).map((a) => ({
      text: a.textContent.trim().substring(0, 50),
      href: a.getAttribute("href"),
    }));
    const bodyText = document.body.innerText.toLowerCase();
    return {
      meta: {
        title: document.title || null,
        description: getMeta("description"),
        ogTitle: getMeta("og:title"),
        ogDescription: getMeta("og:description"),
        ogImage: getMeta("og:image"),
        viewport: getMeta("viewport"),
        canonical: document.querySelector("link[rel='canonical']")?.getAttribute("href") || null,
      },
      headings: { h1: getHeadings("h1"), h2: getHeadings("h2"), h3: getHeadings("h3") },
      buttons,
      links: { total: allLinks.length, external: externalLinks.length },
      images: { total: images.length, withoutAlt: images.filter((i) => !i.alt).length },
      forms: document.querySelectorAll("form").length,
      scripts: document.querySelectorAll("script").length,
      stylesheets: document.querySelectorAll("link[rel='stylesheet']").length,
      socialProof: {
        hasTestimonials: /testimonial|review|said|quote/i.test(bodyText),
        hasNumbers: /\d+[,.]?\d*\s*(\+|customers|users|clients|downloads|companies)/i.test(bodyText),
        hasLogos: document.querySelectorAll("img[alt*='logo'], img[class*='logo'], img[src*='logo']").length > 0,
        hasStarRating: /★|⭐|star|rating/i.test(bodyText) || document.querySelectorAll("[class*='star'], [class*='rating']").length > 0,
      },
      navigation: nav,
      hasFooter: document.querySelector("footer") !== null,
    };
  });
}

const app = express();

app.use((req, res, next) => {
  if (req.path === "/health") return next();
  if (req.headers["x-api-key"] !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", active: activeTasks });
});

app.get("/screenshot-and-extract", async (req, res) => {
  const url = req.query.url;
  const useProxy = req.query.proxy !== "false";
  const isMobile = req.query.width && parseInt(req.query.width, 10) < 500;

  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Invalid protocol" });
    }
    if (isPrivateIP(parsed.hostname)) {
      return res.status(400).json({ error: "Private IPs not allowed" });
    }
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (activeTasks >= MAX_CONCURRENT) {
    return res.status(429).json({ error: "Too many concurrent requests" });
  }

  activeTasks++;
  let page;
  try {
    const browser = useProxy ? proxyBrowser : directBrowser;
    page = await browser.newPage();

    if (useProxy) {
      await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
    }

    if (isMobile) {
      await page.emulate(MOBILE_DEVICE);
    } else {
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
      await page.setUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
      );
    }

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const reqUrl = request.url();
      if (BLOCKED_RESOURCE_TYPES.includes(request.resourceType())) {
        return request.abort();
      }
      if (BLOCKED_DOMAINS.some((d) => reqUrl.includes(d))) {
        return request.abort();
      }
      request.continue();
    });

    await navigateWithRetry(page, url);
    await new Promise((r) => setTimeout(r, 2500));
    await autoScroll(page);

    const screenshot = await page.screenshot({
      type: "jpeg",
      quality: 80,
      fullPage: true,
    });

    const metadata = await Promise.race([
      extractMetadata(page),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Metadata extraction timeout")), 5000)),
    ]).catch(() => null);

    res.json({
      screenshot: Buffer.from(screenshot).toString("base64"),
      metadata: metadata || { meta: {}, headings: {}, buttons: [], links: {}, images: {}, forms: 0, scripts: 0, stylesheets: 0, socialProof: {}, navigation: [], hasFooter: false },
    });
  } catch (err) {
    console.error("Screenshot error:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    activeTasks--;
    if (page) await page.close().catch(() => {});
  }
});

app.get("/screenshot", async (req, res) => {
  const url = req.query.url;
  const useProxy = req.query.proxy !== "false";

  if (!url) return res.status(400).json({ error: "url required" });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({ error: "Invalid protocol" });
    }
    if (isPrivateIP(parsed.hostname)) {
      return res.status(400).json({ error: "Private IPs not allowed" });
    }
  } catch {
    return res.status(400).json({ error: "Invalid URL" });
  }

  if (activeTasks >= MAX_CONCURRENT) {
    return res.status(429).json({ error: "Too many concurrent requests" });
  }

  activeTasks++;
  let page;
  try {
    const browser = useProxy ? proxyBrowser : directBrowser;
    page = await browser.newPage();

    if (useProxy) {
      await page.authenticate({ username: PROXY_USER, password: PROXY_PASS });
    }

    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

    await page.setRequestInterception(true);
    page.on("request", (request) => {
      const reqUrl = request.url();
      if (BLOCKED_RESOURCE_TYPES.includes(request.resourceType())) return request.abort();
      if (BLOCKED_DOMAINS.some((d) => reqUrl.includes(d))) return request.abort();
      request.continue();
    });

    await navigateWithRetry(page, url);
    await new Promise((r) => setTimeout(r, 2500));
    await autoScroll(page);

    const screenshot = await page.screenshot({ type: "jpeg", quality: 80, fullPage: true });
    const buf = Buffer.from(screenshot);
    res.set("Content-Type", "image/jpeg");
    res.set("Content-Length", buf.length.toString());
    res.end(buf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    activeTasks--;
    if (page) await page.close().catch(() => {});
  }
});

// Browser crash recovery
async function ensureBrowsers() {
  try {
    if (!proxyBrowser || !proxyBrowser.isConnected()) {
      console.log("Proxy browser down, relaunching...");
      proxyBrowser = await launchBrowser(true);
    }
    if (!directBrowser || !directBrowser.isConnected()) {
      console.log("Direct browser down, relaunching...");
      directBrowser = await launchBrowser(false);
    }
  } catch (err) {
    console.error("Browser recovery failed:", err.message);
  }
}

setInterval(ensureBrowsers, 30000);

initBrowsers().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Screenshot service running on :${PORT}`);
  });
});
