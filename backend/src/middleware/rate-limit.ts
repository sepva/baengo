import { Context, Next } from "hono";
import { RateLimitError } from "../utils/error-mapper";

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
}

interface RateLimitStore {
  [ip: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory storage (works for single instance; for distributed, use Redis/KV)
const rateLimitStore: RateLimitStore = {};
let requestCounter = 0; // Counter to trigger cleanup
const CLEANUP_EVERY_REQUESTS = 100; // Cleanup old entries every N requests

/**
 * Rate limiting middleware for Hono
 * Uses IP from Cloudflare headers or request
 */
export function createRateLimiter(config: RateLimitConfig) {
  return async (c: Context, next: Next) => {
    const ip = getClientIp(c);
    const now = Date.now();

    requestCounter++;
    if (requestCounter > CLEANUP_EVERY_REQUESTS) {
      cleanupRateLimitStore();
      requestCounter = 0;
    }

    // Initialize or reset if window expired
    if (!rateLimitStore[ip] || now > rateLimitStore[ip].resetTime) {
      rateLimitStore[ip] = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      c.header("X-RateLimit-Limit", config.maxRequests.toString());
      c.header("X-RateLimit-Remaining", (config.maxRequests - 1).toString());
      await next();
      return;
    }

    // Increment counter
    rateLimitStore[ip].count++;
    const remaining = Math.max(
      0,
      config.maxRequests - rateLimitStore[ip].count,
    );
    const retryAfter = Math.ceil((rateLimitStore[ip].resetTime - now) / 1000);

    c.header("X-RateLimit-Limit", config.maxRequests.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());

    if (rateLimitStore[ip].count > config.maxRequests) {
      c.header("Retry-After", retryAfter.toString());
      throw new RateLimitError(
        `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
      );
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
