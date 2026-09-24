// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import breakingBad from "./__fixtures__/tmdb-tv-breaking-bad.json";
import movieGenres from "./__fixtures__/tmdb-genres-movie.json";
import tvGenres from "./__fixtures__/tmdb-genres-tv.json";
import dune from "./__fixtures__/tmdb-search-movie-dune.json";
import severanceSearch from "./__fixtures__/tmdb-search-tv-severance.json";
import severance from "./__fixtures__/tmdb-tv-severance.json";
import unauthorized from "./__fixtures__/tmdb-unauthorized.json";
import {
  getTmdbSeriesDetails,
  normaliseMovieDetails,
  normaliseShowDetails,
  resetTmdbGenres,
  searchTmdbMovies,
  searchTmdbSeries,
  tmdbConfigured,
} from "./tmdb";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Answers by URL path, like the real API. */
function tmdb(routes: Record<string, unknown>) {
  return vi.fn(async (input: string) => {
    const path = new URL(input).pathname.replace("/3", "");
    return path in routes ? json(routes[path]) : json({ status_message: "not found" }, 404);
  });
}

describe("TMDB", () => {
  beforeEach(() => {
    vi.stubEnv("TMDB_READ_TOKEN", "test-read-token");
    resetTmdbGenres();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("is only configured with a read token", () => {
    expect(tmdbConfigured()).toBe(true);
    vi.stubEnv("TMDB_READ_TOKEN", "  ");
    expect(tmdbConfigured()).toBe(false);
  });

  it("reads how long a film runs and how long a show's episodes run", () => {
    expect(normaliseMovieDetails({ id: 1, runtime: 155 }).runtimeMinutes).toBe(155);
    // Nothing usable rather than a zero: TMDB leaves it empty on unreleased films.
    expect(normaliseMovieDetails({ id: 1, runtime: 0 }).runtimeMinutes).toBeUndefined();
    expect(normaliseMovieDetails({ id: 1, runtime: null }).runtimeMinutes).toBeUndefined();
    expect(normaliseMovieDetails({ id: 1, runtime: 99999 }).runtimeMinutes).toBeUndefined();

    expect(normaliseShowDetails({ id: 1, number_of_episodes: 62, episode_run_time: [47, 22] }).runtimeMinutes).toBe(47);
    expect(normaliseShowDetails({ id: 1, number_of_episodes: 62, episode_run_time: [] }).runtimeMinutes).toBeUndefined();
  });

  it("normalises movies with genre names, posters and a score out of 100", async () => {
    const fetch = tmdb({ "/search/movie": dune, "/genre/movie/list": movieGenres });
    vi.stubGlobal("fetch", fetch);

    const results = await searchTmdbMovies("dune");
    expect(results[0]).toEqual({
      source: "tmdb",
      externalId: "438631",
      title: "Dune",
      year: 2021,
      coverUrl: "https://image.tmdb.org/t/p/w500/v1tRXZ4JtD2Iv6fjkPvT4GiwslV.jpg",
      backdropUrl: "https://image.tmdb.org/t/p/w1280/zRKQW58MBEY078AxkHxEJzUskCl.jpg",
      genres: ["Science Fiction", "Adventure"],
      communityScore: 78,
      format: "movie",
    });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("include_adult=false");
    expect(init.headers).toMatchObject({ Authorization: "Bearer test-read-token" });
  });

  it("skips the score until enough people have voted, and shows a differing original title", async () => {
    vi.stubGlobal("fetch", tmdb({ "/search/movie": dune, "/genre/movie/list": movieGenres }));
    const results = await searchTmdbMovies("dune");
    const unreleased = results.find((r) => r.title === "Dune: Part Three");
    expect(unreleased?.communityScore).toBeUndefined();
    expect(results.find((r) => r.title === "Anatomy of a Fall")?.subtitle).toBe("Anatomie d'une chute");
    expect(results[0].subtitle).toBeUndefined();
  });

  it("loads genre names once per process", async () => {
    const fetch = tmdb({ "/search/movie": dune, "/genre/movie/list": movieGenres });
    vi.stubGlobal("fetch", fetch);
    await searchTmdbMovies("dune");
    await searchTmdbMovies("dune part two");
    const genreCalls = fetch.mock.calls.filter(([url]) => String(url).includes("/genre/"));
    expect(genreCalls).toHaveLength(1);
  });

  it("searches series without an episode total (that comes on add)", async () => {
    vi.stubGlobal("fetch", tmdb({ "/search/tv": severanceSearch, "/genre/tv/list": tvGenres }));
    const [show] = await searchTmdbSeries("severance");
    expect(show).toMatchObject({ title: "Severance", year: 2022, genres: ["Drama", "Mystery", "Sci-Fi & Fantasy"], communityScore: 84 });
    expect(show.progressTotal).toBeUndefined();
  });

  it("gives a finished show its total and a show in production none", async () => {
    vi.stubGlobal("fetch", tmdb({ "/tv/1396": breakingBad, "/tv/95396": severance }));
    expect(await getTmdbSeriesDetails("1396")).toEqual({ progressTotal: 62, genres: ["Drama", "Crime"] });
    expect((await getTmdbSeriesDetails("95396")).progressTotal).toBeUndefined();
    await expect(getTmdbSeriesDetails("../movie/1")).rejects.toThrow("invalid series id");
  });

  it("reports a bad token as a provider error, and retries genres after a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(unauthorized, 401)));
    await expect(searchTmdbMovies("dune")).rejects.toMatchObject({ provider: "tmdb", status: 401 });

    vi.stubGlobal("fetch", tmdb({ "/search/movie": dune, "/genre/movie/list": movieGenres }));
    expect((await searchTmdbMovies("dune"))[0].genres).toEqual(["Science Fiction", "Adventure"]);
  });
});
