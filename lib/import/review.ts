import type { ItemStatus } from "@/lib/status";
import { titleKey, type ParsedTitle } from "./parse";

/** A title already saved somewhere, for the "Already in Anime — Completed" note. */
export type SavedTitle = { title: string; status: ItemStatus; category_id: string };

export type ShelfName = { id: string; name: string };

export type ReviewRow = {
  /** Source line, stable while titles are edited. */
  key: number;
  title: string;
  status: ItemStatus;
  year: number | null;
  include: boolean;
};

export type Duplicate = { shelf: string; shelfId: string; status: ItemStatus };

/** Everything saved, keyed by title, preferring the shelf being imported into. */
export function savedIndex(saved: readonly SavedTitle[], targetId: string): Map<string, SavedTitle> {
  const index = new Map<string, SavedTitle>();
  for (const title of saved) {
    const key = titleKey(title.title);
    const current = index.get(key);
    if (!current || (title.category_id === targetId && current.category_id !== targetId)) index.set(key, title);
  }
  return index;
}

export function findSaved(title: string, index: ReadonlyMap<string, SavedTitle>, shelves: readonly ShelfName[]): Duplicate | null {
  const saved = index.get(titleKey(title));
  if (!saved) return null;
  const shelf = shelves.find((candidate) => candidate.id === saved.category_id);
  return shelf ? { shelf: shelf.name, shelfId: shelf.id, status: saved.status } : null;
}

/**
 * The review table's starting rows (SPEC §8.9): each parsed title in the
 * status its hint gave it, or the default; titles you already have start
 * unticked when "Skip duplicates" is on.
 */
export function reviewRows(
  parsed: readonly ParsedTitle[],
  defaultStatus: ItemStatus,
  index: ReadonlyMap<string, SavedTitle>,
  skipDuplicates: boolean,
): ReviewRow[] {
  return parsed.map((title) => ({
    key: title.line,
    title: title.title,
    status: title.status ?? defaultStatus,
    year: title.year,
    include: !(skipDuplicates && index.has(titleKey(title.title))),
  }));
}

/** What the import bar says and sends. Blank titles never go. */
export function reviewSummary(rows: readonly ReviewRow[], index: ReadonlyMap<string, SavedTitle>) {
  const ready = rows.filter((row) => row.include && row.title.trim());
  const duplicates = rows.filter((row) => index.has(titleKey(row.title)));
  return {
    ready,
    duplicateCount: duplicates.length,
    skippedDuplicates: duplicates.filter((row) => !row.include).length,
    leftOut: rows.filter((row) => !row.include && !index.has(titleKey(row.title))).length,
  };
}

/** Split into the batches import_titles() takes, keeping each row's place in the document. */
export function importBatches(rows: readonly ReviewRow[], size = 100) {
  const titles = rows.map((row, position) => ({ title: row.title.trim(), status: row.status, year: row.year, position }));
  const batches: (typeof titles)[] = [];
  for (let start = 0; start < titles.length; start += size) batches.push(titles.slice(start, start + size));
  return batches;
}
