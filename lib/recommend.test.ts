import { describe, expect, it } from "vitest";
import {
  SEEDS_PER_KIND,
  TASTE_MIN_RATED,
  backlogPicks,
  becauseLine,
  crowdLean,
  fitOf,
  recencyWeight,
  knowsTaste,
  moodPicks,
  newPicks,
  pickKey,
  seedsOf,
  tasteOf,
  type PickShelf,
  type Seed,
  type TasteItem,
} from "@/lib/recommend";
import type { SearchResult, SeedSuggestions } from "@/lib/search/types";

let counter = 0;
function item(overrides: Partial<TasteItem> = {}): TasteItem {
  counter += 1;
  return {
    id: `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`,
    title: `Title ${counter}`,
    category_id: "anime-shelf",
    status: "completed",
    rating: null,
    genres: [],
    community_score: null,
    source: "manual",
    external_id: null,
    is_favorite: false,
    format: null,
    cover_url: null,
    accent_color: null,
    year: null,
    created_at: `2026-01-${String((counter % 28) + 1).padStart(2, "0")}T00:00:00Z`,
    updated_at: "2026-09-01T00:00:00Z",
    finished_at: null,
    tags: null,
    runtime_minutes: null,
    progress_total: null,
    ...overrides,
  };
}

function result(externalId: string, overrides: Partial<SearchResult> = {}): SearchResult {
  return { source: "anilist", externalId, title: `Pick ${externalId}`, ...overrides };
}

const shelves: PickShelf[] = [
  { id: "anime-shelf", name: "Anime", slug: "anime", kind: "anime", color: "crimson" },
  { id: "film-shelf", name: "Movies", slug: "movies", kind: "movie", color: "amber" },
  { id: "notes-shelf", name: "Books", slug: "books", kind: "custom", color: "teal" },
];

/** Five rated titles: Mystery rated high, Romance low, around an average of 7. */
const ratedLibrary = [
  item({ rating: 9, genres: ["Mystery"] }),
  item({ rating: 9, genres: ["Mystery", "Drama"] }),
  item({ rating: 9, genres: ["Mystery"] }),
  item({ rating: 5, genres: ["Romance"] }),
  item({ rating: 3, genres: ["Romance", "Drama"] }),
];

describe("tasteOf", () => {
  it("leans each genre by how you rate it against your own average", () => {
    const taste = tasteOf(ratedLibrary);
    expect(taste.rated).toBe(5);
    expect(taste.average).toBe(7);
    const mystery = taste.genres.get("Mystery")!;
    expect(mystery).toMatchObject({ average: 9, rated: 3 });
    // (9 - 7) pulled halfway to nothing by 3 titles against a shrink of 3.
    expect(mystery.lean).toBeCloseTo(1);
    expect(taste.genres.get("Romance")!.lean).toBeLessThan(0);
  });

  it("merges provider spellings, and a paired TMDB genre counts as both", () => {
    const taste = tasteOf([item({ rating: 8, genres: ["Sci-Fi & Fantasy"] }), item({ rating: 6, genres: ["Science Fiction"] })]);
    expect(taste.genres.get("Sci-Fi")).toMatchObject({ rated: 2, average: 7 });
    expect(taste.genres.get("Fantasy")).toMatchObject({ rated: 1 });
  });

  it("has nothing to say with nothing rated", () => {
    expect(tasteOf([item(), item({ genres: ["Action"] })])).toEqual({ rated: 0, average: null, genres: new Map(), tags: new Map() });
  });

  it(`only calls it taste from ${TASTE_MIN_RATED} rated titles`, () => {
    expect(knowsTaste(tasteOf(ratedLibrary))).toBe(true);
    expect(knowsTaste(tasteOf(ratedLibrary.slice(0, 4)))).toBe(false);
  });
});

describe("fitOf", () => {
  const taste = tasteOf(ratedLibrary);

  it("names the genre you rate highest when enough titles back it", () => {
    const fit = fitOf({ genres: ["Mystery", "Drama"] }, taste);
    expect(fit.score).toBeGreaterThan(0);
    expect(fit.strongest).toEqual({ name: "Mystery", average: 9 });
  });

  it("names nothing on a genre too few titles back, or one you rate low", () => {
    expect(fitOf({ genres: ["Drama"] }, taste).strongest).toBeNull();
    expect(fitOf({ genres: ["Romance"] }, taste).strongest).toBeNull();
    expect(fitOf({ genres: ["Romance"] }, taste).score).toBeLessThan(0);
  });

  it("counts genres you've never rated as neutral", () => {
    expect(fitOf({ genres: ["Mystery", "Sports"] }, taste).score).toBeCloseTo(fitOf({ genres: ["Mystery"] }, taste).score / 2);
    expect(fitOf({ genres: [] }, taste)).toEqual({ score: 0, strongest: null });
  });
});

describe("recency", () => {
  const today = new Date("2026-09-29T00:00:00Z");

  it("counts a rating in full for a year, then fades it toward 40%", () => {
    expect(recencyWeight("2026-01-01", today)).toBe(1);
    expect(recencyWeight("2024-09-29", today)).toBeCloseTo(0.7, 2);
    expect(recencyWeight("2020-09-29", today)).toBeCloseTo(0.42, 2);
    expect(recencyWeight(null, today)).toBe(1);
  });

  it("lets what you rate now outweigh what you rated years ago", () => {
    const old = Array.from({ length: 3 }, () => item({ rating: 10, genres: ["Romance"], finished_at: "2019-01-01" }));
    const recent = Array.from({ length: 3 }, () => item({ rating: 4, genres: ["Romance"], finished_at: "2026-08-01" }));
    const others = Array.from({ length: 3 }, () => item({ rating: 7, genres: ["Drama"], finished_at: "2026-08-01" }));
    const taste = tasteOf([...old, ...recent, ...others], { today });
    // Six Romance ratings average 7, but the recent 4s count for more than the old 10s.
    expect(taste.genres.get("Romance")).toMatchObject({ average: 7, rated: 6 });
    expect(taste.genres.get("Romance")!.lean).toBeLessThan(0);
  });
});

describe("tags", () => {
  const tagged = [
    item({ rating: 9, genres: ["Adventure"], tags: ["Iyashikei"] }),
    item({ rating: 10, genres: ["Adventure"], tags: ["Iyashikei"] }),
    item({ rating: 9, genres: ["Drama"], tags: ["Iyashikei", "Travel"] }),
    item({ rating: 5, genres: ["Adventure"], tags: ["Battle Royale"] }),
    item({ rating: 5, genres: ["Drama"], tags: ["Battle Royale"] }),
  ];
  const taste = tasteOf(tagged);

  it("learns how you rate tags, not just genres", () => {
    expect(taste.tags.get("Iyashikei")).toMatchObject({ rated: 3 });
    expect(taste.tags.get("Iyashikei")!.lean).toBeGreaterThan(0);
    expect(taste.tags.get("Battle Royale")!.lean).toBeLessThan(0);
  });

  it("tells two titles of the same genres apart by their tags, and names the tag", () => {
    const calm = fitOf({ genres: ["Adventure"], tags: ["Iyashikei"] }, taste);
    const brutal = fitOf({ genres: ["Adventure"], tags: ["Battle Royale"] }, taste);
    expect(calm.score).toBeGreaterThan(brutal.score);
    expect(calm.strongest).toEqual({ name: "Iyashikei", average: expect.closeTo(9.33, 2) });
  });

  it("ignores tags you have no view on, rather than thinning the fit", () => {
    expect(fitOf({ genres: ["Adventure"], tags: ["Unheard Of"] }, taste).score).toBe(fitOf({ genres: ["Adventure"] }, taste).score);
  });
});

describe("Not for me", () => {
  it("nudges the genres and tags of titles you waved away down", () => {
    const before = tasteOf(ratedLibrary);
    const after = tasteOf(ratedLibrary, {
      dismissed: [
        { genres: ["Mystery"], tags: ["Harem"] },
        { genres: ["Mystery"], tags: ["Harem"] },
      ],
    });
    expect(after.genres.get("Mystery")!.lean).toBeLessThan(before.genres.get("Mystery")!.lean);
    // Your own average for it doesn't change: a dismissal isn't a rating.
    expect(after.genres.get("Mystery")).toMatchObject({ average: 9, rated: 3 });
    expect(after.tags.get("Harem")).toMatchObject({ rated: 0 });
    expect(after.tags.get("Harem")!.lean).toBeLessThan(0);
    // A tag known only from dismissals never becomes a reason.
    expect(fitOf({ genres: [], tags: ["Harem"] }, after).strongest).toBeNull();
  });
});

describe("crowdLean", () => {
  it("is neutral at 70, a step per 10 points, capped at two", () => {
    expect(crowdLean(70)).toBe(0);
    expect(crowdLean(85)).toBe(1.5);
    expect(crowdLean(100)).toBe(2);
    expect(crowdLean(20)).toBe(-2);
    expect(crowdLean(null)).toBe(-0.5);
  });
});

describe("backlogPicks", () => {
  it("puts the best fit for your taste first, with its reason", () => {
    const mystery = item({ status: "planned", title: "The Mystery", genres: ["Mystery"], source: "anilist", community_score: 72 });
    const romance = item({ status: "planned", title: "The Romance", genres: ["Romance"], source: "anilist", community_score: 80 });
    const picks = backlogPicks([...ratedLibrary, romance, mystery], tasteOf(ratedLibrary));
    expect(picks.map((pick) => pick.item.title)).toEqual(["The Mystery", "The Romance"]);
    expect(picks[0].reason).toBe("You rate Mystery 9");
    expect(picks[1].reason).toBe("AniList 80");
  });

  it("only offers Planned titles", () => {
    expect(backlogPicks(ratedLibrary, tasteOf(ratedLibrary))).toEqual([]);
  });

  it("goes by the crowd until your taste is known, and names no genre", () => {
    const thin = ratedLibrary.slice(0, 2);
    const mystery = item({ status: "planned", title: "The Mystery", genres: ["Mystery"], source: "tmdb", community_score: 71 });
    const loved = item({ status: "planned", title: "Crowd Pleaser", genres: ["Romance"], source: "tmdb", community_score: 90 });
    const picks = backlogPicks([mystery, loved], tasteOf(thin));
    expect(picks.map((pick) => [pick.item.title, pick.reason])).toEqual([
      ["Crowd Pleaser", "TMDB 90"],
      ["The Mystery", null],
    ]);
  });

  it("breaks ties by the longest waiting, then by name", () => {
    const later = item({ status: "planned", title: "A later add", created_at: "2026-05-01T00:00:00Z" });
    const earlier = item({ status: "planned", title: "Z earlier add", created_at: "2026-02-01T00:00:00Z" });
    expect(backlogPicks([later, earlier], tasteOf([])).map((pick) => pick.item.title)).toEqual(["Z earlier add", "A later add"]);
  });
});

describe("seedsOf", () => {
  it("takes titles rated 8 or more, or starred, by kind; a star counts like a 10", () => {
    const loved = item({ rating: 9, source: "anilist", external_id: "1" });
    const starred = item({ rating: null, is_favorite: true, source: "anilist", external_id: "2" });
    const film = item({ rating: 10, source: "tmdb", external_id: "3", category_id: "film-shelf" });
    const meh = item({ rating: 7, source: "anilist", external_id: "4" });
    const seeds = seedsOf([meh, starred, loved, film], shelves);
    expect(seeds.get("anime")!.map((seed) => seed.item.external_id)).toEqual(["2", "1"]);
    expect(seeds.get("movie")!.map((seed) => seed.item.external_id)).toEqual(["3"]);
  });

  it("skips hand-added titles, custom shelves and an anime shelf's comics", () => {
    const seeds = seedsOf(
      [
        item({ rating: 10, source: "manual" }),
        item({ rating: 10, source: "anilist", external_id: "9", format: "manhwa" }),
        item({ rating: 10, source: "anilist", external_id: "8", category_id: "notes-shelf" }),
      ],
      shelves,
    );
    expect(seeds.size).toBe(0);
  });

  it(`keeps the best ${SEEDS_PER_KIND} of a kind, starred ones counting extra`, () => {
    const many = Array.from({ length: 14 }, (_, index) => item({ rating: 8, source: "anilist", external_id: `n${index}` }));
    const starred = item({ rating: 9, is_favorite: true, source: "anilist", external_id: "star" });
    const seeds = seedsOf([...many, starred], shelves).get("anime")!;
    expect(seeds).toHaveLength(SEEDS_PER_KIND);
    expect(seeds[0].item.external_id).toBe("star");
    expect(seeds[0].weight).toBeCloseTo(1.1);
  });
});

describe("newPicks", () => {
  const frieren = item({ title: "Frieren", rating: 10, source: "anilist", external_id: "100" });
  const mushishi = item({ title: "Mushishi", rating: 9, source: "anilist", external_id: "200" });
  const seeds: Seed[] = [
    { item: frieren, weight: 1 },
    { item: mushishi, weight: 0.9 },
  ];
  const library = [frieren, mushishi];

  function answer(seed: string, ...suggestions: SearchResult[]): SeedSuggestions {
    return { seed, suggestions: suggestions.map((entry) => ({ result: entry })) };
  }

  it("ranks a title several favourites point at above one only one does", () => {
    const picks = newPicks({
      seeds,
      answers: [answer("100", result("1"), result("2")), answer("200", result("2"))],
      library,
      dismissed: new Set(),
      taste: tasteOf([]),
    });
    expect(picks.map((pick) => pick.result.externalId)).toEqual(["2", "1"]);
    expect(picks[0].because).toEqual(["Mushishi", "Frieren"]);
    expect(picks[0].reason).toBe("Because you loved Mushishi and Frieren");
    expect(picks[1].reason).toBe("Because you loved Frieren");
  });

  it("files a pick on the shelf of the favourite pointing at it hardest", () => {
    const film = item({ title: "Dune", rating: 10, source: "tmdb", external_id: "438631", category_id: "film-shelf" });
    const picks = newPicks({
      seeds: [{ item: film, weight: 1 }],
      answers: [answer("438631", result("693134", { source: "tmdb" }))],
      library: [film],
      dismissed: new Set(),
      taste: tasteOf([]),
    });
    expect(picks[0].categoryId).toBe("film-shelf");
  });

  it("leaves out what you have, what you waved away, and namesakes you typed in", () => {
    const typed = item({ title: "Monster", source: "manual" });
    const owned = item({ title: "Owned", source: "anilist", external_id: "3" });
    const picks = newPicks({
      seeds,
      answers: [answer("100", result("3"), result("4"), result("5", { title: "monster" }), result("6"), result("200"))],
      library: [...library, typed, owned],
      dismissed: new Set(["anilist:4"]),
      taste: tasteOf([]),
    });
    expect(picks.map((pick) => pick.result.externalId)).toEqual(["6"]);
  });

  it("keeps a same-named title from the same provider: a remake isn't the original", () => {
    const original = item({ title: "Dune", source: "tmdb", external_id: "841" });
    const film = item({ title: "Arrival", rating: 9, source: "tmdb", external_id: "329865" });
    const picks = newPicks({
      seeds: [{ item: film, weight: 0.9 }],
      answers: [answer("329865", result("438631", { source: "tmdb", title: "Dune" }))],
      library: [original, film],
      dismissed: new Set(),
      taste: tasteOf([]),
    });
    expect(picks).toHaveLength(1);
  });

  it("skips a later season unless you've started what it follows", () => {
    const planned = item({ title: "Naruto", status: "planned", source: "anilist", external_id: "20" });
    const sequel = { result: result("7"), follows: ["999"] };
    const next = { result: result("8"), follows: ["100"] };
    const shippuden = { result: result("1735"), follows: ["20"] };
    const picks = newPicks({
      seeds,
      answers: [{ seed: "100", suggestions: [sequel, next, shippuden] }],
      library: [...library, planned],
      dismissed: new Set(),
      taste: tasteOf([]),
    });
    expect(picks.map((pick) => pick.result.externalId)).toEqual(["8"]);
  });

  it("lets your genre taste and the crowd decide between equal backers", () => {
    const taste = tasteOf(ratedLibrary);
    const picks = newPicks({
      seeds: [{ item: frieren, weight: 1 }],
      answers: [
        { seed: "100", suggestions: [{ result: result("r", { genres: ["Romance"], communityScore: 70 }) }] },
        { seed: "100", suggestions: [{ result: result("m", { genres: ["Mystery"], communityScore: 70 }) }] },
      ],
      library,
      dismissed: new Set(),
      taste,
    });
    expect(picks.map((pick) => pick.result.externalId)).toEqual(["m", "r"]);
  });

  it("ignores answers for titles that aren't seeds, and stops at the limit", () => {
    const picks = newPicks({
      seeds,
      answers: [answer("404", result("x")), answer("100", result("1"), result("2"), result("3"))],
      library,
      dismissed: new Set(),
      taste: tasteOf([]),
      limit: 2,
    });
    expect(picks.map((pick) => pick.result.externalId)).toEqual(["1", "2"]);
  });
});

describe("moodPicks", () => {
  const shelf = "film-shelf";
  const film = (id: string, overrides: Partial<SearchResult> = {}) => ({ result: result(id, { source: "tmdb", ...overrides }) });

  it("keeps the provider's order when nothing else speaks", () => {
    const picks = moodPicks({
      found: [film("1"), film("2"), film("3")],
      recommended: [],
      categoryId: shelf,
      library: [],
      dismissed: new Set(),
      taste: tasteOf([]),
    });
    expect(picks.map((pick) => pick.result.externalId)).toEqual(["1", "2", "3"]);
    expect(picks.every((pick) => pick.categoryId === shelf && pick.support === 0)).toBe(true);
    expect(picks[0].reason).toBe("One of the best rated");
  });

  it("lifts a title your favourites point at, with their reason", () => {
    const backed = newPicks({
      seeds: [{ item: item({ title: "Dune", source: "tmdb", external_id: "438631" }), weight: 1 }],
      answers: [{ seed: "438631", suggestions: [film("3")] }],
      library: [],
      dismissed: new Set(),
      taste: tasteOf([]),
    });
    const picks = moodPicks({ found: [film("1"), film("2"), film("3")], recommended: backed, categoryId: shelf, library: [], dismissed: new Set(), taste: tasteOf([]) });
    expect(picks[0]).toMatchObject({ result: { externalId: "3" }, reason: "Because you loved Dune", because: ["Dune"] });
    expect(picks[0].support).toBeGreaterThan(0);
  });

  it("gives a genre you rate, else the crowd, as the reason", () => {
    const picks = moodPicks({
      found: [film("1", { genres: ["Mystery"], communityScore: 70 }), film("2", { communityScore: 91 })],
      recommended: [],
      categoryId: shelf,
      library: ratedLibrary,
      dismissed: new Set(),
      taste: tasteOf(ratedLibrary),
    });
    expect(picks.map((pick) => pick.reason)).toEqual(["You rate Mystery 9", "TMDB 91"]);
  });

  it("leaves out what you have, what you waved away and repeats, and later seasons you haven't started", () => {
    const owned = item({ title: "Owned", source: "tmdb", external_id: "1" });
    const picks = moodPicks({
      found: [film("1"), film("2"), film("3"), film("3"), { result: result("4"), follows: ["404"] }, film("5")],
      recommended: [],
      categoryId: shelf,
      library: [owned],
      dismissed: new Set([pickKey({ source: "tmdb", externalId: "2" })]),
      taste: tasteOf([]),
    });
    expect(picks.map((pick) => pick.result.externalId)).toEqual(["3", "5"]);
  });

  it("stops at the limit", () => {
    const found = Array.from({ length: 30 }, (_, index) => film(String(index)));
    expect(moodPicks({ found, recommended: [], categoryId: shelf, library: [], dismissed: new Set(), taste: tasteOf([]), limit: 5 })).toHaveLength(5);
  });
});

describe("becauseLine", () => {
  it("names one or two favourites, and counts the rest", () => {
    expect(becauseLine(["Frieren"])).toBe("Because you loved Frieren");
    expect(becauseLine(["Frieren", "Mushishi"])).toBe("Because you loved Frieren and Mushishi");
    expect(becauseLine(["Frieren", "Mushishi", "Monster", "Pluto"])).toBe("Because you loved Frieren and 3 more");
  });
});
