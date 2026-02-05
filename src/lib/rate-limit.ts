/**
 * Simple rate limiter for authenticated API routes.
 * Uses user ID + route as key.
 *
 * Note: In-memory store doesn't persist across serverless instances.
 * For production, consider using Supabase or Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is allowed under rate limit.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    cleanupExpired();
  }

  if (!entry || now >= entry.resetAt) {
    // New window
    const resetAt = now + config.windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt,
    };
  }

  if (entry.count >= config.maxRequests) {
    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  // Increment count
  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Create a rate limit key from user ID and route.
 */
export function rateLimitKey(userId: string, route: string): string {
  return `${userId}:${route}`;
}

/**
 * Remove expired entries from the store.
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}

/**
 * Standard rate limit configs for different routes.
 */
export const RATE_LIMITS = {
  // Pages: 20 creates per hour (generous for normal use)
  pages: { windowMs: 60 * 60 * 1000, maxRequests: 20 },
  // Rescan: 30 rescans per hour
  rescan: { windowMs: 60 * 60 * 1000, maxRequests: 30 },
  // Feedback: 60 feedback items per hour
  feedback: { windowMs: 60 * 60 * 1000, maxRequests: 60 },
} as const;
