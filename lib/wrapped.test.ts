import { describe, expect, it } from "vitest";
import type { CategoryKind } from "@/lib/status";
import { ENOUGH_TITLES, summarise, wrappedInSeason, wrappedYear, type WrappedItem } from "@/lib/wrapped";

function item(overrides: Partial<WrappedItem> = {}): WrappedItem {
  return {
    title: "A Title",
    status: "completed",
    rating: null,
    genres: [],
    progress_current: 0,
    progress_total: null,
    created_at: "2026-06-01T10:00:00Z",
    finished_at: null,
    cover_url: null,
    accent_color: null,
    kind: "anime" as CategoryKind,
    categoryName: "Anime",
    ...overrides,
  };
}

/** Enough arrivals to clear the threshold, so a test can focus on one thing. */
function padding(count = ENOUGH_TITLES) {
  return Array.from({ length: count }, (_, i) => item({ title: `Filler ${i}`, status: "planned" }));
}

describe("summarise", () => {
  it("counts what arrived this year, whatever its status", () => {
    const wrapped = summarise(
      [
        ...padding(),
        item({ created_at: "2025-12-31T00:00:00Z" }),
        item({ created_at: "2027-01-01T00:00:00Z" }),
      ],
      2026,
    );
    expect(wrapped.added).toBe(ENOUGH_TITLES);
  });

  it("separates what was finished here from what came in already watched", () => {
    const wrapped = summarise(
      [
        ...padding(),
        item({ status: "completed", finished_at: "2026-04-02T00:00:00Z" }),
        item({ status: "completed", finished_at: "2025-04-02T00:00:00Z" }),
        // Imported: completed, but no date to place it in a year.
        item({ status: "completed", finished_at: null }),
        item({ status: "completed", finished_at: null }),
      ],
      2026,
    );
    expect(wrapped.finished).toBe(1);
    expect(wrapped.alreadyWatched).toBe(2);
  });

  it("only counts the already watched ones that arrived this year", () => {
    const wrapped = summarise(
      [
        ...padding(),
        item({ status: "completed", finished_at: null }),
        // Imported last year: undated forever, but not this year's story.
        item({ status: "completed", finished_at: null, created_at: "2025-08-01T00:00:00Z" }),
      ],
      2026,
    );
    expect(wrapped.alreadyWatched).toBe(1);
  });

  it("counts episodes and rough hours from the titles finished this year", () => {
    const wrapped = summarise(
      [
        ...padding(),
        item({ kind: "anime", progress_current: 12, finished_at: "2026-03-01T00:00:00Z" }),
        item({ kind: "series", progress_current: 10, finished_at: "2026-03-01T00:00:00Z" }),
        item({ kind: "movie", finished_at: "2026-03-01T00:00:00Z" }),
        // Unfinished, and a game that keeps no progress: neither can be timed.
        item({ kind: "anime", progress_current: 99, status: "in_progress", finished_at: null }),
        item({ kind: "game", progress_current: 40, finished_at: "2026-03-01T00:00:00Z" }),
      ],
      2026,
    );
    expect(wrapped.episodes).toBe(22);
    // 12 * 24 + 10 * 45 + 115 = 853 minutes.
    expect(wrapped.hours).toBe(14);
  });

  it("prices a single episode anime as a feature, and not as an episode", () => {
    const film = { kind: "anime" as CategoryKind, progress_current: 1, progress_total: 1 };
    const wrapped = summarise(
      [...padding(), item({ ...film, finished_at: "2026-03-01T00:00:00Z" })],
      2026,
    );
    expect(wrapped.episodes).toBe(0);
    expect(wrapped.hours).toBe(2);
  });

  it("ranks genres by count and keeps the top five", () => {
    const wrapped = summarise(
      [
        ...Array.from({ length: 4 }, () => item({ genres: ["Drama"] })),
        ...Array.from({ length: 3 }, () => item({ genres: ["Comedy", "Romance"] })),
        item({ genres: ["Action"] }),
        item({ genres: ["Horror"] }),
        item({ genres: ["Mystery"] }),
        item({ genres: ["Thriller"] }),
      ],
      2026,
    );
    expect(wrapped.genres.map((g) => g.name)).toEqual(["Drama", "Comedy", "Romance", "Action", "Horror"]);
    expect(wrapped.genres[0].count).toBe(4);
    expect(wrapped.genres[0].share).toBeCloseTo(4 / 14);
  });

  it("picks the best rated title of the year and takes the year's colour from it", () => {
    const wrapped = summarise(
      [
        ...padding(),
        item({ title: "Good", rating: 8, accent_color: "#3a5f8c" }),
        item({ title: "Best", rating: 10, accent_color: "#8c3a5f", categoryName: "Films" }),
        item({ title: "Last year's best", rating: 10, created_at: "2025-02-02T00:00:00Z" }),
      ],
      2026,
    );
    expect(wrapped.top?.title).toBe("Best");
    expect(wrapped.top?.categoryName).toBe("Films");
    expect(wrapped.accent).toBe("#8c3a5f");
  });

  it("breaks a tied rating on the later finish, never at random", () => {
    const wrapped = summarise(
      [
        ...padding(),
        item({ title: "Earlier", rating: 9, finished_at: "2026-01-01T00:00:00Z" }),
        item({ title: "Later", rating: 9, finished_at: "2026-09-01T00:00:00Z" }),
      ],
      2026,
    );
    expect(wrapped.top?.title).toBe("Later");
  });

  it("says there isn't a year yet when almost nothing arrived", () => {
    expect(summarise(padding(ENOUGH_TITLES - 1), 2026).enough).toBe(false);
    expect(summarise(padding(ENOUGH_TITLES), 2026).enough).toBe(true);
  });

  it("survives an empty library without inventing anything", () => {
    const wrapped = summarise([], 2026);
    expect(wrapped).toMatchObject({ added: 0, finished: 0, episodes: 0, hours: 0, top: null, accent: null, enough: false });
    expect(wrapped.genres).toEqual([]);
  });
});

describe("wrappedYear", () => {
  it("looks back at last year through January, and at this one after that", () => {
    expect(wrappedYear(new Date("2027-01-05T12:00:00"))).toBe(2026);
    expect(wrappedYear(new Date("2026-02-01T12:00:00"))).toBe(2026);
    expect(wrappedYear(new Date("2026-12-24T12:00:00"))).toBe(2026);
  });
});

describe("wrappedInSeason", () => {
  it("is December and January, and nothing else", () => {
    expect(wrappedInSeason(new Date("2026-12-01T12:00:00"))).toBe(true);
    expect(wrappedInSeason(new Date("2027-01-31T12:00:00"))).toBe(true);
    expect(wrappedInSeason(new Date("2026-11-30T12:00:00"))).toBe(false);
    expect(wrappedInSeason(new Date("2026-02-01T12:00:00"))).toBe(false);
  });
});
