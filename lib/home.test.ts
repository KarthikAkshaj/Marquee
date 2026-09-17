import { describe, expect, it } from "vitest";
import { continueSubtitle, dateLine, greetingFor, midFlightLine, statTiles } from "./home";

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
    expect(continueSubtitle({ year: 2023, progress_total: 28, genres: ["Adventure"] }, "anime")).toBe("2023 · 28 eps");
    expect(continueSubtitle({ year: 1999, progress_total: null, genres: ["Action", "Comedy"] }, "anime")).toBe("1999 · Action");
    expect(continueSubtitle({ year: null, progress_total: null, genres: [] }, "movie")).toBe("");
  });
});
