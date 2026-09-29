import { z } from "zod";
import { cleanGenres, fetchJson, toScore, yearFromDate } from "./http";
import {
  ProviderError,
  RESULT_LIMIT,
  type Release,
  type SearchResult,
  type SeedSuggestions,
  type SeriesTitle,
  type Suggestion,
  type TmdbFilter,
} from "./types";

const API = "https://api.themoviedb.org/3";
const POSTER = "https://image.tmdb.org/t/p/w500";
const BACKDROP = "https://image.tmdb.org/t/p/w1280";
/** Below this, vote_average is one or two people's opinion, not a community score. */
const MIN_VOTES = 10;

export function tmdbConfigured(): boolean {
  return Boolean(process.env.TMDB_READ_TOKEN?.trim());
}

function request<T extends z.ZodType>(path: string, schema: T) {
  const token = process.env.TMDB_READ_TOKEN?.trim();
  if (!token) throw new ProviderError("tmdb", "TMDB_READ_TOKEN is not set");
  return fetchJson("tmdb", `${API}${path}`, { headers: { Authorization: `Bearer ${token}` } }, schema);
}

const baseSchema = z.object({
  id: z.number(),
  poster_path: z.string().nullish(),
  backdrop_path: z.string().nullish(),
  genre_ids: z.array(z.number()).nullish(),
  vote_average: z.number().nullish(),
  vote_count: z.number().nullish(),
});

const movieSchema = baseSchema.extend({
  title: z.string().nullish(),
  original_title: z.string().nullish(),
  release_date: z.string().nullish(),
});

const tvSchema = baseSchema.extend({
  name: z.string().nullish(),
  original_name: z.string().nullish(),
  first_air_date: z.string().nullish(),
});

export type TmdbMovie = z.infer<typeof movieSchema>;
export type TmdbShow = z.infer<typeof tvSchema>;
type Base = z.infer<typeof baseSchema>;

const pageSchema = <T extends z.ZodType>(item: T) => z.object({ results: z.array(item) });

const genreListSchema = z.object({ genres: z.array(z.object({ id: z.number(), name: z.string() })) });

export type GenreNames = ReadonlyMap<number, string>;

/**
 * TMDB search results carry genre ids only. The id → name lists almost never
 * change, so they're held for the life of the server process. A failed load
 * isn't remembered, so the next search tries again.
 */
const genreLists = new Map<"movie" | "tv", Promise<GenreNames>>();

function genreNames(type: "movie" | "tv"): Promise<GenreNames> {
  let list = genreLists.get(type);
  if (!list) {
    list = request(`/genre/${type}/list?language=en`, genreListSchema).then(
      (body) => new Map(body.genres.map((genre) => [genre.id, genre.name])),
    );
    list.catch(() => genreLists.delete(type));
    genreLists.set(type, list);
  }
  return list;
}

/** Test hook: forget cached genre lists. */
export function resetTmdbGenres() {
  genreLists.clear();
}

function shared(item: Base, genres: GenreNames) {
  const votes = item.vote_count ?? 0;
  return {
    source: "tmdb" as const,
    externalId: String(item.id),
    coverUrl: item.poster_path ? `${POSTER}${item.poster_path}` : undefined,
    backdropUrl: item.backdrop_path ? `${BACKDROP}${item.backdrop_path}` : undefined,
    genres: cleanGenres((item.genre_ids ?? []).map((id) => genres.get(id))),
    communityScore: votes >= MIN_VOTES ? toScore((item.vote_average ?? 0) * 10) : undefined,
  };
}

/** Show the original title only when it adds something ("Anatomie d'une chute"). */
function originalTitle(title: string, original: string | null | undefined) {
  const trimmed = original?.trim();
  return trimmed && trimmed.toLowerCase() !== title.toLowerCase() ? trimmed : undefined;
}

export function normaliseTmdbMovie(movie: TmdbMovie, genres: GenreNames): SearchResult | null {
  const title = movie.title?.trim();
  if (!title) return null;
  return {
    ...shared(movie, genres),
    title,
    year: yearFromDate(movie.release_date),
    format: "movie",
    subtitle: originalTitle(title, movie.original_title),
    altTitle: originalTitle(title, movie.original_title),
  };
}

/** Episode totals aren't in search results; they're fetched on add (getSeriesDetails). */
export function normaliseTmdbShow(show: TmdbShow, genres: GenreNames): SearchResult | null {
  const title = show.name?.trim();
  if (!title) return null;
  return {
    ...shared(show, genres),
    title,
    year: yearFromDate(show.first_air_date),
    format: "tv",
    subtitle: originalTitle(title, show.original_name),
    altTitle: originalTitle(title, show.original_name),
  };
}

function searchPath(type: "movie" | "tv", query: string) {
  const params = new URLSearchParams({ query, include_adult: "false", language: "en-US", page: "1" });
  return `/search/${type}?${params}`;
}

export async function searchTmdbMovies(query: string): Promise<SearchResult[]> {
  const [page, genres] = await Promise.all([request(searchPath("movie", query), pageSchema(movieSchema)), genreNames("movie")]);
  return page.results
    .map((movie) => normaliseTmdbMovie(movie, genres))
    .filter((result) => result !== null)
    .slice(0, RESULT_LIMIT);
}

export async function searchTmdbSeries(query: string): Promise<SearchResult[]> {
  const [page, genres] = await Promise.all([request(searchPath("tv", query), pageSchema(tvSchema)), genreNames("tv")]);
  return page.results
    .map((show) => normaliseTmdbShow(show, genres))
    .filter((result) => result !== null)
    .slice(0, RESULT_LIMIT);
}

const showDetailsSchema = z.object({
  id: z.number(),
  in_production: z.boolean().nullish(),
  number_of_episodes: z.number().nullish(),
  episode_run_time: z.array(z.number()).nullish(),
  genres: z.array(z.object({ name: z.string() })).nullish(),
});

export type SeriesDetails = Pick<SearchResult, "progressTotal" | "genres" | "runtimeMinutes">;

export function normaliseShowDetails(details: z.infer<typeof showDetailsSchema>): SeriesDetails {
  const episodes = details.number_of_episodes ?? 0;
  return {
    // A show still in production gets no total, so +1 never "finishes" it early.
    progressTotal: details.in_production || episodes <= 0 ? undefined : episodes,
    // TMDB lists every run time a show has used; the first is the usual one.
    runtimeMinutes: runtime(details.episode_run_time?.[0]),
    genres: cleanGenres((details.genres ?? []).map((genre) => genre.name)),
  };
}

const movieDetailsSchema = z.object({
  id: z.number(),
  runtime: z.number().nullish(),
  belongs_to_collection: z.object({ id: z.number() }).nullish(),
});

export type MovieDetails = Pick<SearchResult, "runtimeMinutes"> & {
  /** The TMDB collection it belongs to ("Dune Collection"), when it has one. */
  collectionId?: number;
};

/** Longest film ever released runs under 15 hours; anything past this is bad data. */
const MAX_RUNTIME = 2000;

function runtime(minutes: number | null | undefined): number | undefined {
  return minutes && minutes > 0 && minutes <= MAX_RUNTIME ? Math.round(minutes) : undefined;
}

export function normaliseMovieDetails(details: z.infer<typeof movieDetailsSchema>): MovieDetails {
  return { runtimeMinutes: runtime(details.runtime), collectionId: details.belongs_to_collection?.id };
}

/** A film's length and collection, which search results don't carry. Looked up on add. */
export async function getTmdbMovieDetails(id: string): Promise<MovieDetails> {
  if (!/^\d+$/.test(id)) throw new ProviderError("tmdb", "invalid movie id");
  return normaliseMovieDetails(await request(`/movie/${id}?language=en-US`, movieDetailsSchema));
}

const collectionSchema = z.object({
  id: z.number(),
  name: z.string().nullish(),
  parts: z.array(movieSchema.extend({ adult: z.boolean().nullish(), softcore: z.boolean().nullish() })).nullish(),
});

export type MovieCollection = { name?: string; titles: SeriesTitle[] };

/** Out once its release date has passed; with no date, or a date to come, it's upcoming. */
function filmRelease(date: string | null | undefined, today: string): Release {
  return date && /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today ? "out" : "upcoming";
}

/**
 * A collection's films oldest first, films with no date last. TMDB lists them
 * in no promised order. An upcoming film says so where the original title
 * would go, since that's what the row has room for.
 */
export function normaliseCollection(
  collection: z.infer<typeof collectionSchema>,
  genres: GenreNames,
  today = new Date().toISOString().slice(0, 10),
): MovieCollection {
  const films = (collection.parts ?? [])
    .filter((part) => !part.adult && !part.softcore)
    .flatMap((part) => {
      const result = normaliseTmdbMovie(part, genres);
      if (!result) return [];
      const release = filmRelease(part.release_date, today);
      const title: SeriesTitle = { ...result, release, subtitle: release === "upcoming" ? "Upcoming" : result.subtitle };
      return [{ title, date: part.release_date || "9999" }];
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  return { name: collection.name?.trim() || undefined, titles: films.map((film) => film.title) };
}

/** Every film in a TMDB collection, for adding the rest of it alongside one. */
export async function getTmdbCollection(id: number): Promise<MovieCollection> {
  if (!Number.isInteger(id) || id <= 0) throw new ProviderError("tmdb", "invalid collection id");
  const [collection, genres] = await Promise.all([request(`/collection/${id}?language=en-US`, collectionSchema), genreNames("movie")]);
  return normaliseCollection(collection, genres);
}

/** Fewer votes than this, and a recommended title is too obscure to put in front of someone. */
const MIN_SUGGESTION_VOTES = 50;
const SUGGESTIONS_PER_SEED = 10;

const suggestedSchema = z.object({
  results: z.array(
    baseSchema.extend({
      title: z.string().nullish(),
      original_title: z.string().nullish(),
      release_date: z.string().nullish(),
      name: z.string().nullish(),
      original_name: z.string().nullish(),
      first_air_date: z.string().nullish(),
      adult: z.boolean().nullish(),
      softcore: z.boolean().nullish(),
    }),
  ),
});

export type TmdbSuggested = z.infer<typeof suggestedSchema>["results"][number];

/**
 * What TMDB recommends alongside one film or show, in its own order. Adult
 * titles, anything not out yet and titles too few people have voted on are
 * dropped.
 */
export function normaliseTmdbSuggestions(
  seed: string,
  type: "movie" | "tv",
  results: readonly TmdbSuggested[],
  genres: GenreNames,
  today = new Date().toISOString().slice(0, 10),
): SeedSuggestions {
  return { seed, suggestions: offerable(type, results, genres, today).slice(0, SUGGESTIONS_PER_SEED) };
}

/** Titles worth putting in front of someone: out already, not adult, and voted on by enough people. */
function offerable(type: "movie" | "tv", results: readonly TmdbSuggested[], genres: GenreNames, today: string): Suggestion[] {
  return results
    .filter((entry) => !entry.adult && !entry.softcore && (entry.vote_count ?? 0) >= MIN_SUGGESTION_VOTES)
    .filter((entry) => filmRelease(type === "movie" ? entry.release_date : entry.first_air_date, today) === "out")
    .map((entry) => (type === "movie" ? normaliseTmdbMovie(entry, genres) : normaliseTmdbShow(entry, genres)))
    .filter((result) => result !== null)
    .map((result) => ({ result }));
}

/** What TMDB recommends alongside one film (`movie`) or show (`tv`), for For you (SPEC §20). */
export async function getTmdbSuggestions(type: "movie" | "tv", id: string): Promise<SeedSuggestions> {
  if (!/^\d+$/.test(id)) throw new ProviderError("tmdb", `invalid ${type} id`);
  const [page, genres] = await Promise.all([
    request(`/${type}/${id}/recommendations?language=en-US&page=1`, suggestedSchema),
    genreNames(type),
  ]);
  return normaliseTmdbSuggestions(id, type, page.results, genres);
}

/**
 * Fewest votes for a title in a mood's list. Sorted by rating, anything
 * lower lets in films a dozen people love.
 */
const DISCOVER_VOTES = { movie: 300, tv: 150 } as const;

/** TMDB's discover query for a mood: any of the genres, any of the keywords, best rated first. */
export function discoverPath(type: "movie" | "tv", filter: TmdbFilter, page: number, today: string): string {
  const params = new URLSearchParams({
    include_adult: "false",
    language: "en-US",
    sort_by: "vote_average.desc",
    "vote_count.gte": String(DISCOVER_VOTES[type]),
    [type === "movie" ? "primary_release_date.lte" : "first_air_date.lte"]: today,
    page: String(page),
  });
  const ids = (list: readonly number[] | undefined) => (list ?? []).filter((id) => Number.isInteger(id) && id > 0).join("|");
  if (ids(filter.genres)) params.set("with_genres", ids(filter.genres));
  if (ids(filter.keywords)) params.set("with_keywords", ids(filter.keywords));
  // Anime lives on AniList shelves; on a Series shelf it would only be a namesake.
  if (type === "tv") params.set("without_genres", "16");
  return `/discover/${type}?${params}`;
}

/** TMDB's best-rated films or shows for a mood (SPEC §20): two pages, forty titles. */
export async function discoverTmdb(type: "movie" | "tv", filter: TmdbFilter): Promise<Suggestion[]> {
  if (!filter.genres?.length && !filter.keywords?.length) return [];
  const today = new Date().toISOString().slice(0, 10);
  const [first, second, genres] = await Promise.all([
    request(discoverPath(type, filter, 1, today), suggestedSchema),
    request(discoverPath(type, filter, 2, today), suggestedSchema),
    genreNames(type),
  ]);
  const seen = new Set<number>();
  const results = [...first.results, ...second.results].filter((entry) => !seen.has(entry.id) && seen.add(entry.id));
  return offerable(type, results, genres, today);
}

export async function getTmdbSeriesDetails(id: string): Promise<SeriesDetails> {
  if (!/^\d+$/.test(id)) throw new ProviderError("tmdb", "invalid series id");
  return normaliseShowDetails(await request(`/tv/${id}?language=en-US`, showDetailsSchema));
}
