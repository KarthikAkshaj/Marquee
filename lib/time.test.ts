import { describe, expect, it } from "vitest";
import { localToday, timeAgo } from "./time";

describe("timeAgo", () => {
  const now = new Date("2026-09-17T12:00:00Z");
  const ago = (seconds: number) => new Date(now.getTime() - seconds * 1000).toISOString();

  it("reads like a person would say it", () => {
    expect(timeAgo(ago(20), now)).toBe("just now");
    expect(timeAgo(ago(5 * 60), now)).toBe("5 minutes ago");
    expect(timeAgo(ago(3 * 3600), now)).toBe("3 hours ago");
    expect(timeAgo(ago(26 * 3600), now)).toBe("yesterday");
    expect(timeAgo(ago(2 * 86400), now)).toBe("2 days ago");
    expect(timeAgo(ago(15 * 86400), now)).toBe("2 weeks ago");
    expect(timeAgo(ago(400 * 86400), now)).toBe("last year");
  });

  it("treats a clock slightly ahead as just now", () => {
    expect(timeAgo(ago(-30), now)).toBe("just now");
  });
});

describe("localToday", () => {
  it("is a YYYY-MM-DD date", () => {
    expect(localToday(new Date(2026, 8, 17, 23, 30))).toBe("2026-09-17");
  });
});
