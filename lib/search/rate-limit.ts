type Bucket = { tokens: number; updatedAt: number };

export type RateLimiter = {
  /** Spend one token for this key. False means slow down. */
  take(key: string, now?: number): boolean;
};

/**
 * In-memory token bucket per key (SPEC §11: fine for the MVP). Each server
 * instance keeps its own buckets, so the real ceiling is per instance.
 */
export function createRateLimiter({
  capacity,
  refillPerSecond,
  maxKeys = 5000,
}: {
  capacity: number;
  refillPerSecond: number;
  maxKeys?: number;
}): RateLimiter {
  const buckets = new Map<string, Bucket>();

  return {
    take(key, now = Date.now()) {
      const bucket = buckets.get(key);
      const refilled = bucket
        ? Math.min(capacity, bucket.tokens + ((now - bucket.updatedAt) / 1000) * refillPerSecond)
        : capacity;

      if (refilled < 1) {
        buckets.set(key, { tokens: refilled, updatedAt: now });
        return false;
      }

      // Re-insert so Map order tracks recency; the oldest key is evicted first.
      buckets.delete(key);
      buckets.set(key, { tokens: refilled - 1, updatedAt: now });
      if (buckets.size > maxKeys) {
        const oldest = buckets.keys().next().value;
        if (oldest !== undefined) buckets.delete(oldest);
      }
      return true;
    },
  };
}
