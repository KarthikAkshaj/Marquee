import { stampStatusDates, type Item } from "@/lib/items";
import type { SearchError, SearchKind, SearchResult, SearchSource } from "@/lib/search/types";
import type { CategoryKind, ItemStatus } from "@/lib/status";

/** Where each kind of shelf looks titles up (SPEC §7). */
export const SOURCE_FOR_KIND: Record<SearchKind, SearchSource> = {
  anime: "anilist",
  movie: "tmdb",
  series: "tmdb",
  game: "igdb",
};

export const SOURCE_NAMES: Record<SearchSource, string> = {
  anilist: "AniList",
  tmdb: "TMDB",
  igdb: "IGDB",
};

/** Required wherever TMDB data shows (SPEC §7). */
export const TMDB_NOTICE = "This product uses the TMDB API but is not endorsed or certified by TMDB.";

export function searchKindOf(kind: CategoryKind): SearchKind | null {
  return kind === "custom" ? null : kind;
}

/** "2023 · TV · 28 eps", as the palette rows show it. */
export function resultMeta(result: Pick<SearchResult, "year" | "subtitle">): string {
  return [result.year, result.subtitle].filter(Boolean).join(" · ");
}

const titleKey = (title: string) => title.trim().replace(/\s+/g, " ").toLocaleLowerCase();

type ShelfTitle = Pick<Item, "id" | "title" | "status" | "source" | "external_id">;

/**
 * The title already on this shelf, if any (SPEC §8.7): the same provider id,
 * or failing that the same title ignoring case, so a hand-added "frieren"
 * still counts.
 */
export function findDuplicate<T extends ShelfTitle>(
  result: Pick<SearchResult, "source" | "externalId" | "title">,
  items: readonly T[],
): T | null {
  const sameId = items.find((item) => item.source === result.source && item.external_id === result.externalId);
  if (sameId) return sameId;
  const key = titleKey(result.title);
  return items.find((item) => titleKey(item.title) === key) ?? null;
}

/**
 * A v4 UUID for a new title. randomUUID only exists on secure origins, and a
 * phone testing over the LAN (http://192.168…) isn't one.
 */
export function newItemId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export type AddFromSearchInput = {
  /** Made in the browser, so the new title can be shown, opened and undone before the save lands. */
  id: string;
  categoryId: string;
  status: ItemStatus;
  result: SearchResult;
};

/** The row the add will produce, for showing it before the database answers. */
export function itemFromResult({ id, categoryId, status, result }: AddFromSearchInput, now = new Date()): Item {
  const timestamp = now.toISOString();
  const item: Item = {
    id,
    user_id: "",
    category_id: categoryId,
    title: result.title,
    status,
    rating: null,
    progress_current: 0,
    progress_total: result.progressTotal ?? null,
    notes: null,
    cover_url: result.coverUrl ?? null,
    backdrop_url: result.backdropUrl ?? null,
    accent_color: result.accentColor ?? null,
    year: result.year ?? null,
    source: result.source,
    external_id: result.externalId,
    genres: result.genres ?? [],
    community_score: result.communityScore ?? null,
    runtime_minutes: result.runtimeMinutes ?? null,
    format: result.format ?? null,
    is_favorite: false,
    started_at: null,
    finished_at: null,
    created_at: timestamp,
    updated_at: timestamp,
  };
  return stampStatusDates(item, timestamp.slice(0, 10));
}

type SearchNoticeInput = {
  source: SearchSource;
  query: string;
  idle: boolean;
  loading: boolean;
  resultCount: number;
  error: SearchError | undefined;
};

/** Why there's nothing to pick, in one muted line. Every case still leaves "Add manually". */
export function searchNotice({ source, query, idle, loading, resultCount, error }: SearchNoticeInput): string | null {
  const name = SOURCE_NAMES[source];
  if (idle) return query.trim() ? null : `Type a title and we'll look it up on ${name}.`;
  switch (error) {
    case "not_configured":
      return `${name} search isn't set up yet, so add it by hand.`;
    case "unavailable":
      return `${name} isn't answering right now. Try again, or add it by hand.`;
    case "rate_limited":
      return "That's a lot of searching. Give it a few seconds.";
    case "signed_out":
      return "Your session ended. Sign in again to search.";
  }
  if (!loading && resultCount === 0) return `Nothing on ${name} by that name.`;
  return null;
}
