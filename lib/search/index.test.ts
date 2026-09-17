// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Outside Next there's no cache store; run the wrapped function directly.
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: T) => fn }));

const searchAniList = vi.fn();
const searchTmdbMovies = vi.fn();
const getTmdbSeriesDetails = vi.fn();
vi.mock("./anilist", () => ({ searchAniList: (q: string) => searchAniList(q) }));
vi.mock("./tmdb", () => ({
  tmdbConfigured: () => Boolean(process.env.TMDB_READ_TOKEN),
  searchTmdbMovies: (q: string) => searchTmdbMovies(q),
  searchTmdbSeries: vi.fn(),
  getTmdbSeriesDetails: (id: string) => getTmdbSeriesDetails(id),
}));
vi.mock("./igdb", () => ({ igdbConfigured: () => false, searchIgdb: vi.fn() }));

const { getSeriesDetails, normaliseQuery, searchMetadata } = await import("./index");
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
