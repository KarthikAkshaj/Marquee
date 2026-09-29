// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import duneCollection from "./__fixtures__/tmdb-collection-dune.json";
import breakingBad from "./__fixtures__/tmdb-tv-breaking-bad.json";
import movieGenres from "./__fixtures__/tmdb-genres-movie.json";
import tvGenres from "./__fixtures__/tmdb-genres-tv.json";
import dune from "./__fixtures__/tmdb-search-movie-dune.json";
import severanceSearch from "./__fixtures__/tmdb-search-tv-severance.json";
import severance from "./__fixtures__/tmdb-tv-severance.json";
import unauthorized from "./__fixtures__/tmdb-unauthorized.json";
import duneRecommendations from "./__fixtures__/tmdb-recommendations-dune.json";
import warPage1 from "./__fixtures__/tmdb-discover-war-1.json";
import warPage2 from "./__fixtures__/tmdb-discover-war-2.json";
import {
  discoverPath,
  discoverTmdb,
  getTmdbCollection,
  getTmdbSeriesDetails,
  getTmdbSuggestions,
  normaliseCollection,
  normaliseMovieDetails,
  normaliseShowDetails,
  normaliseTmdbSuggestions,
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

    expect(normaliseMovieDetails({ id: 1, runtime: 155, belongs_to_collection: { id: 726871 } }).collectionId).toBe(726871);
    expect(normaliseMovieDetails({ id: 1, runtime: 132, belongs_to_collection: null }).collectionId).toBeUndefined();

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

  it("lists a collection's films oldest first, and says which aren't out yet", () => {
    const genres = new Map([[878, "Science Fiction"], [12, "Adventure"]]);
    // Shuffled: TMDB promises no order.
    const shuffled = { ...duneCollection, parts: [duneCollection.parts[2], duneCollection.parts[0], duneCollection.parts[1]] };
    const { name, titles } = normaliseCollection(shuffled, genres, "2026-09-27");

    expect(name).toBe("Dune Collection");
    expect(titles.map((title) => [title.title, title.year, title.release])).toEqual([
      ["Dune", 2021, "out"],
      ["Dune: Part Two", 2024, "out"],
      ["Dune: Part Three", 2026, "upcoming"],
    ]);
    expect(titles[0]).toMatchObject({ source: "tmdb", externalId: "438631", format: "movie", genres: ["Science Fiction", "Adventure"] });
    expect(titles[0].coverUrl).toMatch(/^https:\/\/image\.tmdb\.org\/t\/p\/w500\//);
    // Nobody has voted on a film that isn't out, so there's no score to show.
    expect(titles[2]).toMatchObject({ subtitle: "Upcoming", communityScore: undefined });

    // Out on its release day, not the day after.
    expect(normaliseCollection(duneCollection, genres, "2026-12-15").titles[2].release).toBe("out");
  });

  it("keeps undated films last and adult ones out", () => {
    const part = duneCollection.parts[0];
    const { titles } = normaliseCollection(
      {
        id: 1,
        name: " ",
        parts: [
          { ...part, id: 3, title: "Untitled Sequel", release_date: "" },
          { ...part, id: 2, title: "Not For Here", adult: true },
          { ...part, id: 4, title: "Nor This", softcore: true },
          { ...part, id: 1, title: "The First One", release_date: "1999-03-31" },
        ],
      },
      new Map(),
      "2026-09-27",
    );
    expect(titles.map((title) => [title.title, title.release])).toEqual([
      ["The First One", "out"],
      ["Untitled Sequel", "upcoming"],
    ]);
    expect(normaliseCollection({ id: 1, name: " ", parts: [] }, new Map()).name).toBeUndefined();
  });

  it("fetches a collection with the film genre names", async () => {
    const fetch = tmdb({ "/collection/726871": duneCollection, "/genre/movie/list": movieGenres });
    vi.stubGlobal("fetch", fetch);
    const { titles } = await getTmdbCollection(726871);
    expect(titles.map((title) => title.title)).toEqual(["Dune", "Dune: Part Two", "Dune: Part Three"]);
    expect(titles[1].genres).toEqual(["Science Fiction", "Adventure"]);
    await expect(getTmdbCollection(0)).rejects.toThrow("invalid collection id");
  });

  it("fetches what TMDB recommends alongside a film, in its order, with genre names", async () => {
    vi.stubGlobal("fetch", tmdb({ "/movie/438631/recommendations": duneRecommendations, "/genre/movie/list": movieGenres }));
    const answer = await getTmdbSuggestions("movie", "438631");
    expect(answer.seed).toBe("438631");
    expect(answer.suggestions).toHaveLength(10);
    expect(answer.suggestions.slice(0, 3).map(({ result }) => result.title)).toEqual(["Dune: Part Two", "Chaos Walking", "Ender's Game"]);
    expect(answer.suggestions[0].result).toMatchObject({ source: "tmdb", externalId: "693134", year: 2024, format: "movie", communityScore: 81 });
    expect(answer.suggestions[0].result.genres).toContain("Science Fiction");
    await expect(getTmdbSuggestions("movie", "1; drop")).rejects.toThrow("invalid movie id");
  });

  it("drops adult, unreleased and hardly-voted recommendations", () => {
    const entry = (id: number, overrides: Record<string, unknown> = {}) => ({
      id,
      title: `Film ${id}`,
      release_date: "2020-01-01",
      vote_count: 500,
      vote_average: 7,
      ...overrides,
    });
    const answer = normaliseTmdbSuggestions(
      "1",
      "movie",
      [entry(2), entry(3, { adult: true }), entry(4, { release_date: "2031-01-01" }), entry(5, { release_date: "" }), entry(6, { vote_count: 12 })],
      new Map(),
      "2026-09-29",
    );
    expect(answer.suggestions.map(({ result }) => result.externalId)).toEqual(["2"]);

    const show = normaliseTmdbSuggestions("1", "tv", [{ id: 7, name: "Show", first_air_date: "2019-05-01", vote_count: 90 }], new Map(), "2026-09-29");
    expect(show.suggestions[0].result).toMatchObject({ title: "Show", format: "tv", year: 2019 });
  });

  it("builds a mood's discover query: best rated, enough votes, out already", () => {
    const path = new URL(`https://x${discoverPath("movie", { genres: [10752] }, 2, "2026-09-29")}`);
    expect(path.pathname).toBe("/discover/movie");
    expect(Object.fromEntries(path.searchParams)).toEqual({
      include_adult: "false",
      language: "en-US",
      sort_by: "vote_average.desc",
      "vote_count.gte": "300",
      "primary_release_date.lte": "2026-09-29",
      page: "2",
      with_genres: "10752",
    });

    const tv = new URL(`https://x${discoverPath("tv", { keywords: [383896, 275276] }, 1, "2026-09-29")}`).searchParams;
    expect(tv.get("with_keywords")).toBe("383896|275276");
    expect(tv.get("first_air_date.lte")).toBe("2026-09-29");
    // Anime belongs on AniList shelves.
    expect(tv.get("without_genres")).toBe("16");
  });

  it("fetches two pages of a mood and keeps each title once", async () => {
    const fetch = vi.fn(async (input: string) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/genre/movie/list")) return json(movieGenres);
      return json(url.searchParams.get("page") === "1" ? warPage1 : { ...warPage2, results: [...warPage2.results, warPage1.results[0]] });
    });
    vi.stubGlobal("fetch", fetch);
    const found = await discoverTmdb("movie", { genres: [10752] });
    expect(found.slice(0, 3).map(({ result }) => result.title)).toEqual(["Schindler's List", "Grave of the Fireflies", "The Pianist"]);
    expect(found).toHaveLength(40);
    expect(found[0].result).toMatchObject({ source: "tmdb", format: "movie", genres: expect.arrayContaining(["War"]) });
    expect(await discoverTmdb("movie", {})).toEqual([]);
  });

  it("reports a bad token as a provider error, and retries genres after a failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => json(unauthorized, 401)));
    await expect(searchTmdbMovies("dune")).rejects.toMatchObject({ provider: "tmdb", status: 401 });

    vi.stubGlobal("fetch", tmdb({ "/search/movie": dune, "/genre/movie/list": movieGenres }));
    expect((await searchTmdbMovies("dune"))[0].genres).toEqual(["Science Fiction", "Adventure"]);
  });
});
