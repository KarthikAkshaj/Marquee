import type { Database } from "@/lib/supabase/database.types";
import type { CategoryKind, ItemFormat } from "@/lib/status";

/** Category kinds that have a metadata provider. Custom shelves are manual only. */
export const SEARCH_KINDS = ["anime", "movie", "series", "game"] as const satisfies readonly CategoryKind[];
export type SearchKind = (typeof SEARCH_KINDS)[number];

/**
 * Kinds whose titles come in runs you can add the rest of: an anime's seasons
 * and films, a film's collection. A TV show's seasons are all one title.
 */
export const RELATED_KINDS = ["anime", "movie"] as const satisfies readonly SearchKind[];
export type RelatedKind = (typeof RELATED_KINDS)[number];

export function isRelatedKind(kind: string): kind is RelatedKind {
  return (RELATED_KINDS as readonly string[]).includes(kind);
}

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
  /** Minutes per episode, or the whole picture for a film. */
  runtimeMinutes?: number;
  /** A film, a TV run, an OVA. What tells a 90 minute feature from a 24 minute one-off. */
  format?: ItemFormat;
};

/** How long a title runs and what shape it is: what a backfill goes to fetch. */
export type TitleShape = Pick<SearchResult, "runtimeMinutes" | "format">;

/** Where a title is in its run: out, still airing, or not out yet. */
export type Release = "out" | "airing" | "upcoming";

/**
 * What an anime shelf's search looks for: the anime, or AniList's comics and
 * novels (U5). Every other kind has one thing to search.
 */
export const SEARCH_TYPES = ["anime", "manga"] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

/** One entry of a run: an anime's seasons, films and specials, or a film collection. In release order. */
export type SeriesTitle = SearchResult & { release: Release };

/**
 * Why a search came back empty-handed. The UI turns every one of these into
 * "Add manually" rather than an error screen.
 */
export type SearchError = "signed_out" | "invalid_query" | "rate_limited" | "not_configured" | "unavailable";

export type SearchResponse = { results: SearchResult[]; error?: SearchError };

/**
 * A title a provider's users recommend alongside one of yours (SPEC §20).
 * `follows` holds the provider ids of what it's a sequel to, when the provider
 * says (AniList), so a later season of something you haven't started can be
 * left out.
 */
export type Suggestion = { result: SearchResult; follows?: string[] };

/** What a provider recommends alongside one seed title, strongest first. */
export type SeedSuggestions = { seed: string; suggestions: Suggestion[] };

export type SuggestionsResponse = { results: SeedSuggestions[]; error?: SearchError };

/**
 * What a mood asks each provider for (SPEC §20). AniList ANDs genres with
 * tags, so a filter uses one or the other; TMDB and IGDB match any of the ids.
 */
export type AniListFilter = { genres?: string[]; tags?: string[] };
export type TmdbFilter = { genres?: number[]; keywords?: number[] };
export type IgdbFilter = { themes?: number[]; genres?: number[]; keywords?: number[] };

/** One provider's filter, by the kind of shelf it fills. */
export type DiscoverFilter =
  | { kind: "anime"; anilist: AniListFilter }
  | { kind: "movie" | "series"; tmdb: TmdbFilter }
  | { kind: "game"; igdb: IgdbFilter };

/** The best-rated titles a provider has for a filter, strongest first. */
export type DiscoverResponse = { results: Suggestion[]; error?: SearchError };

export type SeriesResponse = {
  results: SeriesTitle[];
  /** What the provider calls the run, when it names one ("Dune Collection"). */
  name?: string;
  error?: SearchError;
};

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
