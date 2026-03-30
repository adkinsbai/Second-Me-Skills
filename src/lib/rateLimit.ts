type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function hitRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { limited: false, remaining: limit - 1, resetAt: now + windowMs };
  }
  cur.count += 1;
  buckets.set(key, cur);
  if (cur.count > limit) {
    return { limited: true, remaining: 0, resetAt: cur.resetAt };
  }
  return { limited: false, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt };
}

