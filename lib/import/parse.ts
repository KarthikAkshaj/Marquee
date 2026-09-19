import type { ItemStatus } from "@/lib/status";

/** One title from a pasted list or document (SPEC §8.9). */
export type ParsedTitle = {
  title: string;
  /** From an inline hint or a section header; null means "use the default". */
  status: ItemStatus | null;
  /** From a trailing "(2019)"; null when there isn't one. */
  year: number | null;
  /** 1-based line in the source, for "line 12" messages and doc order. */
  line: number;
};

export type ParseResult = {
  titles: ParsedTitle[];
  /** Lines that repeated an earlier title in the same list. */
  repeats: number;
};

const TITLE_MAX = 200;

/** Section headers ("Watched:") and the status they set for the lines below. */
const HEADERS: [RegExp, ItemStatus][] = [
  [/^(watched|completed|finished|done|seen|played|read|beaten)$/, "completed"],
  [/^(currently )?(watching|playing|reading|in progress|ongoing|on the go)$/, "in_progress"],
  [/^(dropped|abandoned|gave up|quit)$/, "dropped"],
  [/^(to watch|plan to watch|planned|want to watch|watchlist|backlog|to play|to read|queue|up next|later)$/, "planned"],
];

/** Inline hints; the matched text is removed from the title. */
const HINTS: [RegExp, ItemStatus][] = [
  [/[([](watched|done|completed|finished|seen|played|beaten)[)\]]/i, "completed"],
  [/[([](watching|playing|reading|in progress|ongoing)[)\]]/i, "in_progress"],
  [/[([](dropped|abandoned)[)\]]/i, "dropped"],
  [/[([](plan to watch|to watch|ptw|planned|backlog)[)\]]/i, "planned"],
  [/[✓✔✅☑]/, "completed"],
];

/** Bullets, numbering and checkboxes at the start of a line. */
// Numbering is 1–3 digits and "." ")" or "]", so "2001: A Space Odyssey" and "1917" survive.
const LEADING = /^(?:[-–—•*·>▪◦‣⁃]+\s*|\(?\d{1,3}[.)\]]\s+|#\d{1,4}\s+)+/;
const CHECKBOX = /^\[( |x|X|✓|✔)\]\s*|^[☐☑✅]\s*/;
const YEAR = /\s*[([]((?:18[7-9]|19\d|20\d)\d)[)\]]\s*$/;

function tidy(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s\-–—:|,;]+|[\s\-–—:|,;]+$/g, "")
    .trim();
}

function headerStatus(line: string): ItemStatus | null | undefined {
  if (!line.endsWith(":")) return undefined;
  const words = line.slice(0, -1).trim().toLowerCase();
  if (!words || words.length > 40) return undefined;
  for (const [pattern, status] of HEADERS) if (pattern.test(words)) return status;
  // Some other heading ("Anime:"): not a title, and it clears any status above it.
  return null;
}

/**
 * Turns pasted text or a document's raw text into titles (SPEC §8.9): one per
 * non-empty line; bullets, numbers and checkboxes stripped; ✓ / [x] / (watched)
 * style hints and "Watched:" section headers set the status; a trailing (2019)
 * becomes the year; repeats within the list are dropped (case-insensitive).
 */
export function parseImport(text: string): ParseResult {
  const titles: ParsedTitle[] = [];
  const seen = new Set<string>();
  let repeats = 0;
  let section: ItemStatus | null = null;

  text.split(/\r\n|\r|\n/).forEach((raw, index) => {
    let line = raw.replace(/\t/g, " ").trim();
    if (!line) return;

    const header = headerStatus(line.replace(LEADING, "").trim());
    if (header !== undefined) {
      section = header;
      return;
    }

    let status: ItemStatus | null = null;
    const checkbox = line.replace(LEADING, "").match(CHECKBOX);
    line = line.replace(LEADING, "").replace(CHECKBOX, "").replace(LEADING, "");
    if (checkbox && /[xX✓✔☑✅]/.test(checkbox[0])) status = "completed";

    for (const [pattern, hinted] of HINTS) {
      if (pattern.test(line)) {
        status ??= hinted;
        line = line.replace(pattern, " ");
      }
    }

    let year: number | null = null;
    const yearMatch = line.match(YEAR);
    if (yearMatch) {
      year = Number(yearMatch[1]);
      line = line.replace(YEAR, "");
    }

    const title = tidy(line).slice(0, TITLE_MAX).trim();
    if (!title) return;

    const key = title.toLocaleLowerCase();
    if (seen.has(key)) {
      repeats += 1;
      return;
    }
    seen.add(key);
    titles.push({ title, status: status ?? section, year, line: index + 1 });
  });

  return { titles, repeats };
}

/** Case- and space-insensitive key for matching against titles already saved. */
export function titleKey(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
