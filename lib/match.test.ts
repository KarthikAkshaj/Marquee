import { describe, expect, it } from "vitest";
import { bestMatch, similarity } from "./match";
import type { SearchResult } from "./search/types";

const anime = (title: string, subtitle: string, extra: Partial<SearchResult> = {}): SearchResult => ({
  source: "anilist",
  externalId: title,
  title,
  subtitle,
  ...extra,
});

describe("similarity", () => {
  it("ignores case, punctuation and spacing", () => {
    expect(similarity("One Punch Man", "One-Punch Man")).toBe(1);
    expect(similarity("Dr. Stone", "Dr. STONE")).toBe(1);
    expect(similarity("Hells Paradise", "Hell's Paradise")).toBe(0.98);
  });

  it("forgives small spelling differences but not different titles", () => {
    expect(similarity("Haikyuu", "HAIKYU!!")).toBeGreaterThan(0.85);
    expect(similarity("Eminence in Shadow", "The Eminence in Shadow")).toBeGreaterThan(0.85);
    expect(similarity("Naruto", "Bleach")).toBeLessThan(0.2);
  });

  it("scores typing the start of a longer title high, closer lengths higher", () => {
    const tv = similarity("Demon Slayer", "Demon Slayer: Kimetsu no Yaiba");
    const movie = similarity("Demon Slayer", "Demon Slayer -Kimetsu no Yaiba- The Movie: Mugen Train");
    expect(tv).toBeGreaterThan(0.8);
    expect(tv).toBeGreaterThan(movie);
  });
});

describe("bestMatch", () => {
  it("skips a wrong first result from the provider", () => {
    const candidates = [
      anime("Onigiri", "TV Short · 13 eps"),
      anime("Demon Slayer -Kimetsu no Yaiba- The Movie: Mugen Train", "Movie · 117 min"),
      anime("Demon Slayer: Kimetsu no Yaiba", "TV · 26 eps"),
    ];
    expect(bestMatch("Demon Slayer", null, candidates)).toMatchObject({ index: 2, confident: true });
  });

  it("prefers the TV series over its movie", () => {
    const candidates = [anime("Boruto: Naruto the Movie", "Movie · 95 min"), anime("Boruto: Naruto Next Generations", "TV · 293 eps")];
    expect(bestMatch("Boruto", null, candidates)?.index).toBe(1);
  });

  it("takes the exact title over sequels, and uses the original title too", () => {
    const candidates = [anime("JUJUTSU KAISEN 0", "Movie · 105 min"), anime("JUJUTSU KAISEN", "TV · 24 eps")];
    expect(bestMatch("Jujutsu Kaisen", null, candidates)).toMatchObject({ index: 1, similarity: 1 });
    const romaji = [anime("Frieren: Beyond Journey’s End", "TV · 28 eps", { altTitle: "Sousou no Frieren" })];
    expect(bestMatch("Sousou no Frieren", null, romaji)).toMatchObject({ index: 0, confident: true });
  });

  it("lets a typed year break a tie between remakes", () => {
    const candidates = [
      { source: "tmdb" as const, externalId: "1", title: "Dune", year: 2021 },
      { source: "tmdb" as const, externalId: "2", title: "Dune", year: 1984 },
    ];
    expect(bestMatch("Dune", 1984, candidates)?.index).toBe(1);
    expect(bestMatch("Dune", null, candidates)?.index).toBe(0);
  });

  it("isn't confident about a loose match, and has nothing for no candidates", () => {
    expect(bestMatch("Chainsaw", null, [anime("Chainsaw Man", "TV · 12 eps")])?.confident).toBe(true);
    expect(bestMatch("My Hero", null, [anime("Heroes of the Rising", "Movie · 104 min")])?.confident).toBe(false);
    expect(bestMatch("Anything", null, [])).toBeNull();
  });
});
