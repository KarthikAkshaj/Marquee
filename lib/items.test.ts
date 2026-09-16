import { describe, expect, it } from "vitest";
import {
  DEFAULT_CATEGORY_PARAMS,
  categoryHref,
  itemHref,
  countByStatus,
  filterByTitle,
  parseCategoryParams,
  progressLabel,
  progressPercent,
  selectItems,
  sortItems,
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
