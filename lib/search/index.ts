import { unstable_cache } from "next/cache";
import { searchAniList } from "./anilist";
import { igdbConfigured, searchIgdb } from "./igdb";
import { getTmdbSeriesDetails, searchTmdbMovies, searchTmdbSeries, tmdbConfigured, type SeriesDetails } from "./tmdb";
import { ProviderError, type SearchKind, type SearchResponse, type SearchResult } from "./types";

export { SEARCH_KINDS } from "./types";
export type { SearchError, SearchKind, SearchResponse, SearchResult } from "./types";

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

export async function searchMetadata(kind: SearchKind, query: string): Promise<SearchResponse> {
  const provider = PROVIDERS[kind];
  if (!provider.configured()) return { results: [], error: "not_configured" };

  try {
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
