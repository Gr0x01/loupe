import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only send errors in production
  enabled: process.env.NODE_ENV === "production",

  // Sample 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,

  // Capture 100% of errors
  replaysOnErrorSampleRate: 1.0,
  // Sample 0% of sessions normally (only on error)
  replaysSessionSampleRate: 0,

  // Filter out noisy browser errors
  ignoreErrors: [
    "ResizeObserver loop",
    "Non-Error promise rejection",
    /Loading chunk \d+ failed/,
    /Network request failed/,
  ],
});
