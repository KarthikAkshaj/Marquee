import { progressUnit, totalCount, type Item, type ProgressUnit } from "@/lib/items";
import { labelKind, statusLabel, type CategoryKind, type LabelKind } from "@/lib/status";

/** "Evening", by the viewer's own clock (SPEC §8.4). */
export function greetingFor(hour: number): string {
  if (hour < 5) return "Late night";
  if (hour < 12) return "Morning";
  if (hour < 17) return "Afternoon";
  return "Evening";
}

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "TUE 16 SEP · 21:40", as the handoff sets it. Spelled out, since locales disagree ("Sept"). */
export function dateLine(date: Date): string {
  const time = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  return `${WEEKDAYS[date.getDay()]} ${date.getDate()} ${MONTHS[date.getMonth()]} · ${time}`;
}

const WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];

/** "Four things mid-flight. The couch is right there." */
export function midFlightLine(count: number): string {
  if (count === 0) return "Nothing mid-flight. The queue is waiting.";
  const number = WORDS[count] ?? String(count);
  if (count === 1) return "One thing mid-flight. The couch is right there.";
  if (count > 10) return `${number} things mid-flight. Ambitious.`;
  return `${number} things mid-flight. The couch is right there.`;
}

export type ShelfStats = { id: string; name: string; color: string; kind: CategoryKind; total: number; inProgress: number; planned: number };

export type StatTile = { key: string; label: string; value: number; detail: string; color: string | null };

/**
 * One tile per shelf ("124 · 3 watching · 18 planned", in the shelf's own
 * verb) and the year's finishes (SPEC §8.4). `color` is a category colour
 * token, or null for the "This year" tile, which uses the completed colour.
 */
export function statTiles(shelves: readonly ShelfStats[], finishedThisYear: number): StatTile[] {
  return [
    ...shelves.map((shelf) => ({
      key: shelf.id,
      label: shelf.name,
      value: shelf.total,
      detail: `${shelf.inProgress} ${statusLabel(shelf.kind, "in_progress").toLowerCase()} · ${shelf.planned} planned`,
      color: shelf.color,
    })),
    { key: "this-year", label: "This year", value: finishedThisYear, detail: "finished", color: null },
  ];
}

/** "2023 · 28 eps", "2021 · 222 ch" for a comic, or "1999 · Action": the second line on a Continue card. */
export function continueSubtitle(item: Pick<Item, "year" | "progress_total" | "genres" | "format">, kind: CategoryKind): string {
  const unit = progressUnit(labelKind(kind, item.format));
  const detail = item.progress_total && unit ? totalCount(item.progress_total, unit) : item.genres[0];
  return [item.year, detail].filter(Boolean).join(" · ");
}

const STEP_WORDS: Record<ProgressUnit, string> = { Episodes: "Episode", Chapters: "Chapter", Total: "" };

/**
 * What the spotlight's +1 marks (U10): "Episode 13", "Chapter 46", or "Last
 * episode" when it finishes the title. Null for what counts no progress
 * (films, games), which get no +1 at all.
 */
export function nextStep(item: Pick<Item, "progress_current" | "progress_total">, kind: LabelKind): string | null {
  const unit = progressUnit(kind);
  if (!unit) return null;
  const next = item.progress_current + 1;
  const word = STEP_WORDS[unit];
  if (!word) return String(next);
  return item.progress_total === next ? `Last ${word.toLowerCase()}` : `${word} ${next}`;
}

/** "13 to go", when there's a total to count down to. */
export function stepsLeft(item: Pick<Item, "progress_current" | "progress_total">): string | null {
  if (!item.progress_total) return null;
  const left = item.progress_total - item.progress_current;
  return left > 0 ? `${left} to go` : null;
}
