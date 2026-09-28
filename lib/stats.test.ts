import { describe, expect, it } from "vitest";
import type { CategoryKind } from "@/lib/status";
import {
  CROWD_MIN,
  DISAGREEMENT_MIN,
  GENRE_MIN_RATED,
  MONTHS_SHOWN,
  crowdGap,
  finishedByMonth,
  formatAverage,
  formatCount,
  genreNames,
  genreTable,
  headline,
  niceCeiling,
  pickShelf,
  ratingSpread,
  type StatsItem,
  type StatsShelf,
} from "@/lib/stats";

let counter = 0;
function item(overrides: Partial<StatsItem> = {}): StatsItem {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    title: `Title ${counter}`,
    category_id: "anime",
    status: "planned",
    rating: null,
    genres: [],
    progress_current: 0,
    progress_total: null,
    runtime_minutes: null,
    format: null,
    finished_at: null,
    community_score: null,
    source: "manual",
    cover_url: null,
    ...overrides,
  };
}

const kinds = new Map<string, CategoryKind>([
  ["anime", "anime"],
  ["movies", "movie"],
  ["games", "game"],
]);

// Mid-September 2026, local time.
const today = new Date(2026, 8, 15);

describe("pickShelf", () => {
  const shelves: StatsShelf[] = [{ id: "a", name: "Anime", slug: "anime", kind: "anime", color: "crimson" }];

  it("finds a shelf by its slug, and falls back to everything", () => {
    expect(pickShelf(shelves, "anime")?.id).toBe("a");
    expect(pickShelf(shelves, "nope")).toBeNull();
    expect(pickShelf(shelves, undefined)).toBeNull();
  });
});

describe("headline", () => {
  it("counts titles by status, and this year's finishes by their date", () => {
    const numbers = headline(
      [
        item({ status: "in_progress" }),
        item({ status: "planned" }),
        item({ status: "completed", finished_at: "2026-02-01" }),
        item({ status: "completed", finished_at: "2025-12-31" }),
        item({ status: "completed", finished_at: null }),
      ],
      kinds,
      today,
    );
    expect(numbers).toMatchObject({ titles: 5, inProgress: 1, planned: 1, finished: 3, finishedThisYear: 1 });
  });

  it("averages only the titles that have a rating", () => {
    const numbers = headline([item({ rating: 8 }), item({ rating: 7 }), item()], kinds, today);
    expect(numbers.rated).toBe(2);
    expect(numbers.average).toBe(7.5);
    expect(headline([item()], kinds, today).average).toBeNull();
  });

  it("has no screen time when nothing in view is watched", () => {
    expect(headline([item({ category_id: "games", status: "completed" })], kinds, today).time).toBeNull();
    expect(headline([item({ category_id: "anime" })], kinds, today).time).not.toBeNull();
  });

  it("times only the watched shelves", () => {
    const numbers = headline(
      [
        item({ category_id: "anime", status: "completed", progress_current: 12, progress_total: 12, runtime_minutes: 25 }),
        item({ category_id: "games", status: "completed", progress_current: 40 }),
      ],
      kinds,
      today,
    );
    expect(numbers.time).toMatchObject({ episodes: 12, hours: 5 });
  });
});

describe("finishedByMonth", () => {
  it("covers the last twelve months, this one last", () => {
    const { months } = finishedByMonth([], today);
    expect(months).toHaveLength(MONTHS_SHOWN);
    expect(months[0].key).toBe("2025-10");
    expect(months.at(-1)?.key).toBe("2026-09");
  });

  it("places finishes by the date's own month and keeps the undated ones apart", () => {
    const result = finishedByMonth(
      [
        item({ status: "completed", finished_at: "2026-09-01" }),
        item({ status: "completed", finished_at: "2026-09-30", category_id: "movies" }),
        item({ status: "completed", finished_at: "2026-03-14" }),
        // Outside the window, either side.
        item({ status: "completed", finished_at: "2025-09-30" }),
        item({ status: "completed", finished_at: "2026-10-01" }),
        // Imported already watched.
        item({ status: "completed", finished_at: null }),
        item({ status: "completed", finished_at: null }),
        // Not finished, whatever its date says.
        item({ status: "dropped", finished_at: "2026-09-02" }),
      ],
      today,
    );
    const september = result.months.at(-1)!;
    expect(september.count).toBe(2);
    expect(september.byShelf).toEqual({ anime: 1, movies: 1 });
    expect(result.months.find((column) => column.key === "2026-03")?.count).toBe(1);
    expect(result.total).toBe(3);
    expect(result.undated).toBe(2);
  });

  it("names the latest of the busiest months as the peak", () => {
    const result = finishedByMonth(
      [
        item({ status: "completed", finished_at: "2026-03-01" }),
        item({ status: "completed", finished_at: "2026-06-01" }),
      ],
      today,
    );
    expect(result.peak?.key).toBe("2026-06");
    expect(finishedByMonth([], today).peak).toBeNull();
  });

  it("crosses the new year without losing a month", () => {
    const { months } = finishedByMonth([], new Date(2026, 0, 10));
    expect(months.map((column) => column.key)).toContain("2025-12");
    expect(months.at(-1)?.key).toBe("2026-01");
  });
});

describe("ratingSpread", () => {
  it("counts every score from 1 to 10, zeros included", () => {
    const spread = ratingSpread([item({ rating: 8 }), item({ rating: 8 }), item({ rating: 3 })]);
    expect(spread.scores).toHaveLength(10);
    expect(spread.scores[7]).toEqual({ score: 8, count: 2 });
    expect(spread.scores[0]).toEqual({ score: 1, count: 0 });
    expect(spread.rated).toBe(3);
    expect(spread.mode).toBe(8);
  });

  it("breaks a tie for the usual score upwards", () => {
    expect(ratingSpread([item({ rating: 6 }), item({ rating: 9 })]).mode).toBe(9);
  });

  it("counts finished titles still waiting for a score", () => {
    const spread = ratingSpread([item({ status: "completed" }), item({ status: "completed", rating: 7 }), item()]);
    expect(spread.unratedFinished).toBe(1);
  });

  it("has nothing to say about no ratings", () => {
    expect(ratingSpread([item()])).toMatchObject({ rated: 0, average: null, mode: null });
  });
});

describe("crowdGap", () => {
  const rated = (rating: number, community: number, title?: string) =>
    item({ rating, community_score: community, source: "anilist", ...(title ? { title } : {}) });

  it("treats your 8 as 80 and averages the difference", () => {
    const crowd = crowdGap([rated(8, 70), rated(9, 80), rated(6, 60)]);
    expect(crowd.pairs).toBe(3);
    // +10, +10, 0
    expect(crowd.gap).toBe(7);
  });

  it("stays quiet under the minimum", () => {
    const crowd = crowdGap(Array.from({ length: CROWD_MIN - 1 }, () => rated(8, 70)));
    expect(crowd.gap).toBeNull();
  });

  it("skips titles missing either score", () => {
    expect(crowdGap([item({ rating: 8 }), item({ community_score: 80 })]).pairs).toBe(0);
  });

  it("names the biggest arguments either way, biggest first", () => {
    const crowd = crowdGap([
      rated(9, 50, "Loved it more"),
      rated(3, 90, "Liked it less"),
      rated(8, 80 - DISAGREEMENT_MIN + 1, "Close enough"),
    ]);
    expect(crowd.disagreements.map((entry) => entry.title)).toEqual(["Liked it less", "Loved it more"]);
    expect(crowd.disagreements[0].gap).toBe(-60);
  });
});

describe("genreNames", () => {
  it("splits TMDB's paired genres and speaks one word for science fiction", () => {
    expect(genreNames("Sci-Fi & Fantasy")).toEqual(["Sci-Fi", "Fantasy"]);
    expect(genreNames("Science Fiction")).toEqual(["Sci-Fi"]);
    expect(genreNames("Slice of Life")).toEqual(["Slice of Life"]);
  });
});

describe("genreTable", () => {
  it("counts each title once per genre, across providers' spellings", () => {
    const { rows } = genreTable([
      item({ genres: ["Sci-Fi", "Action"] }),
      item({ genres: ["Science Fiction"] }),
      item({ genres: ["Sci-Fi & Fantasy", "Sci-Fi"] }),
    ]);
    expect(rows.find((row) => row.name === "Sci-Fi")?.titles).toBe(3);
    expect(rows[0].name).toBe("Sci-Fi");
  });

  it("averages a genre only once it has enough scores", () => {
    const thin = genreTable(Array.from({ length: GENRE_MIN_RATED - 1 }, () => item({ genres: ["Drama"], rating: 9 })));
    expect(thin.rows[0].average).toBeNull();
    expect(thin.favourite).toBeNull();

    const enough = genreTable(Array.from({ length: GENRE_MIN_RATED }, () => item({ genres: ["Drama"], rating: 9 })));
    expect(enough.rows[0].average).toBe(9);
    expect(enough.favourite?.name).toBe("Drama");
  });

  it("picks the best-rated genre as the favourite, not the biggest", () => {
    const { favourite } = genreTable([
      ...Array.from({ length: 5 }, () => item({ genres: ["Action"], rating: 6 })),
      ...Array.from({ length: 3 }, () => item({ genres: ["Mystery"], rating: 9 })),
    ]);
    expect(favourite?.name).toBe("Mystery");
  });

  it("counts the titles with no genres", () => {
    expect(genreTable([item(), item({ genres: ["Drama"] })]).untagged).toBe(1);
  });
});

describe("niceCeiling", () => {
  it("rounds up to a top with a whole halfway tick", () => {
    expect(niceCeiling(14)).toBe(20);
    expect(niceCeiling(9)).toBe(10);
    expect(niceCeiling(3)).toBe(4);
    expect(niceCeiling(1)).toBe(2);
    expect(niceCeiling(0)).toBe(2);
    expect(niceCeiling(150)).toBe(200);
  });
});

describe("formatting", () => {
  it("groups counts and never shows a trailing .0", () => {
    expect(formatCount(1204)).toBe("1,204");
    expect(formatAverage(7.44)).toBe("7.4");
    expect(formatAverage(8)).toBe("8");
  });
});
