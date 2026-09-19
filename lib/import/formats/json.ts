import { z } from "zod";
import { CATEGORY_KINDS } from "@/lib/categories";
import { ITEM_STATUSES, type CategoryKind } from "@/lib/status";
import { entryLine, headerColumns, tableToText } from "./table";

export type JsonList = { name: string; text: string; kind?: CategoryKind };

/** Settings → Data's "Export everything" file, read loosely: only what an import needs. */
const marqueeBackup = z.object({
  app: z.literal("marquee"),
  categories: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(CATEGORY_KINDS).catch("custom"),
      items: z.array(
        z.object({
          title: z.string(),
          status: z.enum(ITEM_STATUSES).nullable().catch(null),
          year: z.number().int().nullable().catch(null),
        }),
      ),
    }),
  ),
});

const MAX_LISTS = 12;

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

const isRecord = (value: unknown): value is Record<string, Json> => typeof value === "object" && value !== null && !Array.isArray(value);

/** AniList-style { english, romaji, native } title objects collapse to one name. */
function titleObject(value: Record<string, Json>): string | null {
  for (const key of ["english", "userPreferred", "romaji", "native"]) {
    if (typeof value[key] === "string" && value[key]) return value[key];
  }
  return null;
}

/** An entry's fields two levels deep ({ movie: { title, year } } → title, year); the shallowest key wins. */
function flatten(entry: Record<string, Json>, into = new Map<string, string>(), depth = 0): Map<string, string> {
  const nested: Record<string, Json>[] = [];
  for (const [key, value] of Object.entries(entry)) {
    if (isRecord(value)) {
      const name = titleObject(value);
      if (name !== null && !into.has(key)) into.set(key, name);
      else nested.push(value);
    } else if (!Array.isArray(value) && !into.has(key)) {
      into.set(key, value === null ? "" : String(value));
    }
  }
  if (depth < 2) for (const value of nested) flatten(value, into, depth + 1);
  return into;
}

/** An array of titles, or of objects with a title-like field, as paste-box lines; null when it's neither. */
function arrayText(values: Json[]): string | null {
  if (values.length && values.every((value) => typeof value === "string")) {
    return values.map((title) => entryLine({ title: title.trim(), status: null, year: null })).join("\n");
  }
  const entries = values.filter(isRecord).map((entry) => flatten(entry));
  if (!entries.length) return null;
  const header = [...new Set(entries.flatMap((entry) => [...entry.keys()]))];
  if (!headerColumns(header)) return null;
  return tableToText([header, ...entries.map((entry) => header.map((key) => entry.get(key) ?? ""))]);
}

/** Every array of titles in the document, a few levels deep, named by its key. */
function findArrays(value: Json, name: string, found: JsonList[], depth = 0) {
  if (found.length >= MAX_LISTS || depth > 3) return;
  if (Array.isArray(value)) {
    const text = arrayText(value);
    if (text) found.push({ name, text });
    return;
  }
  if (isRecord(value)) for (const [key, child] of Object.entries(value)) findArrays(child, key, found, depth + 1);
}

/**
 * A JSON file's lists for the paste box. A Marquee backup gives one list per
 * shelf (titles, statuses and years); anything else is searched for arrays of
 * titles or of objects with a title or name. Null when there's no list at all.
 */
export function jsonToLists(value: unknown, fileName: string): JsonList[] | null {
  const backup = marqueeBackup.safeParse(value);
  if (backup.success) {
    return backup.data.categories.map((category) => ({
      name: category.name,
      kind: category.kind,
      text: category.items.map((item) => entryLine(item)).join("\n"),
    }));
  }
  const found: JsonList[] = [];
  findArrays(value as Json, fileName, found);
  return found.length ? found : null;
}
