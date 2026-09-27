import { describe, expect, it } from "vitest";
import { ITEM_STATUSES, READING_FORMATS, isReading, labelKind, readingLabel, statusLabel, statusLabels } from "./status";

describe("statusLabel", () => {
  it("uses watch wording for anime and series", () => {
    expect(statusLabel("anime", "planned")).toBe("Plan to Watch");
    expect(statusLabel("series", "in_progress")).toBe("Watching");
  });

  it("uses movie wording", () => {
    expect(statusLabel("movie", "planned")).toBe("Watchlist");
    expect(statusLabel("movie", "completed")).toBe("Watched");
  });

  it("uses game wording", () => {
    expect(statusLabel("game", "planned")).toBe("Backlog");
    expect(statusLabel("game", "in_progress")).toBe("Playing");
    expect(statusLabel("game", "completed")).toBe("Finished");
    expect(statusLabel("game", "dropped")).toBe("Abandoned");
  });

  it("uses neutral wording for custom categories", () => {
    expect(statusLabel("custom", "in_progress")).toBe("In Progress");
    expect(statusLabel("custom", "completed")).toBe("Done");
  });

  it("reads a comic or novel as reading, whatever shelf it's on", () => {
    expect(statusLabel("reading", "planned")).toBe("Plan to Read");
    expect(statusLabel("reading", "in_progress")).toBe("Reading");
    expect(statusLabel(labelKind("anime", "manhwa"), "in_progress")).toBe("Reading");
    // The anime itself, a film, or a title that hasn't said what it is keeps the shelf's words.
    expect(labelKind("anime", "tv")).toBe("anime");
    expect(labelKind("anime", null)).toBe("anime");
    expect(labelKind("movie", "movie")).toBe("movie");
  });

  it("tags only comics and novels, in words people use", () => {
    expect(READING_FORMATS.map(readingLabel)).toEqual(["Manga", "Manhwa", "Manhua", "Light novel", "Novel"]);
    expect(readingLabel("tv")).toBeNull();
    expect(readingLabel(null)).toBeNull();
    expect(isReading("light_novel")).toBe(true);
    expect(isReading("ova")).toBe(false);
  });

  it("labels every status for every kind", () => {
    for (const kind of ["anime", "movie", "series", "game", "custom", "reading"] as const) {
      const labels = statusLabels(kind);
      for (const status of ITEM_STATUSES) {
        expect(labels[status]).toBeTruthy();
      }
    }
  });
});
