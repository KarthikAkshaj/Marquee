import type { Database } from "@/lib/supabase/database.types";

export type CategoryKind = Database["public"]["Enums"]["category_kind"];
export type ItemStatus = Database["public"]["Enums"]["item_status"];

export const ITEM_STATUSES = [
  "planned",
  "in_progress",
  "completed",
  "dropped",
] as const satisfies readonly ItemStatus[];

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

/** Tailwind token name for a status colour (SPEC §9.2). */
export const STATUS_COLOR: Record<ItemStatus, string> = {
  planned: "planned",
  in_progress: "progress",
  completed: "completed",
  dropped: "dropped",
};
