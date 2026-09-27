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

/** The next or previous status, wrapping round: what ←→ and a status stepper do. */
export function stepStatus(status: ItemStatus, direction: 1 | -1): ItemStatus {
  const index = ITEM_STATUSES.indexOf(status);
  return ITEM_STATUSES[(index + direction + ITEM_STATUSES.length) % ITEM_STATUSES.length];
}

export const ITEM_FORMATS = [
  "movie",
  "tv",
  "tv_short",
  "ova",
  "ona",
  "special",
  "manga",
  "manhwa",
  "manhua",
  "light_novel",
  "novel",
] as const satisfies readonly ItemFormat[];

/** Comics and novels: what an anime shelf can hold that you read rather than watch (U5). */
export const READING_FORMATS = ["manga", "manhwa", "manhua", "light_novel", "novel"] as const satisfies readonly ItemFormat[];
export type ReadingFormat = (typeof READING_FORMATS)[number];

export function isReading(format: ItemFormat | null | undefined): format is ReadingFormat {
  return (READING_FORMATS as readonly string[]).includes(format ?? "");
}

/** What a comic or novel is called on its tag and in search results. */
export const READING_LABELS: Record<ReadingFormat, string> = {
  manga: "Manga",
  manhwa: "Manhwa",
  manhua: "Manhua",
  light_novel: "Light novel",
  novel: "Novel",
};

/** The tag a title carries on its shelf: only comics and novels get one. */
export function readingLabel(format: ItemFormat | null | undefined): string | null {
  return isReading(format) ? READING_LABELS[format] : null;
}

/**
 * Whose words a title uses: its shelf's, or reading words for a comic or novel
 * on an anime shelf. Anything about the whole shelf (its tabs, its counts)
 * keeps the shelf's words.
 */
export type LabelKind = CategoryKind | "reading";

export function labelKind(kind: CategoryKind, format: ItemFormat | null | undefined): LabelKind {
  return isReading(format) ? "reading" : kind;
}

/**
 * The only place status wording lives (SPEC §2).
 * Components must never hard-code "Watching" and friends.
 */
const LABELS: Record<LabelKind, Record<ItemStatus, string>> = {
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
  reading: {
    planned: "Plan to Read",
    in_progress: "Reading",
    completed: "Completed",
    dropped: "Dropped",
  },
};

export function statusLabel(kind: LabelKind, status: ItemStatus): string {
  return LABELS[kind][status];
}

export function statusLabels(kind: LabelKind): Record<ItemStatus, string> {
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
