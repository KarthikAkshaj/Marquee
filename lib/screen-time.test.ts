import { describe, expect, it } from "vitest";
import { isFeature, screenTime, unitsSeen, type TimedItem } from "@/lib/screen-time";

function item(overrides: Partial<TimedItem> = {}): TimedItem {
  return {
    status: "completed",
    progress_current: 0,
    progress_total: null,
    runtime_minutes: null,
    format: null,
    kind: "anime",
    ...overrides,
  };
}

describe("unitsSeen", () => {
  it("counts a finished title in full even when its progress was never ticked", () => {
    expect(unitsSeen(item({ progress_current: 0, progress_total: 24 }))).toBe(24);
  });

  it("takes the counter at its word for anything unfinished", () => {
    expect(unitsSeen(item({ status: "in_progress", progress_current: 7, progress_total: 24 }))).toBe(7);
    expect(unitsSeen(item({ status: "dropped", progress_current: 3, progress_total: 24 }))).toBe(3);
  });
});

describe("isFeature", () => {
  it("trusts a stored format, then guesses from the shelf", () => {
    expect(isFeature(item({ format: "movie" }))).toBe(true);
    expect(isFeature(item({ format: "ova", progress_total: 1 }))).toBe(false);
    expect(isFeature(item({ kind: "movie" }))).toBe(true);
    expect(isFeature(item({ progress_total: 1 }))).toBe(true);
    expect(isFeature(item({ progress_total: 12 }))).toBe(false);
  });
});

describe("screenTime", () => {
  it("counts films only once they're finished", () => {
    expect(screenTime([item({ kind: "movie", runtime_minutes: 120 })]).hours).toBe(2);
    expect(screenTime([item({ kind: "movie", status: "in_progress", runtime_minutes: 120 })]).hours).toBe(0);
  });

  it("counts episodes seen on anything still going", () => {
    const time = screenTime([item({ kind: "series", status: "in_progress", progress_current: 4, runtime_minutes: 60 })]);
    expect(time).toMatchObject({ episodes: 4, hours: 4 });
  });

  it("keeps comics and novels to chapters", () => {
    const time = screenTime([item({ format: "manhwa", progress_current: 50, progress_total: 222 })]);
    expect(time).toMatchObject({ chapters: 222, episodes: 0, hours: 0 });
  });

  it("owns up to finished shows it can't time", () => {
    const time = screenTime([item({ progress_current: 0, progress_total: null }), item({ progress_total: 12 })]);
    expect(time.untimed).toBe(1);
    expect(time.episodes).toBe(12);
  });

  it("ignores games and custom shelves", () => {
    expect(screenTime([item({ kind: "game", progress_current: 40 }), item({ kind: "custom", progress_current: 9 })])).toEqual({
      episodes: 0,
      hours: 0,
      chapters: 0,
      untimed: 0,
    });
  });
});
