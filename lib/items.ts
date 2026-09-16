import type { Database } from "@/lib/supabase/database.types";
import { ITEM_STATUSES, type ItemStatus } from "@/lib/status";

export type Item = Database["public"]["Tables"]["items"]["Row"];

export const SORTS = ["updated", "title", "rating", "added", "year"] as const;
export type SortKey = (typeof SORTS)[number];

export const SORT_LABELS: Record<SortKey, string> = {
  updated: "Recently updated",
  title: "Title A–Z",
  rating: "Rating",
  added: "Date added",
  year: "Year",
};

/** Narrow-screen labels, so the phone toolbar fits on one row. */
export const SORT_SHORT_LABELS: Record<SortKey, string> = {
  updated: "Recent",
  title: "A–Z",
  rating: "Rating",
  added: "Added",
  year: "Year",
};

export const VIEWS = ["grid", "list"] as const;
export type View = (typeof VIEWS)[number];

export type StatusTab = ItemStatus | "all";

/** Category page state that lives in the URL (SPEC §8.5). */
export type CategoryParams = {
  status: StatusTab;
  view: View;
  sort: SortKey;
  fav: boolean;
};

export const DEFAULT_CATEGORY_PARAMS: CategoryParams = {
  status: "all",
  view: "grid",
  sort: "updated",
  fav: false,
};

type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function oneOf<T extends string>(options: readonly T[], value: string | undefined, fallback: T): T {
  return value !== undefined && (options as readonly string[]).includes(value) ? (value as T) : fallback;
}

/** Unknown or malformed values fall back to defaults instead of erroring. */
export function parseCategoryParams(raw: RawSearchParams): CategoryParams {
  return {
    status: oneOf<StatusTab>(["all", ...ITEM_STATUSES], first(raw.status), "all"),
    view: oneOf(VIEWS, first(raw.view), "grid"),
    sort: oneOf(SORTS, first(raw.sort), "updated"),
    fav: first(raw.fav) === "1",
  };
}

/** A category URL with defaults left out, so shared links stay short. */
export function categoryHref(
  slug: string,
  params: CategoryParams,
  patch: Partial<CategoryParams> = {},
) {
  const next = { ...params, ...patch };
  const search = new URLSearchParams();
  if (next.status !== "all") search.set("status", next.status);
  if (next.view !== "grid") search.set("view", next.view);
  if (next.sort !== "updated") search.set("sort", next.sort);
  if (next.fav) search.set("fav", "1");
  const query = search.toString();
  return `/c/${encodeURIComponent(slug)}${query ? `?${query}` : ""}`;
}

/** Same page, with an item's sheet open (`?item=`). */
export function itemHref(slug: string, params: CategoryParams, itemId: string) {
  const base = categoryHref(slug, params);
  return `${base}${base.includes("?") ? "&" : "?"}item=${encodeURIComponent(itemId)}`;
}

export function countByStatus(items: Pick<Item, "status">[]): Record<StatusTab, number> {
  const counts: Record<StatusTab, number> = {
    all: items.length,
    planned: 0,
    in_progress: 0,
    completed: 0,
    dropped: 0,
  };
  for (const item of items) counts[item.status] += 1;
  return counts;
}

const byTitle = (a: Item, b: Item) =>
  a.title.localeCompare(b.title, undefined, { sensitivity: "base", numeric: true }) ||
  a.id.localeCompare(b.id);

/** Newest first; missing values sink to the bottom. */
function descNullsLast(a: number | string | null, b: number | string | null) {
  if (a === b) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a < b ? 1 : -1;
}

export function sortItems(items: Item[], sort: SortKey): Item[] {
  const sorted = [...items];
  switch (sort) {
    case "title":
      return sorted.sort(byTitle);
    case "rating":
      return sorted.sort((a, b) => descNullsLast(a.rating, b.rating) || byTitle(a, b));
    case "year":
      return sorted.sort((a, b) => descNullsLast(a.year, b.year) || byTitle(a, b));
    case "added":
      return sorted.sort((a, b) => descNullsLast(a.created_at, b.created_at) || byTitle(a, b));
    case "updated":
      return sorted.sort((a, b) => descNullsLast(a.updated_at, b.updated_at) || byTitle(a, b));
  }
}

/** Status tab + favourites + sort, all driven by the URL. */
export function selectItems(items: Item[], params: CategoryParams): Item[] {
  const visible = items.filter(
    (item) =>
      (params.status === "all" || item.status === params.status) &&
      (!params.fav || item.is_favorite),
  );
  return sortItems(visible, params.sort);
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

/** The client-side title filter (SPEC §8.5): case- and accent-insensitive. */
export function filterByTitle<T extends Pick<Item, "title">>(items: T[], query: string): T[] {
  const needle = normalize(query);
  if (!needle) return items;
  return items.filter((item) => normalize(item.title).includes(needle));
}

/** 0–100, or null when there's nothing to measure against. */
export function progressPercent(item: Pick<Item, "progress_current" | "progress_total">) {
  if (!item.progress_total) return null;
  return Math.max(0, Math.min(100, Math.round((item.progress_current / item.progress_total) * 100)));
}

/** "07 / 24", or just "07" when the total is unknown. */
export function progressLabel(item: Pick<Item, "progress_current" | "progress_total">) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return item.progress_total
    ? `${pad(item.progress_current)} / ${pad(item.progress_total)}`
    : pad(item.progress_current);
}
