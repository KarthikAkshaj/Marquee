import { unstable_cache } from "next/cache";
import {
  discoverAniList,
  getAniListSeries,
  getAniListSuggestions,
  searchAniList,
  searchAniListMany,
  searchAniListReading,
  searchAniListReadingMany,
} from "./anilist";
import { discoverIgdb, getIgdbSuggestions, igdbConfigured, searchIgdb } from "./igdb";
import {
  discoverTmdb,
  getTmdbCollection,
  getTmdbMovieDetails,
  getTmdbSeriesDetails,
  getTmdbSuggestions,
  searchTmdbMovies,
  searchTmdbSeries,
  tmdbConfigured,
  type MovieDetails,
  type SeriesDetails,
} from "./tmdb";
import {
  ProviderError,
  type DiscoverFilter,
  type DiscoverResponse,
  type RelatedKind,
  type SearchKind,
  type SearchResponse,
  type SearchResult,
  type SearchType,
  type SeedSuggestions,
  type SeriesResponse,
  type SuggestionsResponse,
} from "./types";

export { RELATED_KINDS, SEARCH_KINDS, SEARCH_TYPES, isRelatedKind } from "./types";
export type {
  DiscoverFilter,
  DiscoverResponse,
  RelatedKind,
  Release,
  SearchError,
  SearchKind,
  SearchResponse,
  SearchResult,
  SearchType,
  SeedSuggestions,
  SeriesResponse,
  SeriesTitle,
  Suggestion,
  SuggestionsResponse,
} from "./types";

const DAY = 60 * 60 * 24;

const PROVIDERS: Record<SearchKind, { configured: () => boolean; search: (query: string) => Promise<SearchResult[]> }> = {
  anime: { configured: () => true, search: searchAniList },
  movie: { configured: tmdbConfigured, search: searchTmdbMovies },
  series: { configured: tmdbConfigured, search: searchTmdbSeries },
  game: { configured: igdbConfigured, search: searchIgdb },
};

/** "  Frieren " and "frieren" are the same search, and share a cache entry. */
export function normaliseQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Results are cached for a day across users and requests (SPEC §7). A provider
 * failure throws out of the cached function, so errors are never cached.
 */
const cachedSearch = unstable_cache(
  (kind: SearchKind, query: string) => PROVIDERS[kind].search(query),
  ["metadata-search-v1"],
  { revalidate: DAY },
);

const cachedReading = unstable_cache((query: string) => searchAniListReading(query), ["anilist-reading-search-v1"], {
  revalidate: DAY,
});

/**
 * One search (SPEC §7). On an anime shelf, `type: "manga"` looks through
 * AniList's comics and novels instead (U5); every other kind ignores it.
 */
export async function searchMetadata(kind: SearchKind, query: string, type: SearchType = "anime"): Promise<SearchResponse> {
  const provider = PROVIDERS[kind];
  if (!provider.configured()) return { results: [], error: "not_configured" };

  try {
    if (kind === "anime" && type === "manga") return { results: await cachedReading(normaliseQuery(query)) };
    return { results: await cachedSearch(kind, normaliseQuery(query)) };
  } catch (error) {
    // Keys and user input never appear in these messages.
    console.error("[search]", kind, error instanceof ProviderError ? error.message : error);
    return { results: [], error: "unavailable" };
  }
}

const cachedSeriesDetails = unstable_cache((id: string) => getTmdbSeriesDetails(id), ["tmdb-series-details-v1"], {
  revalidate: DAY,
});

/**
 * Episode total and full genres for a TMDB show, looked up when it's added
 * rather than on every keystroke (SPEC §7). Null when TMDB can't answer; the
 * title is still added, just without a total.
 */
export async function getSeriesDetails(id: string): Promise<SeriesDetails | null> {
  if (!tmdbConfigured()) return null;
  try {
    return await cachedSeriesDetails(id);
  } catch (error) {
    console.error("[search] series details", error instanceof ProviderError ? error.message : error);
    return null;
  }
}

// v2 carries the collection a film belongs to.
const cachedMovieDetails = unstable_cache((id: string) => getTmdbMovieDetails(id), ["tmdb-movie-details-v2"], {
  revalidate: DAY,
});

/**
 * A film's running time, which search results don't carry. Null when TMDB
 * can't answer; the title is still added, just without a runtime.
 */
export async function getMovieDetails(id: string): Promise<MovieDetails | null> {
  if (!tmdbConfigured()) return null;
  try {
    return await cachedMovieDetails(id);
  } catch (error) {
    console.error("[search] movie details", error instanceof ProviderError ? error.message : error);
    return null;
  }
}

/**
 * What a search result doesn't carry and is worth one lookup when a title is
 * added: a show's episode count and full genres, a film's running time. Anime
 * needs none, AniList answers it all in the search itself, and games have no
 * clock to look up.
 */
export type AddDetails = Pick<SearchResult, "progressTotal" | "genres" | "runtimeMinutes">;

export function getAddDetails(kind: SearchKind, id: string): Promise<AddDetails | null> {
  if (kind === "series") return getSeriesDetails(id);
  if (kind === "movie") return getMovieDetails(id);
  return Promise.resolve(null);
}

/**
 * The commonest miss when matching a typed list is a possessive without its
 * apostrophe ("Hells Paradise"), which AniList finds nothing for. One retry.
 */
export function possessiveVariant(query: string): string | null {
  const fixed = query.replace(/\b([A-Za-z]*[A-Za-rt-z])s(?=\s)/, "$1's");
  return fixed === query ? null : fixed;
}

async function mapLimit<T, R>(items: readonly T[], limit: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await run(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export type MatchResponse = {
  results: SearchResult[][];
  error?: SearchResponse["error"];
};

const cachedSeries = unstable_cache((id: string) => getAniListSeries(Number(id)), ["anilist-series-v1"], { revalidate: DAY });

/**
 * An anime's seasons, films and specials in release order, for adding the rest
 * of a series. Cached for a day; failures aren't.
 */
export async function getAnimeSeries(id: string): Promise<SeriesResponse> {
  try {
    return { results: await cachedSeries(id) };
  } catch (error) {
    console.error("[search] series", error instanceof ProviderError ? error.message : error);
    return { results: [], error: "unavailable" };
  }
}

const cachedCollection = unstable_cache((id: number) => getTmdbCollection(id), ["tmdb-collection-v1"], { revalidate: DAY });

/**
 * Every film in the collection a film belongs to, oldest first, for adding the
 * rest of it. Two lookups: the film, which is usually cached from the add that
 * came just before, then its collection. A film in no collection has nothing.
 */
export async function getMovieCollection(id: string): Promise<SeriesResponse> {
  if (!tmdbConfigured()) return { results: [], error: "not_configured" };
  try {
    const { collectionId } = await cachedMovieDetails(id);
    if (!collectionId) return { results: [] };
    const collection = await cachedCollection(collectionId);
    return { results: collection.titles, name: collection.name };
  } catch (error) {
    console.error("[search] collection", error instanceof ProviderError ? error.message : error);
    return { results: [], error: "unavailable" };
  }
}

/** The rest of a title's run: an anime's series, or a film's collection. */
export function getRelated(kind: RelatedKind, id: string): Promise<SeriesResponse> {
  return kind === "movie" ? getMovieCollection(id) : getAnimeSeries(id);
}

/**
 * Titles with no anime are often a comic AniList has instead (The Greatest
 * Estate Developer is only a manhwa), so those misses get the comics and
 * novels by that name as their candidates (U5). An anime is never passed over
 * for one: only empty rows are filled. One more request, and never at the cost
 * of the matches themselves, so a failure just leaves those rows empty.
 */
async function fillWithReading(queries: readonly string[], results: SearchResult[][]): Promise<void> {
  const missed = queries.flatMap((query, index) => (results[index].length === 0 ? [{ index, query }] : []));
  if (missed.length === 0) return;
  try {
    const found = await searchAniListReadingMany(missed.map((miss) => miss.query));
    missed.forEach((miss, position) => {
      results[miss.index] = found[position] ?? [];
    });
  } catch (error) {
    console.error("[search] reading", error instanceof ProviderError ? error.message : error);
  }
}

/**
 * Candidates for up to 10 typed titles at once, for "Find covers" after an
 * import. Anime goes to AniList in one batched request (plus one retry batch);
 * everything else reuses the cached single search, three at a time.
 */
export async function matchMetadata(kind: SearchKind, queries: readonly string[]): Promise<MatchResponse> {
  const empty = queries.map(() => [] as SearchResult[]);
  if (!PROVIDERS[kind].configured()) return { results: empty, error: "not_configured" };

  try {
    if (kind !== "anime") {
      const results = await mapLimit(queries, 3, (query) => cachedSearch(kind, normaliseQuery(query)).catch(() => [] as SearchResult[]));
      return { results };
    }
    const results = await searchAniListMany(queries);
    const retries = queries.flatMap((query, index) => {
      const variant = results[index].length === 0 ? possessiveVariant(query) : null;
      return variant ? [{ index, variant }] : [];
    });
    if (retries.length) {
      const again = await searchAniListMany(retries.map((retry) => retry.variant));
      retries.forEach((retry, position) => {
        results[retry.index] = again[position];
      });
    }
    await fillWithReading(queries, results);
    return { results };
  } catch (error) {
    console.error("[search] match", kind, error instanceof ProviderError ? error.message : error);
    return { results: empty, error: "unavailable" };
  }
}

// These cache what the normalisers made of an answer, so a change to what
// counts as a later season needs a new key, or the old verdicts stay a day.
const cachedAniListSuggestions = unstable_cache((ids: string[]) => getAniListSuggestions(ids), ["anilist-suggestions-v3"], {
  revalidate: DAY,
});

const cachedTmdbSuggestions = unstable_cache(
  (type: "movie" | "tv", id: string) => getTmdbSuggestions(type, id),
  ["tmdb-suggestions-v1"],
  { revalidate: DAY },
);

const cachedIgdbSuggestions = unstable_cache((ids: string[]) => getIgdbSuggestions(ids), ["igdb-suggestions-v1"], {
  revalidate: DAY,
});

/**
 * What each provider's users recommend alongside your best titles of one kind
 * (SPEC §20), cached for a day. AniList and IGDB answer for every seed in one
 * request; TMDB takes one per film or show, five at a time, and a seed it
 * can't answer for is skipped rather than sinking the rest.
 */
export async function getSuggestions(kind: SearchKind, seeds: readonly string[]): Promise<SuggestionsResponse> {
  if (seeds.length === 0) return { results: [] };
  if (!PROVIDERS[kind].configured()) return { results: [], error: "not_configured" };
  // Sorted, so the same seeds in another order share a cache entry.
  const ids = [...new Set(seeds)].sort();

  try {
    if (kind === "anime") return { results: await cachedAniListSuggestions(ids) };
    if (kind === "game") return { results: await cachedIgdbSuggestions(ids) };
    const type = kind === "movie" ? "movie" : "tv";
    const answers = await mapLimit(ids, 5, (id) => cachedTmdbSuggestions(type, id).catch(() => null));
    const results = answers.filter((answer): answer is SeedSuggestions => answer !== null);
    return results.length === 0 ? { results, error: "unavailable" } : { results };
  } catch (error) {
    console.error("[search] suggestions", kind, error instanceof ProviderError ? error.message : error);
    return { results: [], error: "unavailable" };
  }
}

/** Kept apart from the provider calls so the cache key is just the filter. */
function discover(filter: DiscoverFilter) {
  switch (filter.kind) {
    case "anime":
      return discoverAniList(filter.anilist);
    case "movie":
      return discoverTmdb("movie", filter.tmdb);
    case "series":
      return discoverTmdb("tv", filter.tmdb);
    case "game":
      return discoverIgdb(filter.igdb);
  }
}

const cachedDiscover = unstable_cache(discover, ["discover-v3"], { revalidate: DAY });

/**
 * A provider's best-rated titles for a mood (SPEC §20), cached for a day. The
 * moods are a short fixed list, so most of these are shared by everyone.
 */
export async function discoverTitles(filter: DiscoverFilter): Promise<DiscoverResponse> {
  if (!PROVIDERS[filter.kind].configured()) return { results: [], error: "not_configured" };
  try {
    return { results: await cachedDiscover(filter) };
  } catch (error) {
    console.error("[search] discover", filter.kind, error instanceof ProviderError ? error.message : error);
    return { results: [], error: "unavailable" };
  }
}
