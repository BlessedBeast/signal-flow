import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const RATE_LIMIT_MESSAGE =
  "Rate limit exceeded. Please upgrade to premium for unlimited scans.";

let cachedLimiter: Ratelimit | null | undefined;

function hasUpstashEnv(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() &&
      process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  );
}

function getHookRateLimiter(): Ratelimit | null {
  if (cachedLimiter !== undefined) {
    return cachedLimiter;
  }

  if (!hasUpstashEnv()) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[HOOK] Upstash env missing — rate limiting disabled for local dev"
      );
    }
    cachedLimiter = null;
    return null;
  }

  try {
    cachedLimiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(1, "24 h"),
      prefix: "signalflow:onboard-hook",
    });
  } catch (err) {
    console.warn("[HOOK] Failed to initialize Upstash rate limiter:", err);
    cachedLimiter = null;
  }

  return cachedLimiter;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;

  return "anonymous";
}

export type HookRateLimitResult =
  | { allowed: true }
  | { allowed: false; error: string };

export async function checkHookRateLimit(
  ip: string
): Promise<HookRateLimitResult> {
  const limiter = getHookRateLimiter();

  if (!limiter) {
    return { allowed: true };
  }

  try {
    const { success } = await limiter.limit(ip);
    if (!success) {
      return { allowed: false, error: RATE_LIMIT_MESSAGE };
    }
    return { allowed: true };
  } catch (err) {
    console.warn("[HOOK] Rate limit check failed — allowing request:", err);
    return { allowed: true };
  }
}
