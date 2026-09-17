import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows a burst, then refills over time", () => {
    const limiter = createRateLimiter({ capacity: 3, refillPerSecond: 0.5 });
    const t = 1_000_000;
    expect([1, 2, 3, 4].map(() => limiter.take("flux", t))).toEqual([true, true, true, false]);
    expect(limiter.take("flux", t + 1000)).toBe(false);
    expect(limiter.take("flux", t + 2000)).toBe(true);
    expect(limiter.take("flux", t + 2100)).toBe(false);
  });

  it("keeps each user's bucket separate", () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 1 });
    expect(limiter.take("a", 0)).toBe(true);
    expect(limiter.take("a", 0)).toBe(false);
    expect(limiter.take("b", 0)).toBe(true);
  });

  it("never refills past capacity", () => {
    const limiter = createRateLimiter({ capacity: 2, refillPerSecond: 10 });
    limiter.take("flux", 0);
    const later = 60_000;
    expect([1, 2, 3].map(() => limiter.take("flux", later))).toEqual([true, true, false]);
  });

  it("forgets the least recently seen key when full", () => {
    const limiter = createRateLimiter({ capacity: 1, refillPerSecond: 0, maxKeys: 2 });
    limiter.take("old", 0);
    limiter.take("mid", 0);
    limiter.take("new", 0);
    // "old" was evicted, so it starts with a full bucket again.
    expect(limiter.take("old", 0)).toBe(true);
    expect(limiter.take("new", 0)).toBe(false);
  });
});
