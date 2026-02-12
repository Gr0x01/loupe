import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Route envelopes through our own domain to avoid ad blockers
  tunnel: "/api/sentry-tunnel",

  // Tag with Vercel deploy info
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV,
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Sample 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Filter out noisy browser errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],
});
