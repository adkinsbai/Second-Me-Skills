import { NextResponse } from "next/server";

/* ──────────────────────────── Rate Limiting ──────────────────────────── */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

/**
 * In-memory sliding-window rate limiter.
 * @param key    Unique key, e.g. "ip:1.2.3.4" or "user:abc"
 * @param limit  Max requests per window (default 60)
 * @param windowMs  Window duration in ms (default 10 minutes)
 */
export function checkRateLimit(
  key: string,
  limit = 60,
  windowMs = 10 * 60 * 1000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const bucket = rateLimitStore.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { allowed: false, remaining: 0, resetAt: bucket.resetAt };
  }

  return {
    allowed: true,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
  };
}

/**
 * Extract client IP from request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Middleware-style helper: check rate limit and return 429 response if exceeded.
 * Returns null if request is allowed.
 */
export function rateLimitResponse(
  request: Request,
  key: string,
  limit = 60,
  windowMs = 10 * 60 * 1000
): NextResponse | null {
  const ip = getClientIp(request);
  const fullKey = `${key}:${ip}`;
  const result = checkRateLimit(fullKey, limit, windowMs);

  if (!result.allowed) {
    return NextResponse.json(
      { code: 429, message: "请求过于频繁，请稍后再试" },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
        },
      }
    );
  }

  return null; // allowed
}

/* ──────────────────────────── CORS ──────────────────────────── */

const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL ?? "",
  "http://localhost:3000",
  "http://localhost:3456",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3456",
].filter(Boolean);

/**
 * Build standard CORS headers for a given request origin.
 */
export function corsHeaders(requestOrigin?: string | null): Record<string, string> {
  const origin =
    requestOrigin && ALLOWED_ORIGINS.includes(requestOrigin) ? requestOrigin : ALLOWED_ORIGINS[0] ?? "";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 */
export function handleCorsPreflightRequest(request: Request): NextResponse | null {
  if (request.method === "OPTIONS") {
    const origin = request.headers.get("origin");
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }
  return null;
}

/**
 * Wrap a NextResponse with CORS headers.
 */
export function withCors(response: NextResponse, requestOrigin?: string | null): NextResponse {
  const headers = corsHeaders(requestOrigin);
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

/* ──────────────────────────── Content-Type Validation ──────────────────────────── */

/**
 * Validate that a request has the expected Content-Type header.
 */
export function validateContentType(
  request: Request,
  expected: string = "application/json"
): boolean {
  const contentType = request.headers.get("content-type") ?? "";
  return contentType.toLowerCase().includes(expected.toLowerCase());
}
