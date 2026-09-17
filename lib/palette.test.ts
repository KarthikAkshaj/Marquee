import { describe, expect, it } from "vitest";
import {
  categorySlugFromPath,
  defaultAddTarget,
  matchScore,
  normaliseForMatch,
  paletteLinks,
  rankMatches,
  titleHref,
  type PaletteCategory,
} from "./palette";

const category = (overrides: Partial<PaletteCategory>): PaletteCategory => ({
  id: "c",
  name: "Anime",
  slug: "anime",
  color: "crimson",
  icon: "sparkles",
  kind: "anime",
  ...overrides,
});

describe("matching", () => {
  it("ignores case, accents, curly quotes and spacing", () => {
    expect(normaliseForMatch("  Pokémon:  Journey’s ")).toBe("pokemon: journey's");
  });

  it("ranks whole titles, starts, word starts, anywhere, then loose matches", () => {
    const scores = [
      matchScore("frieren", "Frieren"),
      matchScore("frieren", "Frieren: Beyond Journey's End"),
      matchScore("journey", "Frieren: Beyond Journey's End"),
      matchScore("ourney", "Frieren: Beyond Journey's End"),
      matchScore("beyond frieren", "Frieren: Beyond Journey's End"),
      matchScore("jk", "Jujutsu Kaisen"),
      matchScore("frrn", "Frieren"),
    ];
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
    expect(scores.every((score) => score > 0)).toBe(true);
  });

  it("doesn't match unrelated titles, or loose letters under three characters", () => {
    expect(matchScore("dune", "Frieren")).toBe(0);
    // d-u-n-e do appear in order here, but scattered across three words.
    expect(matchScore("dune", "Frieren: Beyond Journey's End")).toBe(0);
    expect(matchScore("fe", "Frieren")).toBe(0);
    expect(matchScore("", "Anything")).toBe(1);
  });

  it("keeps the original order for equal matches and respects the limit", () => {
    const titles = ["One Piece Film Red", "Dune", "One Piece", "Piece of Cake"];
    // A title starting with the query beats word starts; the two word starts keep their order.
    expect(rankMatches("piece", titles, (t) => t, 2)).toEqual(["Piece of Cake", "One Piece Film Red"]);
    expect(rankMatches("one p", ["One Piece Film Red", "One Piece"], (t) => t, 5)).toEqual(["One Piece", "One Piece Film Red"]);
  });
});

describe("palette navigation", () => {
  const anime = category({});
  const books = category({ id: "b", name: "Books", slug: "books", kind: "custom", color: "sand" });
  const games = category({ id: "g", name: "Games", slug: "games", kind: "game", color: "teal" });

  it("links home, every shelf and each settings tab", () => {
    const links = paletteLinks([anime, books]);
    expect(links.map((link) => link.href)).toEqual([
      "/home",
      "/c/anime",
      "/c/books",
      "/settings/profile",
      "/settings/categories",
      "/settings/account",
    ]);
  });

  it("adds to the shelf you're on, else the first searchable one", () => {
    expect(categorySlugFromPath("/c/games")).toBe("games");
    expect(categorySlugFromPath("/home")).toBeNull();
    expect(defaultAddTarget([books, anime, games], "/c/games")?.id).toBe("g");
    expect(defaultAddTarget([books, anime, games], "/home")?.id).toBe("c");
    expect(defaultAddTarget([books], "/home")?.id).toBe("b");
    expect(defaultAddTarget([], "/home")).toBeNull();
  });

  it("links straight to a title's sheet", () => {
    expect(titleHref(anime, "abc")).toBe("/c/anime?item=abc");
  });
});
