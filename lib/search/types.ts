import type { Database } from "@/lib/supabase/database.types";
import type { CategoryKind } from "@/lib/status";

/** Category kinds that have a metadata provider. Custom shelves are manual only. */
export const SEARCH_KINDS = ["anime", "movie", "series", "game"] as const satisfies readonly CategoryKind[];
export type SearchKind = (typeof SEARCH_KINDS)[number];

export type SearchSource = Exclude<Database["public"]["Enums"]["meta_source"], "manual">;

/** One provider hit, normalised (SPEC §7). Optional fields are omitted, never null. */
export type SearchResult = {
  source: SearchSource;
  externalId: string;
  title: string;
  /** Another name it goes by (romaji, original title), for matching imported lists. */
  altTitle?: string;
  /** Release year, not when the user watched it. */
  year?: number;
  coverUrl?: string;
  backdropUrl?: string;
  /** Episodes for finished anime/series. Omitted while a show is still airing. */
  progressTotal?: number;
  /** e.g. "TV · 24 eps" or "PC, PS5". The UI prefixes the year. */
  subtitle?: string;
  genres?: string[];
  /** 0–100. */
  communityScore?: number;
  /** Dominant cover colour when the provider supplies one (AniList). */
  accentColor?: string;
};

/** Where a title is in its run: out, still airing, or not out yet. */
export type Release = "out" | "airing" | "upcoming";

/** What AniList has when a title isn't an anime at all: the comic or novel it comes from. */
export type OtherForm = "manga" | "manhwa" | "manhua" | "light novel" | "novel";

/** Why a title wasn't found: AniList knows it, but not as an anime. */
export type Elsewhere = { form: OtherForm; title: string };

/** One entry of an anime's series (its seasons, films and specials), in release order. */
export type SeriesTitle = SearchResult & { release: Release };

/**
 * Why a search came back empty-handed. The UI turns every one of these into
 * "Add manually" rather than an error screen.
 */
export type SearchError = "signed_out" | "invalid_query" | "rate_limited" | "not_configured" | "unavailable";

export type SearchResponse = { results: SearchResult[]; error?: SearchError };

export type SeriesResponse = { results: SeriesTitle[]; error?: SearchError };

/** A provider answered badly (non-2xx, timeout, unreadable body). */
export class ProviderError extends Error {
  constructor(
    readonly provider: SearchSource,
    message: string,
    readonly status?: number,
  ) {
    super(`${provider}: ${message}`);
    this.name = "ProviderError";
  }
}

/** How many results a provider returns per query. */
export const RESULT_LIMIT = 8;
