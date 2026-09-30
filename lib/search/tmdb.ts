import { z } from "zod";
import { cleanGenres, fetchJson, toScore, yearFromDate } from "./http";
import { rankNamesakes, readTmdbHint } from "./tmdb-query";
import {
  ProviderError,
  RESULT_LIMIT,
  type DiscoverLength,
  type DiscoverOptions,
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
  /** The language it was made in (ISO 639-1), which tells namesakes apart. */
  original_language: z.string().nullish(),
});

const movieSchema = baseSchema.extend({
  title: z.string().nullish(),
  original_title: z.string().nullish(),
  release_date: z.string().nullish(),
});

type Base = z.infer<typeof baseSchema>;
export type TmdbMovie = z.infer<typeof movieSchema>;
export type TmdbShow = Base & { name?: string | null; original_name?: string | null; first_air_date?: string | null };

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

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

/** "Telugu" for a film made in Telugu. Nothing for English, which most titles here are, or a code with no name. */
export function languageLabel(code: string | null | undefined): string | undefined {
  if (!code || code === "en" || code === "xx") return undefined;
  try {
    const name = languageNames.of(code);
    return name && name !== code ? name : undefined;
  } catch {
    return undefined;
  }
}

/** The second line of a result: "Telugu · డార్లింగ్", so six films called Darling can be told apart. */
function subtitleOf(title: string, entry: { original_language?: string | null }, original: string | null | undefined): string | undefined {
  return [languageLabel(entry.original_language), originalTitle(title, original)].filter(Boolean).join(" · ") || undefined;
}

export function normaliseTmdbMovie(movie: TmdbMovie, genres: GenreNames): SearchResult | null {
  const title = movie.title?.trim();
  if (!title) return null;
  return {
    ...shared(movie, genres),
    title,
    year: yearFromDate(movie.release_date),
    format: "movie",
    subtitle: subtitleOf(title, movie, movie.original_title),
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
    subtitle: subtitleOf(title, show, show.original_name),
    altTitle: originalTitle(title, show.original_name),
  };
}

function searchPath(type: "movie" | "tv", query: string, narrow: Record<string, string> = {}, page = 1) {
  const params = new URLSearchParams({ query, include_adult: "false", language: "en-US", page: String(page), ...narrow });
  return `/search/${type}?${params}`;
}

/**
 * Pages read for a language hint. TMDB can't filter a search by language, so
 * the films in it are picked out of the first forty; the Telugu Darling is
 * 17th of 344.
 */
const LANGUAGE_PAGES = [1, 2];

/**
 * A search that tells namesakes apart. A year or language at the end of it
 * ("darling 2010", "darling telugu") runs a narrowed search of the words
 * before it, whose finds go first; the search as typed still runs, so a title
 * that ends in a year ("Wonder Woman 1984", from 2020) is still found. Either
 * way, titles named exactly what was typed come first.
 */
async function searchTmdb(type: "movie" | "tv", query: string): Promise<SearchResult[]> {
  const hint = readTmdbHint(query);
  const year: Record<string, string> = hint?.year ? { [type === "movie" ? "primary_release_year" : "first_air_date_year"]: String(hint.year) } : {};
  const [plain, narrowed, genres] = await Promise.all([
    request(searchPath(type, query), suggestedSchema),
    hint
      ? Promise.all((hint.language ? LANGUAGE_PAGES : [1]).map((page) => request(searchPath(type, hint.text, year, page), suggestedSchema)))
      : Promise.resolve([]),
    genreNames(type),
  ]);

  const describe = (entry: TmdbSuggested) => ({
    title: (type === "movie" ? entry.title : entry.name) ?? "",
    originalTitle: type === "movie" ? entry.original_title : entry.original_name,
    votes: entry.vote_count ?? 0,
  });
  const picked = narrowed.flatMap((page) => page.results).filter((entry) => !hint?.language || entry.original_language === hint.language);
  const seen = new Set<number>();
  return [...rankNamesakes(picked, hint?.text ?? query, describe), ...rankNamesakes(plain.results, query, describe)]
    .filter((entry) => !entry.adult && !entry.softcore && !seen.has(entry.id) && Boolean(seen.add(entry.id)))
    .map((entry) => (type === "movie" ? normaliseTmdbMovie(entry, genres) : normaliseTmdbShow(entry, genres)))
    .filter((result) => result !== null)
    .slice(0, RESULT_LIMIT);
}

export function searchTmdbMovies(query: string): Promise<SearchResult[]> {
  return searchTmdb("movie", query);
}

export function searchTmdbSeries(query: string): Promise<SearchResult[]> {
  return searchTmdb("tv", query);
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

/**
 * The running time each length asks TMDB for: a film's whole length, a show's
 * per episode. A show's total needs its episode count, which only its details
 * have, so lib/search looks those up and checks the fit exactly. Null where
 * TMDB has nothing that could fit: no film is "just an episode" or a weekend
 * series, and a whole show hardly ever runs under an hour.
 */
const RUNTIMES: Record<"movie" | "tv", Record<DiscoverLength, { gte?: number; lte?: number } | null>> = {
  movie: { hour: { gte: 1, lte: 60 }, evening: { gte: 61 }, weekend: null, episode: null },
  tv: { hour: null, evening: { gte: 1, lte: 70 }, weekend: { gte: 1, lte: 70 }, episode: { gte: 1, lte: 60 } },
};

/** TMDB's discover query for a mood: any of the genres, any of the keywords, best rated first. */
export function discoverPath(type: "movie" | "tv", filter: TmdbFilter, page: number, today: string, length?: DiscoverLength): string {
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
  const runtime = length ? RUNTIMES[type][length] : null;
  if (runtime?.gte) params.set("with_runtime.gte", String(runtime.gte));
  if (runtime?.lte) params.set("with_runtime.lte", String(runtime.lte));
  // TMDB's best-rated films under an hour are mostly making-ofs and documentaries.
  if (type === "movie" && length === "hour") params.set("without_genres", "99");
  return `/discover/${type}?${params}`;
}

/**
 * TMDB's best-rated films or shows for a mood (SPEC §20): two pages, forty
 * titles. With `anyMood`, the best rated of all; with a `length`, only what
 * runs about right, or nothing where TMDB has nothing that could fit.
 */
export async function discoverTmdb(type: "movie" | "tv", filter: TmdbFilter, options: DiscoverOptions = {}): Promise<Suggestion[]> {
  if (!filter.genres?.length && !filter.keywords?.length && !options.anyMood) return [];
  if (options.length && !RUNTIMES[type][options.length]) return [];
  const today = new Date().toISOString().slice(0, 10);
  const [first, second, genres] = await Promise.all([
    request(discoverPath(type, filter, 1, today, options.length), suggestedSchema),
    request(discoverPath(type, filter, 2, today, options.length), suggestedSchema),
    genreNames(type),
  ]);
  const seen = new Set<number>();
  const results = [...first.results, ...second.results].filter((entry) => !seen.has(entry.id) && seen.add(entry.id));
  return offerable(type, results, genres, today);
}

export type TmdbName = { id: number; name: string };

/** TMDB's film or TV genres by name, for matching a typed mood. */
export async function tmdbGenreList(type: "movie" | "tv"): Promise<TmdbName[]> {
  return [...(await genreNames(type)).entries()].map(([id, name]) => ({ id, name }));
}

const keywordsSchema = z.object({ results: z.array(z.object({ id: z.number(), name: z.string() })) });

/** TMDB's keywords with this word in them, for matching a typed mood. The caller keeps the exact ones. */
export async function searchTmdbKeywords(word: string): Promise<TmdbName[]> {
  const params = new URLSearchParams({ query: word, page: "1" });
  return (await request(`/search/keyword?${params}`, keywordsSchema)).results;
}

export async function getTmdbSeriesDetails(id: string): Promise<SeriesDetails> {
  if (!/^\d+$/.test(id)) throw new ProviderError("tmdb", "invalid series id");
  return normaliseShowDetails(await request(`/tv/${id}?language=en-US`, showDetailsSchema));
}
