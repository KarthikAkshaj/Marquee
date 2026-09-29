import { describe, expect, it } from "vitest";
import { continueSubtitle, dateLine, greetingFor, midFlightLine, nextStep, spotlightPick, statTiles, stepsLeft } from "./home";

describe("home copy", () => {
  it("greets by the hour", () => {
    expect([3, 5, 11, 12, 16, 17, 23].map(greetingFor)).toEqual([
      "Late night",
      "Morning",
      "Morning",
      "Afternoon",
      "Afternoon",
      "Evening",
      "Evening",
    ]);
  });

  it("sets the date like the handoff", () => {
    expect(dateLine(new Date(2026, 8, 15, 21, 40))).toBe("TUE 15 SEP · 21:40");
    expect(dateLine(new Date(2026, 0, 4, 7, 5))).toBe("SUN 4 JAN · 07:05");
  });

  it("counts what's mid-flight in words", () => {
    expect(midFlightLine(0)).toBe("Nothing mid-flight. The queue is waiting.");
    expect(midFlightLine(1)).toBe("One thing mid-flight. The couch is right there.");
    expect(midFlightLine(4)).toBe("Four things mid-flight. The couch is right there.");
    expect(midFlightLine(23)).toBe("23 things mid-flight. Ambitious.");
  });
});

describe("statTiles", () => {
  it("uses each shelf's own verb and ends with the year's finishes", () => {
    const tiles = statTiles(
      [
        { id: "a", name: "Anime", color: "crimson", kind: "anime", total: 124, inProgress: 3, planned: 18 },
        { id: "g", name: "Games", color: "teal", kind: "game", total: 57, inProgress: 2, planned: 9 },
      ],
      87,
    );
    expect(tiles.map((tile) => [tile.label, tile.value, tile.detail])).toEqual([
      ["Anime", 124, "3 watching · 18 planned"],
      ["Games", 57, "2 playing · 9 planned"],
      ["This year", 87, "finished"],
    ]);
  });
});

describe("continueSubtitle", () => {
  it("prefers the episode count, then a genre", () => {
    expect(continueSubtitle({ year: 2023, progress_total: 28, genres: ["Adventure"], format: "tv" }, "anime")).toBe("2023 · 28 eps");
    expect(continueSubtitle({ year: 1999, progress_total: null, genres: ["Action", "Comedy"], format: null }, "anime")).toBe("1999 · Action");
    expect(continueSubtitle({ year: null, progress_total: null, genres: [], format: null }, "movie")).toBe("");
  });

  it("counts a comic on an anime shelf in chapters", () => {
    expect(continueSubtitle({ year: 2021, progress_total: 222, genres: ["Fantasy"], format: "manhwa" }, "anime")).toBe("2021 · 222 ch");
  });
});

describe("spotlight steps", () => {
  it("names the next episode or chapter, and the last one", () => {
    expect(nextStep({ progress_current: 12, progress_total: 25 }, "anime")).toBe("Episode 13");
    expect(nextStep({ progress_current: 24, progress_total: 25 }, "series")).toBe("Last episode");
    expect(nextStep({ progress_current: 45, progress_total: null }, "reading")).toBe("Chapter 46");
    expect(nextStep({ progress_current: 3, progress_total: null }, "custom")).toBe("4");
  });

  it("gives films and games no step", () => {
    expect(nextStep({ progress_current: 0, progress_total: null }, "movie")).toBeNull();
    expect(nextStep({ progress_current: 0, progress_total: null }, "game")).toBeNull();
  });

  it("counts down only when there's a total", () => {
    expect(stepsLeft({ progress_current: 12, progress_total: 25 })).toBe("13 to go");
    expect(stepsLeft({ progress_current: 12, progress_total: null })).toBeNull();
    expect(stepsLeft({ progress_current: 25, progress_total: 25 })).toBeNull();
  });
});

describe("spotlightPick", () => {
  const titles = [
    { id: "frieren", category_id: "anime", status: "in_progress" as const },
    { id: "mushishi", category_id: "anime", status: "planned" as const },
    { id: "done", category_id: "anime", status: "completed" as const },
    ...Array.from({ length: 40 }, (_, index) => ({ id: `film-${index}`, category_id: "movies", status: "planned" as const })),
    { id: "hades", category_id: "games", status: "dropped" as const },
  ];
  /** Hands back the given rolls in turn. */
  const rolls = (...values: number[]) => () => values.shift() ?? 0;

  it("picks a shelf first, so a long watchlist doesn't take every turn", () => {
    // Two shelves have anything to show; the first roll lands on the first, anime.
    expect(spotlightPick(titles, rolls(0.2, 0))?.id).toBe("frieren");
    expect(spotlightPick(titles, rolls(0.7, 0))?.category_id).toBe("movies");
  });

  it("makes a started title three times as likely as a planned one", () => {
    // Anime's odds: Frieren 3, Mushishi 1, so the top quarter of the roll is Mushishi's.
    expect(spotlightPick(titles, rolls(0, 0.74))?.id).toBe("frieren");
    expect(spotlightPick(titles, rolls(0, 0.76))?.id).toBe("mushishi");
  });

  it("leaves out what's finished or dropped, and has nothing for an empty queue", () => {
    const picked = new Set(Array.from({ length: 200 }, () => spotlightPick(titles)?.id));
    expect(picked.has("done") || picked.has("hades")).toBe(false);
    expect(spotlightPick(titles.filter((title) => title.status === "completed"))).toBeNull();
  });
});
