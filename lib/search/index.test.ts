// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Outside Next there's no cache store; run the wrapped function directly.
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));

const searchAniList = vi.fn();
const searchAniListMany = vi.fn();
const searchAniListOther = vi.fn();
const getAniListSeries = vi.fn();
const searchTmdbMovies = vi.fn();
const getTmdbSeriesDetails = vi.fn();
vi.mock("./anilist", () => ({
  searchAniList: (q: string) => searchAniList(q),
  searchAniListMany: (queries: string[]) => searchAniListMany(queries),
  searchAniListOther: (queries: string[]) => searchAniListOther(queries),
  getAniListSeries: (id: number) => getAniListSeries(id),
}));
vi.mock("./tmdb", () => ({
  tmdbConfigured: () => Boolean(process.env.TMDB_READ_TOKEN),
  searchTmdbMovies: (q: string) => searchTmdbMovies(q),
  searchTmdbSeries: vi.fn(),
  getTmdbSeriesDetails: (id: string) => getTmdbSeriesDetails(id),
}));
vi.mock("./igdb", () => ({ igdbConfigured: () => false, searchIgdb: vi.fn() }));

const { getAnimeSeries, getSeriesDetails, matchMetadata, normaliseQuery, possessiveVariant, searchMetadata } = await import("./index");
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
    searchAniListOther.mockReset();
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

  it("says what AniList has instead when a title isn't an anime there", async () => {
    const hit = { source: "anilist", externalId: "1", title: "Naruto" };
    const manhwa = { form: "manhwa", title: "The Greatest Estate Developer" };
    searchAniListMany.mockResolvedValue([[hit], []]);
    searchAniListOther.mockResolvedValue([manhwa]);
    expect(await matchMetadata("anime", ["Naruto", "The Greatest Estate Developer"])).toEqual({
      results: [[hit], []],
      elsewhere: [null, manhwa],
    });
    expect(searchAniListOther).toHaveBeenCalledWith(["The Greatest Estate Developer"]);
  });

  it("leaves the misses unexplained rather than losing the matches", async () => {
    const hit = { source: "anilist", externalId: "1", title: "Naruto" };
    searchAniListMany.mockResolvedValue([[hit], []]);
    searchAniListOther.mockRejectedValue(new ProviderError("anilist", "HTTP 500", 500));
    expect(await matchMetadata("anime", ["Naruto", "Nothing At All"])).toEqual({ results: [[hit], []], elsewhere: undefined });
  });

  it("asks nothing extra when every title matched", async () => {
    searchAniListMany.mockResolvedValue([[{ source: "anilist", externalId: "1", title: "Naruto" }]]);
    await matchMetadata("anime", ["Naruto"]);
    expect(searchAniListOther).not.toHaveBeenCalled();
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
