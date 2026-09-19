import { CATEGORY_KINDS } from "@/lib/categories";
import { statusLabels, type ItemStatus } from "@/lib/status";

/** One title pulled out of a file, before it becomes a line in the paste box. */
export type Entry = { title: string; status: ItemStatus | null; year: number | null };

/** Hints the parser reads back (lib/import/parse.ts). */
const HINTS: Record<ItemStatus, string> = { planned: "planned", in_progress: "in progress", completed: "completed", dropped: "dropped" };

/** A section header the parser reads back ("Completed:"). */
const HEADERS: Record<ItemStatus, string> = { planned: "Planned:", in_progress: "In progress:", dropped: "Dropped:", completed: "Completed:" };

/** "Frieren (2023) (completed)": what a file's row looks like once it's in the paste box. */
export function entryLine({ title, status, year }: Entry): string {
  return [title, year ? `(${year})` : "", status ? `(${HINTS[status]})` : ""].filter(Boolean).join(" ");
}

export function sectionHeader(status: ItemStatus): string {
  return HEADERS[status];
}

/** Status words from other apps (MAL, Notion, Letterboxd, spreadsheets), plus every Marquee label. */
const WORDS = new Map<string, ItemStatus>();
const WORD_LIST: [ItemStatus, string[]][] = [
  ["completed", ["completed", "complete", "watched", "done", "finished", "seen", "played", "beaten", "read", "100%"]],
  [
    "in_progress",
    ["watching", "playing", "reading", "in progress", "ongoing", "current", "currently watching", "currently playing", "currently reading", "on hold", "onhold", "paused", "rewatching", "started"],
  ],
  ["dropped", ["dropped", "abandoned", "gave up", "quit", "stopped"]],
  [
    "planned",
    ["planned", "planning", "plan to watch", "plan to play", "plan to read", "watchlist", "backlog", "to watch", "to play", "to read", "want to watch", "want to play", "want to read", "wishlist", "up next", "queue", "queued", "not started", "ptw"],
  ],
];
for (const [status, list] of WORD_LIST) for (const word of list) WORDS.set(word, status);
for (const kind of CATEGORY_KINDS) {
  for (const [status, label] of Object.entries(statusLabels(kind)) as [ItemStatus, string][]) WORDS.set(words(label), status);
}

/** Lowercase letters, digits and % only: "✅ On-Hold" → "on hold". */
function words(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}%]+/gu, " ")
    .trim();
}

/** "Plan to Watch", "On-Hold", "✅ Watched" → a status; anything else → null. */
export function statusFromWord(text: string | undefined): ItemStatus | null {
  return text ? (WORDS.get(words(text)) ?? null) : null;
}

const TRUTHY = new Set(["yes", "y", "true", "x", "1", "checked", "✓", "✔", "☑", "✅"]);

const TITLE_HEADERS = ["title", "name", "series title", "anime title", "manga title", "english title", "title english", "movie", "film", "show", "tv show", "series", "anime", "game", "manga", "book", "original title"];
const STATUS_HEADERS = ["status", "my status", "watch status", "list status", "state"];
const YEAR_HEADERS = ["year", "release year", "year released", "released", "release date", "date released", "first air date", "air date", "aired", "premiered", "start year"];

type Columns = {
  title: number;
  status: number;
  year: number;
  /** "Watched" / "Seen" checkbox columns: a ticked cell means that status. */
  checks: { index: number; status: ItemStatus }[];
  /** How many cells looked like headers. */
  known: number;
};

/** Best-ranked header in the row, or -1. */
function column(headers: string[], names: string[]): number {
  let best = -1;
  let rank = Infinity;
  headers.forEach((header, index) => {
    const at = names.indexOf(header);
    if (at !== -1 && at < rank) {
      best = index;
      rank = at;
    }
  });
  return best;
}

/** The row's columns if it reads like a header row (it has a title-like column), else null. */
export function headerColumns(row: readonly string[]): Columns | null {
  const headers = row.map(words);
  const title = column(headers, TITLE_HEADERS);
  if (title === -1) return null;
  const status = column(headers, STATUS_HEADERS);
  const year = column(headers, YEAR_HEADERS);
  const checks = headers.flatMap((header, index) => {
    const checked = index === title || index === status || index === year ? null : WORDS.get(header);
    return checked ? [{ index, status: checked }] : [];
  });
  const known = [title, status, year].filter((index) => index !== -1).length + checks.length;
  return { title, status, year, checks, known };
}

const YEAR = /\b(18[7-9]\d|19\d\d|20\d\d)\b/;

/** "2019", "2019-05-01", "May 2019" → 2019. A spreadsheet date serial (43466) works too. */
export function yearIn(value: string | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{5}(\.\d+)?$/.test(trimmed)) {
    const year = new Date(Date.UTC(1899, 11, 30) + Number(trimmed) * 86_400_000).getUTCFullYear();
    return year >= 1870 && year <= 2099 ? year : null;
  }
  const match = trimmed.match(YEAR);
  return match ? Number(match[1]) : null;
}

/** Undo the apostrophe a spreadsheet export puts before "=", "+", "-" or "@". */
function cleanTitle(cell: string | undefined): string {
  return (cell ?? "")
    .replace(/^'(?=[=+\-@\t\r])/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function entryFrom(cells: readonly string[], columns: Columns | null): Entry | null {
  if (!columns) {
    // No header row: the first cell is the title; a later status word or year is used too.
    const at = cells.findIndex(Boolean);
    const title = cleanTitle(cells[at]);
    const rest = cells.slice(at + 1);
    const status = rest.map(statusFromWord).find(Boolean) ?? null;
    const yearCell = rest.find((cell) => /^(18[7-9]\d|19\d\d|20\d\d)$/.test(cell));
    return title ? { title, status, year: yearCell ? Number(yearCell) : null } : null;
  }
  const title = cleanTitle(cells[columns.title]);
  if (!title) return null;
  let status = columns.status === -1 ? null : statusFromWord(cells[columns.status]);
  for (const check of columns.checks) {
    if (!status && TRUTHY.has(words(cells[check.index] ?? "") || (cells[check.index] ?? "").trim())) status = check.status;
  }
  return { title, status, year: columns.year === -1 ? null : yearIn(cells[columns.year]) };
}

/**
 * A spreadsheet's rows as lines for the paste box. The header row picks the
 * Title/Name, Status and Year columns; without one, the first cell is the title
 * (unless `needsHeader`: a zip's other CSVs are account data, not lists).
 * A header repeated further down (a second table in the same file) takes over.
 */
export function tableToText(rows: readonly (readonly string[])[], { needsHeader = false } = {}): string {
  const lines: string[] = [];
  let columns: Columns | null = null;
  let first = true;
  for (const row of rows) {
    const cells = row.map((cell) => cell.trim());
    if (!cells.some(Boolean)) continue;
    const header = headerColumns(cells);
    if (header && (first || header.known >= 2)) {
      columns = header;
      first = false;
      continue;
    }
    if (first && needsHeader) return "";
    first = false;
    const entry = entryFrom(cells, columns);
    if (entry) lines.push(entryLine(entry));
  }
  return lines.join("\n");
}
