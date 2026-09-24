import type { Database } from "@/lib/supabase/database.types";

export type CategoryKind = Database["public"]["Enums"]["category_kind"];
export type ItemStatus = Database["public"]["Enums"]["item_status"];
/** What shape a title is, when a provider says so. Manual adds leave it empty. */
export type ItemFormat = Database["public"]["Enums"]["item_format"];

export const ITEM_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "dropped",
] as const satisfies readonly ItemStatus[];

export const ITEM_FORMATS = [
  "movie",
  "tv",
  "tv_short",
  "ova",
  "ona",
  "special",
] as const satisfies readonly ItemFormat[];

/**
 * The only place status wording lives (SPEC §2).
 * Components must never hard-code "Watching" and friends.
 */
const LABELS: Record<CategoryKind, Record<ItemStatus, string>> = {
  anime: {
    planned: "Plan to Watch",
    in_progress: "Watching",
    completed: "Completed",
    dropped: "Dropped",
  },
  series: {
    planned: "Plan to Watch",
    in_progress: "Watching",
    completed: "Completed",
    dropped: "Dropped",
  },
  movie: {
    planned: "Watchlist",
    in_progress: "Watching",
    completed: "Watched",
    dropped: "Dropped",
  },
  game: {
    planned: "Backlog",
    in_progress: "Playing",
    completed: "Finished",
    dropped: "Abandoned",
  },
  custom: {
    planned: "Planned",
    in_progress: "In Progress",
    completed: "Done",
    dropped: "Dropped",
  },
};

export function statusLabel(kind: CategoryKind, status: ItemStatus): string {
  return LABELS[kind][status];
}

export function statusLabels(kind: CategoryKind): Record<ItemStatus, string> {
  return LABELS[kind];
}

type StatusStyle = {
  /** Solid dot / segment fill. */
  fill: string;
  /** Status-coloured text. */
  text: string;
  /** 12% tint behind a pill (SPEC §9.5). */
  tint: string;
  /** Soft light around a dot on a poster. */
  glow: string;
};

/** Full class names per status, spelled out so Tailwind can see them. */
export const STATUS_STYLE: Record<ItemStatus, StatusStyle> = {
  planned: {
    fill: "bg-planned",
    text: "text-planned",
    tint: "bg-planned/12",
    glow: "shadow-[0_0_10px_var(--color-planned)]",
  },
  in_progress: {
    fill: "bg-progress",
    text: "text-progress",
    tint: "bg-progress/12",
    glow: "shadow-[0_0_10px_var(--color-progress)]",
  },
  completed: {
    fill: "bg-completed",
    text: "text-completed",
    tint: "bg-completed/12",
    glow: "shadow-[0_0_10px_var(--color-completed)]",
  },
  dropped: {
    fill: "bg-dropped",
    text: "text-dropped",
    tint: "bg-dropped/12",
    glow: "shadow-[0_0_10px_var(--color-dropped)]",
  },
};
