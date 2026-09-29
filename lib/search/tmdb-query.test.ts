import { describe, expect, it } from "vitest";
import { rankNamesakes, readTmdbHint, titleKey } from "./tmdb-query";

describe("readTmdbHint", () => {
  it("reads a year or a language at the end, in either order", () => {
    expect(readTmdbHint("darling 2010", 2026)).toEqual({ text: "darling", year: 2010 });
    expect(readTmdbHint("Dune (1984)", 2026)).toEqual({ text: "Dune", year: 1984 });
    expect(readTmdbHint("darling Telugu", 2026)).toEqual({ text: "darling", language: "te" });
    expect(readTmdbHint("darling telugu 2010", 2026)).toEqual({ text: "darling", year: 2010, language: "te" });
    expect(readTmdbHint("darling 2010 telugu", 2026)).toEqual({ text: "darling", year: 2010, language: "te" });
  });

  it("leaves titles that are, or end in, something else alone", () => {
    expect(readTmdbHint("darling", 2026)).toBeNull();
    // A year on its own is the title.
    expect(readTmdbHint("1917", 2026)).toBeNull();
    // Too far ahead to be a release year.
    expect(readTmdbHint("Blade Runner 2049", 2026)).toBeNull();
    // Language first is part of the title.
    expect(readTmdbHint("Hindi Medium", 2026)).toBeNull();
    expect(readTmdbHint("telugu", 2026)).toBeNull();
  });

  it("takes each hint once", () => {
    expect(readTmdbHint("love 1999 2000", 2026)).toEqual({ text: "love 1999", year: 2000 });
  });
});

describe("titleKey", () => {
  it("ignores case, accents and punctuation", () => {
    expect(titleKey("Amélie!")).toBe(titleKey("amelie"));
    expect(titleKey("Alice, Darling")).toBe("alice darling");
  });
});

describe("rankNamesakes", () => {
  const films = [
    { title: "Strange Darling", votes: 1046 },
    { title: "Darling", year: 1965, votes: 156 },
    { title: "Don't Worry Darling", votes: 3096 },
    { title: "Darling", year: 2017, votes: 12 },
    { title: "Darling", year: 2010, votes: 37, originalTitle: "డార్లింగ్" },
  ];
  const describeFilm = (film: (typeof films)[number]) => film;

  it("puts exact names first, most voted first, then the rest as TMDB had them", () => {
    expect(rankNamesakes(films, "darling", describeFilm).map((film) => `${film.title} ${film.year ?? ""}`.trim())).toEqual([
      "Darling 1965",
      "Darling 2010",
      "Darling 2017",
      "Strange Darling",
      "Don't Worry Darling",
    ]);
  });

  it("counts the original title as the name too", () => {
    expect(rankNamesakes(films, "డార్లింగ్", describeFilm)[0]).toMatchObject({ year: 2010 });
  });
});
