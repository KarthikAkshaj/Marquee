/**
 * Reading a Marquee backup back in (SPEC §8.10, U7). Pure: it takes a parsed
 * JSON document and returns rows ready to write, so every awkward decision is
 * testable without a database.
 *
 * The text importer already accepts a backup file, but it can only see titles,
 * statuses and years. Everything else the export carries, ratings, notes,
 * progress, dates, favourites, artwork, genres, runtimes and provider links,
 * is dropped on that path. This module is the one that keeps it.
 *
 * Two rules the whole design rests on:
 *
 * **Nothing is ever deleted.** A restore adds what is missing and updates what
 * the file describes. Rows the file says nothing about are left exactly as
 * they are, so running it against a live library can't lose work.
 *
 * **Identity is natural, not the original id.** Matching on the exported UUIDs
 * would be exact but breaks the moment a backup is restored into a second
 * account while the first still exists: the primary key is global, so the
 * insert would collide. Shelves match on their slug, which is already unique
 * per user, and titles match on their provider link where there is one and on
 * the title otherwise. That makes a restore safe to run twice.
 */
import { z } from "zod";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_KINDS, slugify, uniqueSlug } from "@/lib/categories";
import { ITEM_FORMATS, ITEM_STATUSES } from "@/lib/status";
import { PROVIDER_IMAGE, hexColorSchema } from "@/lib/validators";

/** A backup wider than this is not a library, it's a mistake or an attack. */
export const MAX_SHELVES = 60;
export const MAX_TITLES = 20_000;
/** Titles per write, matching the ceiling `import_titles` already uses. */
export const RESTORE_BATCH = 100;

/**
 * Soft fields never fail the file. A backup with one bad rating should restore
 * the other nine hundred titles and quietly drop the rating, not refuse.
 */
const asNull = <T>(value: T | null | undefined): T | null => value ?? null;

const softText = (max: number) => z.string().max(max).nullish().catch(null).transform(asNull);
const softInt = (min: number, max: number) =>
  z.number().int().min(min).max(max).nullish().catch(null).transform(asNull);

const itemSchema = z.object({
  // The one hard field: a row without a usable title is not a title.
  title: z.string().trim().min(1).max(200),
  status: z.enum(ITEM_STATUSES).catch("planned"),
  rating: softInt(1, 10),
  progress_current: z.number().int().min(0).max(100_000).nullish().catch(0).transform((value) => value ?? 0),
  progress_total: softInt(1, 100_000),
  notes: softText(2000),
  is_favorite: z.boolean().nullish().catch(false).transform((value) => value ?? false),
  year: softInt(1870, 2100),
  started_at: z.iso.date().nullish().catch(null).transform(asNull),
  finished_at: z.iso.date().nullish().catch(null).transform(asNull),
  // Artwork is restricted to the three provider CDNs the app already allows,
  // so a hand-edited backup can't point the app at an arbitrary host.
  cover_url: z.string().max(500).regex(PROVIDER_IMAGE).nullish().catch(null).transform(asNull),
  backdrop_url: z.string().max(500).regex(PROVIDER_IMAGE).nullish().catch(null).transform(asNull),
  accent_color: hexColorSchema.nullish().catch(null).transform(asNull),
  genres: z.array(z.string().trim().min(1).max(40)).max(12).nullish().catch(null).transform(asNull),
  community_score: softInt(0, 100),
  runtime_minutes: softInt(1, 2000),
  format: z.enum(ITEM_FORMATS).nullish().catch(null).transform(asNull),
  source: z.enum(["tmdb", "anilist", "igdb", "manual"]).catch("manual"),
  external_id: z.string().max(64).regex(/^[\w-]+$/).nullish().catch(null).transform(asNull),
  created_at: z.iso.datetime({ offset: true }).nullish().catch(null).transform(asNull),
  updated_at: z.iso.datetime({ offset: true }).nullish().catch(null).transform(asNull),
});

const categorySchema = z.object({
  name: z.string().trim().min(1).max(40),
  slug: z.string().trim().max(40).nullish().catch(null).transform(asNull),
  kind: z.enum(CATEGORY_KINDS).catch("custom"),
  color: z.enum(CATEGORY_COLORS).catch("amber"),
  icon: z.enum(CATEGORY_ICONS).catch("clapperboard"),
  position: z.number().int().min(0).max(999).nullish().catch(null).transform(asNull),
  // Each row is checked on its own below, so one bad title can't void a shelf.
  items: z.array(z.unknown()).nullish().catch(null).transform(asNull),
});

const backupSchema = z.object({
  app: z.literal("marquee"),
  version: z.number().int().min(1).max(1),
  exportedAt: z.iso.datetime({ offset: true }).nullish().catch(null).transform(asNull),
  categories: z.array(z.unknown()),
});

export type RestoreItem = z.output<typeof itemSchema>;

/**
 * What the browser is allowed to send back. The file is read and reviewed in
 * the browser so nothing is uploaded until the person says so, which means the
 * server has to check the same document again on the way in.
 */
const shelfPayloadSchema = z.object({
  name: z.string().trim().min(1).max(40),
  slug: z.string().trim().min(1).max(40).regex(/^[a-z0-9-]+$/),
  kind: z.enum(CATEGORY_KINDS),
  color: z.enum(CATEGORY_COLORS),
  icon: z.enum(CATEGORY_ICONS),
  position: z.number().int().min(0).max(999),
});

export const restoreShelvesSchema = z.array(shelfPayloadSchema).min(1).max(MAX_SHELVES);
export const restoreTitlesSchema = z.array(itemSchema).min(1).max(RESTORE_BATCH);
export type RestoreShelfPayload = z.output<typeof shelfPayloadSchema>;

export type RestoreShelf = {
  name: string;
  slug: string;
  kind: (typeof CATEGORY_KINDS)[number];
  color: (typeof CATEGORY_COLORS)[number];
  icon: (typeof CATEGORY_ICONS)[number];
  position: number;
  items: RestoreItem[];
};

export type RestorePlan = {
  exportedAt: string | null;
  shelves: RestoreShelf[];
  /** Titles across every shelf, after the unusable ones were dropped. */
  titles: number;
  /** Rows that couldn't be read at all, so the screen can be honest about it. */
  dropped: number;
  /** What this file actually carries, for the review screen to promise. */
  carries: string[];
};

export type RestoreRead =
  | { ok: true; plan: RestorePlan }
  | { ok: false; reason: string };

const NOT_A_BACKUP =
  "That isn't a Marquee backup. Export everything from Settings, Data and use the file it gives you.";

/** The extras this file actually has, so the review screen promises only those. */
function carriedFields(items: RestoreItem[]): string[] {
  const has = (pick: (item: RestoreItem) => unknown) => items.some((item) => {
    const value = pick(item);
    return Array.isArray(value) ? value.length > 0 : value !== null && value !== false && value !== 0;
  });

  return [
    has((item) => item.rating) && "ratings",
    has((item) => item.notes) && "notes",
    has((item) => item.progress_current || item.progress_total) && "progress",
    has((item) => item.started_at || item.finished_at) && "start and finish dates",
    has((item) => item.is_favorite) && "favourites",
    has((item) => item.cover_url) && "cover art",
    has((item) => item.genres) && "genres",
    has((item) => item.runtime_minutes) && "runtimes",
  ].filter((entry): entry is string => typeof entry === "string");
}

/**
 * Reads a backup document into shelves and rows ready to write. Never throws:
 * a file that isn't a backup comes back as a reason to show the person.
 */
export function readBackup(value: unknown): RestoreRead {
  const outer = backupSchema.safeParse(value);
  if (!outer.success) return { ok: false, reason: NOT_A_BACKUP };
  if (outer.data.categories.length === 0) return { ok: false, reason: "That backup has no shelves in it." };
  if (outer.data.categories.length > MAX_SHELVES) {
    return { ok: false, reason: `That backup has more than ${MAX_SHELVES} shelves, which isn't a Marquee library.` };
  }

  const shelves: RestoreShelf[] = [];
  const slugs = new Set<string>();
  let titles = 0;
  let dropped = 0;

  for (const raw of outer.data.categories) {
    const category = categorySchema.safeParse(raw);
    if (!category.success) {
      dropped += 1;
      continue;
    }

    // A slug the file doesn't have, or one another shelf already took, is
    // rebuilt from the name rather than colliding on (user_id, slug).
    const wanted = category.data.slug ? slugify(category.data.slug) : slugify(category.data.name);
    const slug = slugs.has(wanted) ? uniqueSlug(category.data.name, slugs) : wanted;
    slugs.add(slug);

    const items: RestoreItem[] = [];
    for (const row of category.data.items ?? []) {
      if (titles + items.length >= MAX_TITLES) break;
      const item = itemSchema.safeParse(row);
      if (item.success) items.push(item.data);
      else dropped += 1;
    }

    titles += items.length;
    shelves.push({
      name: category.data.name,
      slug,
      kind: category.data.kind,
      color: category.data.color,
      icon: category.data.icon,
      position: category.data.position ?? shelves.length,
      items,
    });
  }

  if (shelves.length === 0) return { ok: false, reason: NOT_A_BACKUP };

  return {
    ok: true,
    plan: {
      exportedAt: outer.data.exportedAt ?? null,
      shelves,
      titles,
      dropped,
      carries: carriedFields(shelves.flatMap((shelf) => shelf.items)),
    },
  };
}

/** One shelf's titles, split into writes the restore function will accept. */
export function batches(items: RestoreItem[], size = RESTORE_BATCH): RestoreItem[][] {
  const out: RestoreItem[][] = [];
  for (let start = 0; start < items.length; start += size) out.push(items.slice(start, start + size));
  return out;
}

/**
 * How a title is matched against what's already on the shelf. A provider link
 * is exact and survives a rename; without one, the title is all there is.
 */
export function matchKey(item: Pick<RestoreItem, "source" | "external_id" | "title">): string {
  if (item.source !== "manual" && item.external_id) return `${item.source}:${item.external_id}`;
  return `title:${item.title.trim().toLowerCase()}`;
}
