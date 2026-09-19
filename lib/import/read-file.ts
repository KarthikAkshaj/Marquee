import type { CategoryKind } from "@/lib/status";
import { parseDelimited } from "./formats/csv";
import { htmlToText } from "./formats/html";
import { jsonToLists } from "./formats/json";
import { malToText } from "./formats/mal";
import { markdownToText } from "./formats/markdown";
import { sectionHeader, statusFromWord, tableToText } from "./formats/table";
import { readXlsx } from "./formats/xlsx";
import { parseImport } from "./parse";

/** SPEC §8.9: text files up to 5 MB; zips, spreadsheets and gzipped exports up to 20 MB. */
export const IMPORT_MAX_BYTES = 5 * 1024 * 1024;
export const ARCHIVE_MAX_BYTES = 20 * 1024 * 1024;
const MAX_LISTS = 12;
const MAX_ZIP_ENTRIES = 200;

/** One list found in a file: a shelf in a backup, a sheet, a file inside a zip. */
export type ImportList = { name: string; text: string; count: number; kind: CategoryKind | null };

export type ReadFileResult = { ok: true; name: string; lists: ImportList[] } | { ok: false; message: string };

/** What the file drop's picker offers. */
export const IMPORT_ACCEPT = [
  ".docx", ".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".html", ".htm", ".xml", ".gz", ".zip", ".xlsx",
  "text/plain", "text/markdown", "text/csv", "text/tab-separated-values", "text/html", "application/json", "application/xml", "text/xml",
  "application/gzip", "application/x-gzip", "application/zip", "application/x-zip-compressed",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
].join(",");

/** Files that can't be read, and what to do instead. */
const REDIRECTS: [RegExp, string][] = [
  [/\.doc$/, "That's the old .doc format. Open it in Word and Save As .docx, then drop that in."],
  [/\.xls$/, "That's the old Excel format. Save it as .xlsx or .csv, then drop that in."],
  [/\.(ods|numbers)$/, "Export it as .xlsx or .csv, then drop that in."],
  [/\.(odt|rtf|pages)$/, "Save it as .docx or .txt, then drop that in."],
  [/\.pdf$/, "PDFs can't be read here. Copy the list out of it and paste it instead."],
  [/\.(png|jpe?g|gif|webp|heic|heif|avif|bmp|tiff?)$/, "That's a picture. Copy the list as text and paste it instead."],
];

const TEXT = /\.(txt|md|markdown|csv|tsv|tab|json|html?|xml|docx)$/;
const ARCHIVE = /\.(zip|xlsx|gz)$/;

/** A message the person sees, as opposed to a bug. */
class Unreadable extends Error {}

type Found = { name: string; text: string; kind?: CategoryKind };

/** UTF-8 first; UTF-16 when there's a byte-order mark (Excel's "Unicode Text"); else Windows-1252 (older Excel CSVs). */
export function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder("utf-16le").decode(bytes);
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder("utf-16be").decode(bytes);
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

async function gunzip(bytes: Uint8Array): Promise<Uint8Array> {
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(new Uint8Array(bytes));
      controller.close();
    },
  });
  return new Uint8Array(await new Response(source.pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
}

const arrayBuffer = (bytes: Uint8Array) => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;

/** "Export-1a2b/Movies 0123…cdef.csv" → "Movies.csv": Notion adds a 32-character id to every name. */
function displayName(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/ [0-9a-f]{32}(?=(_all)?\.[a-z]+$)/i, "");
}

async function loadZip(bytes: Uint8Array) {
  // Loaded on demand, like the Word reader: most imports never need it.
  const JSZip = (await import("jszip")).default;
  try {
    return await JSZip.loadAsync(bytes);
  } catch {
    throw new Unreadable("Couldn't open that file. It may be damaged; try exporting it again.");
  }
}

async function readZip(bytes: Uint8Array): Promise<Found[]> {
  const zip = await loadZip(bytes);
  const entries = Object.values(zip.files)
    .filter((entry) => !entry.dir && !/(^|\/)(__MACOSX|\.)/.test(entry.name) && TEXT.test(entry.name.toLowerCase()))
    .slice(0, MAX_ZIP_ENTRIES);
  if (!entries.length) throw new Unreadable("Nothing in that zip could be read. It needs a .csv, .md, .txt or .json inside.");
  const found: Found[] = [];
  for (const entry of entries) {
    try {
      const name = displayName(entry.name);
      found.push(...(await convert(name, await entry.async("uint8array"), true)));
    } catch {
      // One unreadable file doesn't spoil the rest of the zip.
    }
  }
  return found;
}

/** The lists in one file, by its extension. Inside a zip, a CSV needs a title column to count as a list. */
async function convert(name: string, bytes: Uint8Array, inZip = false): Promise<Found[]> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".gz")) return convert(name.slice(0, -3), await gunzip(bytes));
  if (lower.endsWith(".zip")) return readZip(bytes);
  if (lower.endsWith(".xlsx")) {
    const sheets = await readXlsx(await loadZip(bytes));
    return sheets.map((sheet) => ({ name: sheet.name, text: tableToText(sheet.rows) }));
  }
  if (lower.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const { value } = await mammoth.extractRawText({ arrayBuffer: arrayBuffer(bytes) });
    return [{ name, text: value }];
  }

  const text = decodeText(bytes);
  if (/\.(md|markdown)$/.test(lower)) return [{ name, text: markdownToText(text) }];
  if (lower.endsWith(".csv")) return [{ name, text: tableToText(parseDelimited(text), { needsHeader: inZip }) }];
  if (/\.(tsv|tab)$/.test(lower)) return [{ name, text: tableToText(parseDelimited(text, "\t"), { needsHeader: inZip }) }];
  if (/\.html?$/.test(lower)) return [{ name, text: htmlToText(text) }];
  if (lower.endsWith(".xml")) {
    const mal = malToText(text);
    if (mal === null) throw new Unreadable("That XML isn't a MyAnimeList export. A .csv or .txt of the list works too.");
    return [{ name, text: mal }];
  }
  if (lower.endsWith(".json")) {
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw new Unreadable("That JSON file is damaged. Try exporting it again.");
    }
    const lists = jsonToLists(value, name);
    if (!lists) throw new Unreadable("Couldn't find a list of titles in that JSON.");
    return lists;
  }
  return [{ name, text }];
}

/**
 * A file named for a status ("watched.csv", a "Watchlist" sheet) starts with
 * that section header, so rows without their own status get it. Letterboxd's
 * diary, ratings and reviews are all films you've seen.
 */
function withSection({ name, text, kind }: Found): ImportList {
  const base = name.replace(/\.[a-z]+$/i, "");
  const status = /^(diary|ratings|reviews)$/i.test(base) ? "completed" : statusFromWord(base);
  const full = status ? `${sectionHeader(status)}\n${text}` : text;
  return { name, text: full, count: parseImport(full).titles.length, kind: kind ?? null };
}

/**
 * A dropped or picked file's lists, read entirely in the browser so the file
 * never leaves the device (SPEC §8.9). Word, text, Markdown, CSV/TSV, JSON,
 * HTML, MyAnimeList XML (gzipped too), Excel and zips of any of those.
 */
export async function readImportFile(file: File): Promise<ReadFileResult> {
  const name = file.name;
  const lower = name.toLowerCase();

  for (const [pattern, message] of REDIRECTS) if (pattern.test(lower)) return { ok: false, message };
  const archive = ARCHIVE.test(lower);
  if (!archive && !TEXT.test(lower)) {
    return { ok: false, message: "That file type can't be read. Try .docx, .txt, .md, .csv, .xlsx, .json or a .zip of them." };
  }
  if (file.size > (archive ? ARCHIVE_MAX_BYTES : IMPORT_MAX_BYTES)) {
    return { ok: false, message: archive ? "That file is over 20 MB. Unzip it and drop the list inside." : "That file is over 5 MB. Try pasting the list instead." };
  }

  try {
    // Empty lists go, and so do copies (Notion exports a database twice: "Movies.csv" and "Movies_all.csv").
    const lists: ImportList[] = [];
    for (const list of (await convert(name, new Uint8Array(await file.arrayBuffer()))).map(withSection)) {
      if (list.count > 0 && !lists.some((kept) => kept.text === list.text)) lists.push(list);
    }
    if (lower.endsWith(".zip")) lists.sort((a, b) => b.count - a.count);
    if (!lists.length) return { ok: false, message: "Couldn't find any titles in that file." };
    return { ok: true, name, lists: lists.slice(0, MAX_LISTS) };
  } catch (error) {
    if (error instanceof Unreadable) return { ok: false, message: error.message };
    return { ok: false, message: "Couldn't read that file. If it opens elsewhere, try saving or exporting it again." };
  }
}

/** The list to start on: the one named like the shelf, else one of the same kind, else the longest. */
export function defaultList(lists: readonly ImportList[], shelf: { name: string; kind: CategoryKind }): number {
  const named = lists.findIndex((list) => list.name.trim().toLowerCase() === shelf.name.trim().toLowerCase());
  if (named !== -1) return named;
  const kind = lists.findIndex((list) => list.kind === shelf.kind);
  if (kind !== -1) return kind;
  return lists.reduce((best, list, index) => (list.count > lists[best].count ? index : best), 0);
}
