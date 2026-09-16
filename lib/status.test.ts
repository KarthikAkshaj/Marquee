import { describe, expect, it } from "vitest";
import { ITEM_STATUSES, statusLabel, statusLabels } from "./status";

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

  it("labels every status for every kind", () => {
    for (const kind of ["anime", "movie", "series", "game", "custom"] as const) {
      const labels = statusLabels(kind);
      for (const status of ITEM_STATUSES) {
        expect(labels[status]).toBeTruthy();
      }
    }
  });
});
