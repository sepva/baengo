import { Context, Next } from "hono";
import { RateLimitError } from "../utils/error-mapper";

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
  keyPrefix: string; // unique prefix per endpoint to namespace KV keys
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory fallback used only during local development (wrangler dev without KV)
const memoryStore = new Map<string, RateLimitEntry>();

/**
 * KV-backed rate limiting middleware for Hono.
 * Uses Cloudflare KV (RATE_LIMIT_KV binding) for distributed state so limits
 * are enforced consistently across all Worker instances / regions.
 * Falls back to in-memory when KV is not available (local dev without binding).
 *
 * Free-tier KV usage is minimised by:
 *  - Only writing to KV when the request is allowed (rate-limited requests skip the write).
 *  - Setting a TTL equal to the window so expired keys are deleted automatically.
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const key = `rl:${config.keyPrefix}:${ip}`;
    const now = Date.now();

    const kv: KVNamespace | undefined = (c.env as any).RATE_LIMIT_KV;

    // Read current entry from KV or memory fallback
    let entry: RateLimitEntry | null = null;
    if (kv) {
      entry = await kv.get<RateLimitEntry>(key, "json");
    } else {
      entry = memoryStore.get(key) ?? null;
    }

    // Start a new window if no entry exists or the window has expired
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      const ttlSeconds = Math.ceil(config.windowMs / 1000);
      if (kv) {
        await kv.put(key, JSON.stringify(newEntry), {
          expirationTtl: ttlSeconds,
        });
      } else {
        memoryStore.set(key, newEntry);
      }
      c.header("X-RateLimit-Limit", config.maxRequests.toString());
      c.header("X-RateLimit-Remaining", (config.maxRequests - 1).toString());
      await next();
      return;
    }

    const newCount = entry.count + 1;
    const remaining = Math.max(0, config.maxRequests - newCount);
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    c.header("X-RateLimit-Limit", config.maxRequests.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());

    // Reject without writing — saves a KV write for every abusive request
    if (newCount > config.maxRequests) {
      c.header("Retry-After", retryAfter.toString());
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      );
    }

    // Allowed — persist the incremented count
    const updatedEntry: RateLimitEntry = {
      count: newCount,
      resetTime: entry.resetTime,
    };
    if (kv) {
      await kv.put(key, JSON.stringify(updatedEntry), {
        expirationTtl: retryAfter,
      });
    } else {
      memoryStore.set(key, updatedEntry);
    }

    await next();
  };
}

/**
 * Extract client IP from Cloudflare headers or fallback to request IP
 */
function getClientIp(c: Context): string {
  // Cloudflare Workers header
  const cfConnectingIp = c.req.header("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp;

  // X-Forwarded-For header (for proxies)
  const xForwardedFor = c.req.header("x-forwarded-for");
  if (xForwardedFor) return xForwardedFor.split(",")[0].trim();

  // Fallback to request socket address
  const remoteAddr = c.req.raw.headers.get("x-real-ip") || "unknown";
  return remoteAddr;
}

/**
 * Cleanup old entries from rate limit store (call periodically)
 */
export function cleanupRateLimitStore() {
  const now = Date.now();
  for (const ip in rateLimitStore) {
    if (now > rateLimitStore[ip].resetTime) {
      delete rateLimitStore[ip];
    }
  }
}
