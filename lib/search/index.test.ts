// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Outside Next there's no cache store; run the wrapped function directly.
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));

const searchAniList = vi.fn();
const searchAniListMany = vi.fn();
const searchAniListReading = vi.fn();
const searchAniListReadingMany = vi.fn();
const getAniListSeries = vi.fn();
const searchTmdbMovies = vi.fn();
const getTmdbSeriesDetails = vi.fn();
const getTmdbMovieDetails = vi.fn();
const getTmdbCollection = vi.fn();
const getAniListSuggestions = vi.fn();
const getTmdbSuggestions = vi.fn();
const discoverAniList = vi.fn();
const discoverTmdb = vi.fn();
vi.mock("./anilist", () => ({
  searchAniList: (q: string) => searchAniList(q),
  searchAniListMany: (queries: string[]) => searchAniListMany(queries),
  searchAniListReading: (q: string) => searchAniListReading(q),
  searchAniListReadingMany: (queries: string[]) => searchAniListReadingMany(queries),
  getAniListSeries: (id: number) => getAniListSeries(id),
  getAniListSuggestions: (ids: string[]) => getAniListSuggestions(ids),
  discoverAniList: (filter: unknown) => discoverAniList(filter),
}));
vi.mock("./tmdb", () => ({
  tmdbConfigured: () => Boolean(process.env.TMDB_READ_TOKEN),
  searchTmdbMovies: (q: string) => searchTmdbMovies(q),
  searchTmdbSeries: vi.fn(),
  getTmdbSeriesDetails: (id: string) => getTmdbSeriesDetails(id),
  getTmdbMovieDetails: (id: string) => getTmdbMovieDetails(id),
  getTmdbCollection: (id: number) => getTmdbCollection(id),
  getTmdbSuggestions: (type: string, id: string) => getTmdbSuggestions(type, id),
  discoverTmdb: (type: string, filter: unknown) => discoverTmdb(type, filter),
}));
vi.mock("./igdb", () => ({ igdbConfigured: () => false, searchIgdb: vi.fn(), getIgdbSuggestions: vi.fn(), discoverIgdb: vi.fn() }));

const {
  discoverTitles,
  getAnimeSeries,
  getRelated,
  getSeriesDetails,
  getSuggestions,
  matchMetadata,
  normaliseQuery,
  possessiveVariant,
  searchMetadata,
} = await import("./index");
const { ProviderError } = await import("./types");

describe("searchMetadata", () => {
  beforeEach(() => {
    vi.stubEnv("TMDB_READ_TOKEN", "token");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    searchAniList.mockReset();
    searchTmdbMovies.mockReset();
    getTmdbSeriesDetails.mockReset();
  });

  it("shares one cache entry for the same words typed differently", () => {
    expect(normaliseQuery("  Frieren   Beyond ")).toBe("frieren beyond");
  });

  it("asks the provider for the kind with the normalised query", async () => {
    const result = { source: "anilist", externalId: "1", title: "Frieren" };
    searchAniList.mockResolvedValue([result]);
    expect(await searchMetadata("anime", " FRIEREN ")).toEqual({ results: [result] });
    expect(searchAniList).toHaveBeenCalledWith("frieren");
  });

  it("looks through AniList's comics on an anime shelf's Manga search, and only there", async () => {
    const manga = { source: "anilist", externalId: "118586", title: "Frieren", format: "manga" };
    searchAniListReading.mockResolvedValueOnce([manga]);
    expect(await searchMetadata("anime", "  Frieren ", "manga")).toEqual({ results: [manga] });
    expect(searchAniListReading).toHaveBeenCalledWith("frieren");
    expect(searchAniList).not.toHaveBeenCalled();

    searchTmdbMovies.mockResolvedValueOnce([]);
    await searchMetadata("movie", "dune", "manga");
    expect(searchTmdbMovies).toHaveBeenCalledWith("dune");
    expect(searchAniListReading).toHaveBeenCalledTimes(1);
  });

  it("says a provider isn't set up instead of calling it", async () => {
    expect(await searchMetadata("game", "hades")).toEqual({ results: [], error: "not_configured" });
    vi.stubEnv("TMDB_READ_TOKEN", "");
    expect(await searchMetadata("movie", "dune")).toEqual({ results: [], error: "not_configured" });
    expect(searchTmdbMovies).not.toHaveBeenCalled();
  });

  it("returns no results and a flag when the provider fails, without leaking details", async () => {
    searchTmdbMovies.mockRejectedValue(new ProviderError("tmdb", "HTTP 503", 503));
    expect(await searchMetadata("movie", "dune")).toEqual({ results: [], error: "unavailable" });
    expect(console.error).toHaveBeenCalledWith("[search]", "movie", "tmdb: HTTP 503");
  });

  it("looks up series details, or gives up quietly", async () => {
    getTmdbSeriesDetails.mockResolvedValue({ progressTotal: 62 });
    expect(await getSeriesDetails("1396")).toEqual({ progressTotal: 62 });
    getTmdbSeriesDetails.mockRejectedValue(new ProviderError("tmdb", "timed out"));
    expect(await getSeriesDetails("1396")).toBeNull();
    vi.stubEnv("TMDB_READ_TOKEN", "");
    expect(await getSeriesDetails("1396")).toBeNull();
  });
});

describe("matchMetadata", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
    searchAniListMany.mockReset();
    searchAniListReadingMany.mockReset();
    searchTmdbMovies.mockReset();
  });

  it("finds possessives typed without the apostrophe", () => {
    expect(possessiveVariant("Hells Paradise")).toBe("Hell's Paradise");
    expect(possessiveVariant("Dr. Stone")).toBeNull();
    expect(possessiveVariant("Boss Baby")).toBeNull();
  });

  it("batches anime and retries the ones AniList found nothing for", async () => {
    const hit = { source: "anilist", externalId: "1", title: "Naruto" };
    const retried = { source: "anilist", externalId: "2", title: "Hell's Paradise" };
    searchAniListMany.mockResolvedValueOnce([[hit], []]).mockResolvedValueOnce([[retried]]);
    expect(await matchMetadata("anime", ["Naruto", "Hells Paradise"])).toEqual({ results: [[hit], [retried]] });
    expect(searchAniListMany).toHaveBeenLastCalledWith(["Hell's Paradise"]);
  });

  it("offers the comic when a title has no anime, and never in place of one", async () => {
    const hit = { source: "anilist", externalId: "1", title: "Naruto" };
    const manhwa = { source: "anilist", externalId: "140407", title: "The Greatest Estate Developer", format: "manhwa", subtitle: "Manhwa · 222 ch" };
    searchAniListMany.mockResolvedValue([[hit], []]);
    searchAniListReadingMany.mockResolvedValue([[manhwa]]);
    expect(await matchMetadata("anime", ["Naruto", "The Greatest Estate Developer"])).toEqual({ results: [[hit], [manhwa]] });
    // Only the miss is looked up as a comic.
    expect(searchAniListReadingMany).toHaveBeenCalledWith(["The Greatest Estate Developer"]);
  });

  it("leaves a miss empty rather than losing the matches when the comic lookup fails", async () => {
    const hit = { source: "anilist", externalId: "1", title: "Naruto" };
    searchAniListMany.mockResolvedValue([[hit], []]);
    searchAniListReadingMany.mockRejectedValue(new ProviderError("anilist", "HTTP 500", 500));
    expect(await matchMetadata("anime", ["Naruto", "Nothing At All"])).toEqual({ results: [[hit], []] });
  });

  it("asks nothing extra when every title matched", async () => {
    searchAniListMany.mockResolvedValue([[{ source: "anilist", externalId: "1", title: "Naruto" }]]);
    await matchMetadata("anime", ["Naruto"]);
    expect(searchAniListReadingMany).not.toHaveBeenCalled();
  });

  it("uses the single search for other kinds, keeping going when one fails", async () => {
    vi.stubEnv("TMDB_READ_TOKEN", "token");
    const dune = { source: "tmdb", externalId: "3", title: "Dune" };
    searchTmdbMovies.mockImplementation(async (query: string) => {
      if (query === "broken") throw new ProviderError("tmdb", "HTTP 500", 500);
      return [dune];
    });
    expect(await matchMetadata("movie", ["Dune", "broken"])).toEqual({ results: [[dune], []] });
    vi.unstubAllEnvs();
  });

  it("flags AniList being down without throwing", async () => {
    searchAniListMany.mockRejectedValue(new ProviderError("anilist", "HTTP 429", 429));
    expect(await matchMetadata("anime", ["Naruto"])).toEqual({ results: [[]], error: "unavailable" });
  });
});

describe("getAnimeSeries", () => {
  afterEach(() => vi.restoreAllMocks());

  it("passes the series through, or flags AniList being down", async () => {
    const season = { source: "anilist", externalId: "145064", title: "Jujutsu Kaisen Season 2", release: "out" };
    getAniListSeries.mockResolvedValueOnce([season]);
    expect(await getAnimeSeries("113415")).toEqual({ results: [season] });
    expect(getAniListSeries).toHaveBeenCalledWith(113415);

    vi.spyOn(console, "error").mockImplementation(() => {});
    getAniListSeries.mockRejectedValueOnce(new ProviderError("anilist", "HTTP 429", 429));
    expect(await getAnimeSeries("113415")).toEqual({ results: [], error: "unavailable" });
  });
});

describe("getRelated for films", () => {
  beforeEach(() => vi.stubEnv("TMDB_READ_TOKEN", "token"));
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getTmdbMovieDetails.mockReset();
    getTmdbCollection.mockReset();
  });

  it("goes from a film to its collection's films, named", async () => {
    const sequel = { source: "tmdb", externalId: "693134", title: "Dune: Part Two", release: "out" };
    getTmdbMovieDetails.mockResolvedValue({ runtimeMinutes: 155, collectionId: 726871 });
    getTmdbCollection.mockResolvedValue({ name: "Dune Collection", titles: [sequel] });
    expect(await getRelated("movie", "438631")).toEqual({ name: "Dune Collection", results: [sequel] });
    expect(getTmdbMovieDetails).toHaveBeenCalledWith("438631");
    expect(getTmdbCollection).toHaveBeenCalledWith(726871);
  });

  it("has nothing for a film in no collection, and asks no further", async () => {
    getTmdbMovieDetails.mockResolvedValue({ runtimeMinutes: 132 });
    expect(await getRelated("movie", "496243")).toEqual({ results: [] });
    expect(getTmdbCollection).not.toHaveBeenCalled();
  });

  it("says TMDB isn't set up, or is down, without throwing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    getTmdbMovieDetails.mockResolvedValue({ collectionId: 726871 });
    getTmdbCollection.mockRejectedValueOnce(new ProviderError("tmdb", "HTTP 500", 500));
    expect(await getRelated("movie", "438631")).toEqual({ results: [], error: "unavailable" });

    vi.stubEnv("TMDB_READ_TOKEN", "");
    expect(await getRelated("movie", "438631")).toEqual({ results: [], error: "not_configured" });
  });

  it("sends anime to AniList's series", async () => {
    getAniListSeries.mockResolvedValueOnce([]);
    expect(await getRelated("anime", "113415")).toEqual({ results: [] });
    expect(getAniListSeries).toHaveBeenLastCalledWith(113415);
  });
});

describe("getSuggestions (SPEC §20)", () => {
  beforeEach(() => {
    vi.stubEnv("TMDB_READ_TOKEN", "token");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    getAniListSuggestions.mockReset();
    getTmdbSuggestions.mockReset();
  });

  it("asks AniList once for every anime seed, in a steady order", async () => {
    getAniListSuggestions.mockResolvedValue([{ seed: "1", suggestions: [] }]);
    expect(await getSuggestions("anime", ["9", "1", "9"])).toEqual({ results: [{ seed: "1", suggestions: [] }] });
    expect(getAniListSuggestions).toHaveBeenCalledExactlyOnceWith(["1", "9"]);
  });

  it("asks TMDB once per film, and skips a seed it can't answer for", async () => {
    getTmdbSuggestions.mockImplementation(async (type: string, id: string) => {
      if (id === "2") throw new ProviderError("tmdb", "HTTP 500", 500);
      return { seed: id, suggestions: [] };
    });
    expect(await getSuggestions("movie", ["1", "2"])).toEqual({ results: [{ seed: "1", suggestions: [] }] });
    expect(getTmdbSuggestions.mock.calls).toEqual([
      ["movie", "1"],
      ["movie", "2"],
    ]);

    getTmdbSuggestions.mockClear();
    await getSuggestions("series", ["5"]);
    expect(getTmdbSuggestions).toHaveBeenCalledExactlyOnceWith("tv", "5");
  });

  it("says unavailable when nothing answers, and not configured without keys", async () => {
    getTmdbSuggestions.mockRejectedValue(new ProviderError("tmdb", "timed out"));
    expect(await getSuggestions("movie", ["1"])).toEqual({ results: [], error: "unavailable" });

    getAniListSuggestions.mockRejectedValue(new ProviderError("anilist", "HTTP 429", 429));
    expect(await getSuggestions("anime", ["1"])).toEqual({ results: [], error: "unavailable" });

    expect(await getSuggestions("game", ["1"])).toEqual({ results: [], error: "not_configured" });
  });

  it("asks nobody without seeds", async () => {
    expect(await getSuggestions("anime", [])).toEqual({ results: [] });
    expect(getAniListSuggestions).not.toHaveBeenCalled();
  });
});

describe("discoverTitles (SPEC §20)", () => {
  beforeEach(() => {
    vi.stubEnv("TMDB_READ_TOKEN", "token");
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    discoverAniList.mockReset();
    discoverTmdb.mockReset();
  });

  it("sends each kind to its provider: a series shelf asks TMDB for TV", async () => {
    discoverAniList.mockResolvedValue([]);
    discoverTmdb.mockResolvedValue([{ result: { source: "tmdb", externalId: "1", title: "Band of Brothers" } }]);
    await discoverTitles({ kind: "anime", anilist: { tags: ["Military"] } });
    expect(discoverAniList).toHaveBeenCalledWith({ tags: ["Military"] });
    expect(await discoverTitles({ kind: "series", tmdb: { genres: [10768] } })).toEqual({
      results: [{ result: { source: "tmdb", externalId: "1", title: "Band of Brothers" } }],
    });
    expect(discoverTmdb).toHaveBeenCalledWith("tv", { genres: [10768] });
  });

  it("says unavailable when the provider fails, and not configured without keys", async () => {
    discoverTmdb.mockRejectedValue(new ProviderError("tmdb", "timed out"));
    expect(await discoverTitles({ kind: "movie", tmdb: { genres: [28] } })).toEqual({ results: [], error: "unavailable" });
    expect(await discoverTitles({ kind: "game", igdb: { themes: [1] } })).toEqual({ results: [], error: "not_configured" });
  });
});
