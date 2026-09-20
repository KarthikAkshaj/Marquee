import type { Database } from "@/lib/supabase/database.types";
import { ITEM_STATUSES, type CategoryKind, type ItemStatus } from "@/lib/status";

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

/** What a shelf counts, if anything. Movies and games don't get a +1. */
export function progressUnit(kind: CategoryKind): "Episodes" | "Total" | null {
  if (kind === "anime" || kind === "series") return "Episodes";
  return kind === "custom" ? "Total" : null;
}

type ProgressFields = Pick<Item, "status" | "progress_current" | "progress_total">;

/** Leaving "completed" drops the finish date, so finishing again stamps a fresh one. */
function finishDate(from: ItemStatus, to: ItemStatus): { finished_at?: null } {
  return from === "completed" && to !== "completed" ? { finished_at: null } : {};
}

/**
 * A status picked outright. Marking a title done fills its progress bar (the
 * database trigger only does that the first time, so the patch says it).
 */
export function statusPatch(item: ProgressFields, status: ItemStatus) {
  return {
    status,
    ...(status === "completed" && item.progress_total !== null ? { progress_current: item.progress_total } : {}),
    ...finishDate(item.status, status),
  };
}

/**
 * Where a title stands after its count or total changes: counting starts a
 * queued title, reaching the total finishes it, and falling below the total
 * (say a new episode aired) un-finishes it. Dropped stays dropped.
 */
export function progressPatch(item: ProgressFields, current: number, total: number | null) {
  let status = item.status;
  if (status === "planned" && current > 0) status = "in_progress";
  if (status === "in_progress" && total !== null && current >= total) status = "completed";
  if (status === "completed" && total !== null && current < total) status = "in_progress";
  return { progress_current: current, progress_total: total, status, ...finishDate(item.status, status) };
}

/**
 * +1 means you watched one more: it starts a queued title, picks a dropped one
 * back up, and finishes it on the last episode. null when there's nothing left
 * to count.
 */
export function incrementPatch(item: ProgressFields) {
  if (item.status === "completed") return null;
  const total = item.progress_total;
  if (total !== null && item.progress_current >= total) return null;
  const status = item.status === "dropped" ? "in_progress" : item.status;
  return progressPatch({ ...item, status }, item.progress_current + 1, total);
}

/** −1, e.g. after a mis-tap. null at zero. */
export function decrementPatch(item: ProgressFields) {
  if (item.progress_current <= 0) return null;
  return progressPatch(item, item.progress_current - 1, item.progress_total);
}

/** On the card under a title you're watching: "13/24", or "Ep 13" while it's still airing. */
export function progressShort(item: Pick<Item, "progress_current" | "progress_total">, kind: CategoryKind) {
  const unit = progressUnit(kind);
  if (!unit) return null;
  if (item.progress_total !== null) return `${item.progress_current}/${item.progress_total}`;
  if (item.progress_current === 0) return null;
  return unit === "Episodes" ? `Ep ${item.progress_current}` : String(item.progress_current);
}

/** Fields the item sheet edits directly (SPEC §8.6). */
export type ItemDetails = Partial<Pick<Item, "title" | "year" | "rating" | "notes" | "started_at" | "finished_at">>;

export type ItemChange =
  | { type: "status"; status: ItemStatus }
  | { type: "increment" }
  | { type: "progress"; current: number; total: number | null }
  | { type: "favorite"; favorite: boolean }
  | { type: "details"; details: ItemDetails }
  /** Moved to another shelf, or deleted: either way it leaves this one. */
  | { type: "remove" }
  /** Added from search; the id was made in the browser. */
  | { type: "add"; item: Item };

/** The dates the database stamps on a status change (SPEC §5), so optimistic rows match saved ones. */
export function stampStatusDates(item: Item, today: string): Item {
  const next = { ...item };
  if (next.status === "in_progress" && !next.started_at) next.started_at = today;
  if (next.status === "completed" && !next.finished_at) {
    next.finished_at = today;
    if (next.progress_total !== null) next.progress_current = next.progress_total;
  }
  return next;
}

/** Whether a change finishes this title, which earns it the ADMIT ONE stamp (SPEC §9.6). */
export function completesTitle(item: Item, change: ItemChange): boolean {
  if (item.status === "completed" || change.type === "remove" || change.type === "add") return false;
  return applyItemChange([item], item.id, change)[0]?.status === "completed";
}

/** One change applied to a shelf ahead of the save. Unknown ids leave it untouched. */
export function applyItemChange(items: Item[], id: string, change: ItemChange, now = new Date()): Item[] {
  if (change.type === "remove") return items.filter((item) => item.id !== id);
  if (change.type === "add") return [change.item, ...items.filter((item) => item.id !== change.item.id)];

  const updated_at = now.toISOString();
  const today = updated_at.slice(0, 10);
  return items.map((item) => {
    if (item.id !== id) return item;
    switch (change.type) {
      case "favorite":
        return { ...item, is_favorite: change.favorite, updated_at };
      case "details":
        return { ...item, ...change.details, updated_at };
      case "status":
        return stampStatusDates({ ...item, ...statusPatch(item, change.status), updated_at }, today);
      case "progress":
        return stampStatusDates({ ...item, ...progressPatch(item, change.current, change.total), updated_at }, today);
      case "increment": {
        const patch = incrementPatch(item);
        return patch ? stampStatusDates({ ...item, ...patch, updated_at }, today) : item;
      }
    }
  });
}

/** Shown where a title has no year, rating or progress yet. */
export const EMPTY = "·";
