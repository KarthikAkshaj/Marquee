import { describe, expect, it } from "vitest";
import { applyCategoryChange, categoryStyle, isCategoryIcon, slugify, uniqueSlug } from "./categories";

describe("slugify", () => {
  it("makes short, readable URL parts", () => {
    expect(slugify("Anime")).toBe("anime");
    expect(slugify("  Big Screen: Classics!  ")).toBe("big-screen-classics");
    expect(slugify("Pokémon & Friends")).toBe("pokemon-friends");
  });

  it("falls back when nothing usable is left, and caps the length", () => {
    expect(slugify("★★★")).toBe("list");
    expect(slugify("a".repeat(60))).toHaveLength(40);
    expect(slugify(`${"word ".repeat(9)}end`).endsWith("-")).toBe(false);
  });
});

describe("uniqueSlug", () => {
  it("adds a number only when the slug is taken", () => {
    expect(uniqueSlug("Anime", ["movies"])).toBe("anime");
    expect(uniqueSlug("Anime", ["anime", "anime-2"])).toBe("anime-3");
  });
});

describe("applyCategoryChange", () => {
  const list = [
    { id: "a", name: "Anime", position: 0 },
    { id: "b", name: "Movies", position: 1 },
    { id: "c", name: "Games", position: 2 },
  ];

  it("renames in place", () => {
    expect(applyCategoryChange(list, { type: "update", id: "b", patch: { name: "Films" } })[1].name).toBe("Films");
  });

  it("reorders and rewrites positions", () => {
    const moved = applyCategoryChange(list, { type: "reorder", ids: ["c", "a", "b"] });
    expect(moved.map((c) => [c.id, c.position])).toEqual([
      ["c", 0],
      ["a", 1],
      ["b", 2],
    ]);
  });

  it("keeps anything the new order missed at the end, and removes deleted ones", () => {
    expect(applyCategoryChange(list, { type: "reorder", ids: ["b"] }).map((c) => c.id)).toEqual(["b", "a", "c"]);
    expect(applyCategoryChange(list, { type: "remove", id: "a" }).map((c) => c.id)).toEqual(["b", "c"]);
  });
});

describe("category tokens", () => {
  it("knows its icons and falls back to amber for unknown colours", () => {
    expect(isCategoryIcon("gamepad-2")).toBe(true);
    expect(isCategoryIcon("<svg>")).toBe(false);
    expect(categoryStyle("#ff0000").text).toBe("text-cat-amber");
  });
});
