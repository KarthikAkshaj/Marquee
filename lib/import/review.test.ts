import { describe, expect, it } from "vitest";
import { parseImport } from "./parse";
import { findSaved, importBatches, reviewRows, reviewSummary, savedIndex, type SavedTitle } from "./review";

const shelves = [
  { id: "anime", name: "Anime" },
  { id: "movies", name: "Movies" },
];
const saved: SavedTitle[] = [
  { title: "Frieren", status: "completed", category_id: "anime" },
  { title: "Dune", status: "planned", category_id: "movies" },
  { title: "Monster", status: "dropped", category_id: "movies" },
  { title: "monster", status: "in_progress", category_id: "anime" },
];

describe("import review", () => {
  it("names where a duplicate already lives, preferring the target shelf", () => {
    const index = savedIndex(saved, "anime");
    expect(findSaved("  FRIEREN ", index, shelves)).toEqual({ shelf: "Anime", shelfId: "anime", status: "completed" });
    expect(findSaved("Monster", index, shelves)).toEqual({ shelf: "Anime", shelfId: "anime", status: "in_progress" });
    expect(findSaved("Dune", index, shelves)).toEqual({ shelf: "Movies", shelfId: "movies", status: "planned" });
    expect(findSaved("Pluto", index, shelves)).toBeNull();
  });

  it("starts rows in their hinted status or the default, with duplicates unticked", () => {
    const index = savedIndex(saved, "anime");
    const { titles } = parseImport("Frieren\nPluto (watched)\nMob Psycho 100 (2016)");
    expect(reviewRows(titles, "planned", index, true)).toEqual([
      { key: 1, title: "Frieren", status: "planned", year: null, include: false },
      { key: 2, title: "Pluto", status: "completed", year: null, include: true },
      { key: 3, title: "Mob Psycho 100", status: "planned", year: 2016, include: true },
    ]);
    expect(reviewRows(titles, "planned", index, false)[0].include).toBe(true);
  });

  it("counts what's ready, what's a duplicate and what was left out", () => {
    const index = savedIndex(saved, "anime");
    const rows = [
      { key: 1, title: "Frieren", status: "planned" as const, year: null, include: false },
      { key: 2, title: "Pluto", status: "planned" as const, year: null, include: true },
      { key: 3, title: "Dune", status: "planned" as const, year: null, include: true },
      { key: 4, title: "Mushishi", status: "planned" as const, year: null, include: false },
      { key: 5, title: "   ", status: "planned" as const, year: null, include: true },
    ];
    const summary = reviewSummary(rows, index);
    expect(summary.ready.map((row) => row.title)).toEqual(["Pluto", "Dune"]);
    expect(summary).toMatchObject({ duplicateCount: 2, skippedDuplicates: 1, leftOut: 1 });
  });

  it("sends batches of 100 that remember each row's place", () => {
    const rows = Array.from({ length: 250 }, (_, i) => ({ key: i + 1, title: ` Title ${i} `, status: "planned" as const, year: null, include: true }));
    const batches = importBatches(rows);
    expect(batches.map((batch) => batch.length)).toEqual([100, 100, 50]);
    expect(batches[2][0]).toEqual({ title: "Title 200", status: "planned", year: null, position: 200 });
  });
});
