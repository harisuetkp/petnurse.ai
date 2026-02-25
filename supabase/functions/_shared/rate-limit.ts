/**
 * Rate limiting utility for edge functions
 * Uses in-memory store with automatic cleanup
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory rate limit store (resets on cold start)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpiredEntries() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  
  lastCleanup = now;
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

/**
 * Check if a request is within rate limits
 * @param identifier - User ID or IP address to identify the requester
 * @param maxRequests - Maximum requests allowed in the window (default: 60)
 * @param windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @returns RateLimitResult indicating if request is allowed
 */
export function checkRateLimit(
  identifier: string,
  maxRequests = 60,
  windowMs = 60000
): RateLimitResult {
  cleanupExpiredEntries();
  
  const now = Date.now();
  const key = identifier;
  const existing = rateLimitStore.get(key);
  
  if (!existing || existing.resetAt < now) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      allowed: true,
      remaining: maxRequests - 1,
      resetAt: now + windowMs,
    };
  }
  
  // Existing window
  existing.count++;
  
  if (existing.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }
  
  return {
    allowed: true,
    remaining: maxRequests - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Returns a 429 Too Many Requests response
 */
export function rateLimitResponse(
  corsHeaders: Record<string, string>,
  resetAt: number
): Response {
  const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
  return new Response(
    JSON.stringify({ 
      error: "Rate limit exceeded. Please try again later.",
      code: "RATE_LIMIT_EXCEEDED",
      retryAfter,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
      },
    }
  );
}
