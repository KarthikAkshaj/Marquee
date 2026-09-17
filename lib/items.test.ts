import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORY_PARAMS,
  applyItemChange,
  categoryHref,
  itemHref,
  countByStatus,
  filterByTitle,
  decrementPatch,
  incrementPatch,
  parseCategoryParams,
  progressLabel,
  progressPatch,
  progressPercent,
  progressShort,
  progressUnit,
  selectItems,
  sortItems,
  statusPatch,
  type Item,
} from "./items";

function item(overrides: Partial<Item>): Item {
  return {
    id: overrides.id ?? overrides.title ?? "id",
    user_id: "u",
    category_id: "c",
    title: "Untitled",
    status: "planned",
    rating: null,
    progress_current: 0,
    progress_total: null,
    notes: null,
    cover_url: null,
    backdrop_url: null,
    accent_color: null,
    genres: [],
    community_score: null,
    year: null,
    source: "manual",
    external_id: null,
    is_favorite: false,
    started_at: null,
    finished_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const titles = (items: Item[]) => items.map((i) => i.title);

describe("parseCategoryParams", () => {
  it("reads valid params", () => {
    expect(parseCategoryParams({ status: "in_progress", view: "list", sort: "rating", fav: "1" })).toEqual({
      status: "in_progress",
      view: "list",
      sort: "rating",
      fav: true,
    });
  });

  it("falls back to defaults for junk, missing or repeated values", () => {
    expect(parseCategoryParams({})).toEqual(DEFAULT_CATEGORY_PARAMS);
    expect(parseCategoryParams({ status: "watching", view: "tiles", sort: "hype", fav: "yes" })).toEqual(
      DEFAULT_CATEGORY_PARAMS,
    );
    expect(parseCategoryParams({ status: ["completed", "dropped"] }).status).toBe("completed");
  });
});

describe("categoryHref", () => {
  it("leaves defaults out of the URL", () => {
    expect(categoryHref("anime", DEFAULT_CATEGORY_PARAMS)).toBe("/c/anime");
  });

  it("applies a patch on top of the current params", () => {
    const current = { ...DEFAULT_CATEGORY_PARAMS, view: "list" as const, sort: "title" as const };
    expect(categoryHref("anime", current, { status: "dropped", fav: true })).toBe(
      "/c/anime?status=dropped&view=list&sort=title&fav=1",
    );
  });

  it("encodes unusual slugs", () => {
    expect(categoryHref("k dramas", DEFAULT_CATEGORY_PARAMS)).toBe("/c/k%20dramas");
  });
});

describe("itemHref", () => {
  it("adds the item to the current URL", () => {
    expect(itemHref("anime", DEFAULT_CATEGORY_PARAMS, "abc")).toBe("/c/anime?item=abc");
    expect(itemHref("anime", { ...DEFAULT_CATEGORY_PARAMS, view: "list" }, "abc")).toBe("/c/anime?view=list&item=abc");
  });
});

describe("countByStatus", () => {
  it("counts every tab", () => {
    const items = [item({ status: "planned" }), item({ status: "planned" }), item({ status: "dropped" })];
    expect(countByStatus(items)).toEqual({ all: 3, planned: 2, in_progress: 0, completed: 0, dropped: 1 });
  });
});

describe("sortItems", () => {
  const a = item({ title: "Ash & Ember", rating: 7, year: 2021, created_at: "2026-03-01", updated_at: "2026-05-01" });
  const b = item({ title: "blue hour", rating: null, year: null, created_at: "2026-04-01", updated_at: "2026-02-01" });
  const c = item({ title: "Chrome Sakura", rating: 9, year: 2023, created_at: "2026-02-01", updated_at: "2026-06-01" });

  it("sorts by title, ignoring case", () => {
    expect(titles(sortItems([c, b, a], "title"))).toEqual(["Ash & Ember", "blue hour", "Chrome Sakura"]);
  });

  it("puts the highest rating first and unrated last", () => {
    expect(titles(sortItems([b, a, c], "rating"))).toEqual(["Chrome Sakura", "Ash & Ember", "blue hour"]);
  });

  it("puts the newest year first and unknown years last", () => {
    expect(titles(sortItems([b, a, c], "year"))).toEqual(["Chrome Sakura", "Ash & Ember", "blue hour"]);
  });

  it("sorts by date added and by last update, newest first", () => {
    expect(titles(sortItems([a, b, c], "added"))).toEqual(["blue hour", "Ash & Ember", "Chrome Sakura"]);
    expect(titles(sortItems([a, b, c], "updated"))).toEqual(["Chrome Sakura", "Ash & Ember", "blue hour"]);
  });

  it("breaks ties by title and never mutates the input", () => {
    const input = [item({ title: "Zeta", rating: 8 }), item({ title: "Alpha", rating: 8 })];
    expect(titles(sortItems(input, "rating"))).toEqual(["Alpha", "Zeta"]);
    expect(titles(input)).toEqual(["Zeta", "Alpha"]);
  });
});

describe("selectItems", () => {
  const items = [
    item({ title: "One", status: "in_progress", is_favorite: true }),
    item({ title: "Two", status: "in_progress" }),
    item({ title: "Three", status: "completed", is_favorite: true }),
  ];

  it("filters by status tab and favourites together", () => {
    expect(titles(selectItems(items, { ...DEFAULT_CATEGORY_PARAMS, status: "in_progress", sort: "title" }))).toEqual([
      "One",
      "Two",
    ]);
    expect(titles(selectItems(items, { ...DEFAULT_CATEGORY_PARAMS, fav: true, sort: "title" }))).toEqual([
      "One",
      "Three",
    ]);
  });
});

describe("filterByTitle", () => {
  const items = [item({ title: "Pokémon Horizons" }), item({ title: "Frieren" }), item({ title: "Neon Wardens" })];

  it("matches regardless of case, accents and surrounding space", () => {
    expect(titles(filterByTitle(items, "  POKEMON "))).toEqual(["Pokémon Horizons"]);
    expect(titles(filterByTitle(items, "ren"))).toEqual(["Frieren"]);
  });

  it("returns everything for an empty query", () => {
    expect(filterByTitle(items, "   ")).toHaveLength(3);
  });
});

describe("progress", () => {
  it("computes a clamped percentage", () => {
    expect(progressPercent({ progress_current: 7, progress_total: 24 })).toBe(29);
    expect(progressPercent({ progress_current: 30, progress_total: 24 })).toBe(100);
    expect(progressPercent({ progress_current: 3, progress_total: null })).toBeNull();
  });

  it("pads the label like the design", () => {
    expect(progressLabel({ progress_current: 7, progress_total: 24 })).toBe("07 / 24");
    expect(progressLabel({ progress_current: 3, progress_total: null })).toBe("03");
  });
});

describe("progressUnit", () => {
  it("only counts where episodes or parts make sense", () => {
    expect(progressUnit("anime")).toBe("Episodes");
    expect(progressUnit("series")).toBe("Episodes");
    expect(progressUnit("custom")).toBe("Total");
    expect(progressUnit("movie")).toBeNull();
    expect(progressUnit("game")).toBeNull();
  });
});

describe("statusPatch", () => {
  it("fills progress when a title with a total is marked done", () => {
    expect(statusPatch(item({ progress_current: 3, progress_total: 12 }), "completed")).toEqual({
      status: "completed",
      progress_current: 12,
    });
  });

  it("leaves progress alone otherwise", () => {
    expect(statusPatch(item({ progress_current: 3, progress_total: null }), "completed")).toEqual({ status: "completed" });
    expect(statusPatch(item({ progress_current: 3, progress_total: 12 }), "dropped")).toEqual({ status: "dropped" });
  });

  it("clears the finish date when a title stops being finished", () => {
    const done = item({ status: "completed", progress_current: 12, progress_total: 12, finished_at: "2026-09-01" });
    expect(statusPatch(done, "in_progress")).toEqual({ status: "in_progress", finished_at: null });
  });
});

describe("progressPatch", () => {
  it("starts a queued title once there's something counted", () => {
    expect(progressPatch(item({ status: "planned" }), 800, 1100)).toEqual({
      status: "in_progress",
      progress_current: 800,
      progress_total: 1100,
    });
    expect(progressPatch(item({ status: "planned" }), 0, 12).status).toBe("planned");
  });

  it("finishes at the total and un-finishes below it", () => {
    expect(progressPatch(item({ status: "in_progress", progress_current: 5 }), 12, 12).status).toBe("completed");
    const done = item({ status: "completed", progress_current: 12, progress_total: 12 });
    expect(progressPatch(done, 11, 12)).toEqual({
      status: "in_progress",
      progress_current: 11,
      progress_total: 12,
      finished_at: null,
    });
  });

  it("picks a caught-up title back up when a new episode raises the total", () => {
    const caughtUp = item({ status: "completed", progress_current: 12, progress_total: 12 });
    expect(progressPatch(caughtUp, 12, 13)).toMatchObject({ status: "in_progress", progress_total: 13, finished_at: null });
  });

  it("never finishes a title with no total, and leaves dropped alone", () => {
    expect(progressPatch(item({ status: "in_progress" }), 900, null).status).toBe("in_progress");
    expect(progressPatch(item({ status: "dropped", progress_current: 3 }), 4, 12).status).toBe("dropped");
  });
});

describe("incrementPatch", () => {
  it("starts a queued title and picks a dropped one back up", () => {
    expect(incrementPatch(item({ status: "planned", progress_total: 12 }))).toEqual({
      status: "in_progress",
      progress_current: 1,
      progress_total: 12,
    });
    expect(incrementPatch(item({ status: "dropped", progress_current: 4 }))).toMatchObject({
      status: "in_progress",
      progress_current: 5,
    });
  });

  it("finishes the title on the last episode, but never without a total", () => {
    expect(incrementPatch(item({ status: "in_progress", progress_current: 11, progress_total: 12 }))).toMatchObject({
      status: "completed",
      progress_current: 12,
    });
    expect(incrementPatch(item({ status: "in_progress", progress_current: 999 }))).toMatchObject({
      status: "in_progress",
      progress_current: 1000,
    });
  });

  it("has nothing to add once finished or at the total", () => {
    expect(incrementPatch(item({ status: "completed", progress_current: 12, progress_total: 12 }))).toBeNull();
    expect(incrementPatch(item({ status: "in_progress", progress_current: 12, progress_total: 12 }))).toBeNull();
  });
});

describe("decrementPatch", () => {
  it("steps back, un-finishing a completed title", () => {
    const done = item({ status: "completed", progress_current: 12, progress_total: 12 });
    expect(decrementPatch(done)).toMatchObject({ status: "in_progress", progress_current: 11, finished_at: null });
  });

  it("stops at zero", () => {
    expect(decrementPatch(item({ progress_current: 0 }))).toBeNull();
  });
});

describe("progressShort", () => {
  it("shows where you are on the card", () => {
    expect(progressShort({ progress_current: 13, progress_total: 24 }, "anime")).toBe("13/24");
    expect(progressShort({ progress_current: 13, progress_total: null }, "series")).toBe("Ep 13");
    expect(progressShort({ progress_current: 4, progress_total: null }, "custom")).toBe("4");
  });

  it("stays quiet with nothing to show, or where nothing is counted", () => {
    expect(progressShort({ progress_current: 0, progress_total: null }, "anime")).toBeNull();
    expect(progressShort({ progress_current: 3, progress_total: 10 }, "movie")).toBeNull();
  });
});

describe("applyItemChange", () => {
  const now = new Date("2026-09-17T10:00:00Z");
  const shelf = [
    item({ id: "a", title: "Alpha", status: "planned", progress_total: 2 }),
    item({ id: "b", title: "Beta", status: "in_progress", progress_current: 1, started_at: "2026-01-02" }),
  ];

  it("changes status and stamps dates like the database does", () => {
    const [alpha] = applyItemChange(shelf, "a", { type: "status", status: "in_progress" }, now);
    expect(alpha).toMatchObject({ status: "in_progress", started_at: "2026-09-17", updated_at: now.toISOString() });

    const [, beta] = applyItemChange(shelf, "b", { type: "status", status: "completed" }, now);
    expect(beta).toMatchObject({ status: "completed", started_at: "2026-01-02", finished_at: "2026-09-17" });
  });

  it("adds one, and finishes at the total", () => {
    const once = applyItemChange(shelf, "a", { type: "increment" }, now);
    expect(once[0]).toMatchObject({ status: "in_progress", progress_current: 1 });
    const twice = applyItemChange(once, "a", { type: "increment" }, now);
    expect(twice[0]).toMatchObject({ status: "completed", progress_current: 2, finished_at: "2026-09-17" });
    expect(applyItemChange(twice, "a", { type: "increment" }, now)[0]).toBe(twice[0]);
  });

  it("sets a typed count and total", () => {
    const [alpha] = applyItemChange(shelf, "a", { type: "progress", current: 1, total: null }, now);
    expect(alpha).toMatchObject({ status: "in_progress", progress_current: 1, progress_total: null, started_at: "2026-09-17" });
  });

  it("saves edited details as they are", () => {
    const [, beta] = applyItemChange(shelf, "b", { type: "details", details: { rating: 8, notes: "Ep 7!" } }, now);
    expect(beta).toMatchObject({ rating: 8, notes: "Ep 7!", status: "in_progress", updated_at: now.toISOString() });
  });

  it("toggles favourites and removes moved or deleted titles", () => {
    expect(applyItemChange(shelf, "b", { type: "favorite", favorite: true }, now)[1].is_favorite).toBe(true);
    expect(titles(applyItemChange(shelf, "a", { type: "remove" }, now))).toEqual(["Beta"]);
  });

  it("leaves the shelf alone for an unknown id", () => {
    expect(applyItemChange(shelf, "zzz", { type: "status", status: "dropped" }, now)).toEqual(shelf);
  });

  it("puts an added title first, once", () => {
    const frieren = item({ id: "c", title: "Frieren" });
    const added = applyItemChange(shelf, "c", { type: "add", item: frieren }, now);
    expect(titles(added)).toEqual(["Frieren", "Alpha", "Beta"]);
    expect(titles(applyItemChange(added, "c", { type: "add", item: frieren }, now))).toEqual(["Frieren", "Alpha", "Beta"]);
  });
});
