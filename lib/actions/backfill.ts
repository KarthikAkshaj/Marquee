"use server";

/**
 * Filling in runtimes on titles that arrived before Marquee kept them
 * (SPEC §15). One call does a batch and hands back where it got to, so a long
 * shelf becomes a sequence of short requests instead of one that times out.
 *
 * The write goes through `fill_item_runtimes`, which quiets the updated_at
 * trigger: a plain update would stamp a whole library as changed today and
 * "Recently updated" is the default sort.
 */

import { revalidatePath } from "next/cache";
import { getMovieDetails, getSeriesDetails } from "@/lib/search";
import { getAniListShapes } from "@/lib/search/anilist";
import type { TitleShape } from "@/lib/search/types";
import type { CategoryKind } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";

/** Rows per call, sized so even an all-TMDB batch finishes well inside a request. */
const BATCH = 25;
/** TMDB answers one title at a time, so its lookups go a few abreast. */
const LANES = 5;

export type BackfillResult =
  | { ok: true; done: boolean; filled: number; cursor: string | null }
  | { ok: false; message: string };

type Pending = { id: string; external_id: string; source: string; categories: { kind: CategoryKind } };

async function fromTmdb(item: Pending): Promise<[string, TitleShape | null]> {
  if (item.categories.kind === "movie") {
    const details = await getMovieDetails(item.external_id);
    return [item.id, { runtimeMinutes: details?.runtimeMinutes, format: "movie" }];
  }
  if (item.categories.kind === "series") {
    const details = await getSeriesDetails(item.external_id);
    return [item.id, { runtimeMinutes: details?.runtimeMinutes, format: "tv" }];
  }
  // A TMDB title someone has since moved to a shelf of another kind.
  return [item.id, null];
}

/** What the providers say about this batch, by item id. Misses are left out. */
async function lookUp(items: Pending[]): Promise<Map<string, TitleShape>> {
  const found = new Map<string, TitleShape>();

  const anime = items.filter((item) => item.source === "anilist");
  if (anime.length > 0) {
    try {
      const shapes = await getAniListShapes(anime.map((item) => item.external_id));
      for (const item of anime) {
        const shape = shapes.get(item.external_id);
        if (shape) found.set(item.id, shape);
      }
    } catch (error) {
      // One provider being down shouldn't lose the rest of the batch.
      console.error("[backfill] anilist", error);
    }
  }

  const tmdb = items.filter((item) => item.source === "tmdb");
  for (let start = 0; start < tmdb.length; start += LANES) {
    const lane = await Promise.all(tmdb.slice(start, start + LANES).map(fromTmdb));
    for (const [id, shape] of lane) if (shape) found.set(id, shape);
  }

  return found;
}

/**
 * Looks up the next batch of titles missing a runtime and saves what it finds.
 * `cursor` is the last id of the previous batch; pass null to start. Titles a
 * provider no longer knows are stepped over rather than retried forever.
 */
export async function fillRuntimes(cursor: string | null): Promise<BackfillResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { ok: false, message: "Your session ended. Sign in again." };

  let query = supabase
    .from("items")
    .select("id, external_id, source, categories(kind)")
    .is("format", null)
    .is("runtime_minutes", null)
    .not("external_id", "is", null)
    .in("source", ["anilist", "tmdb"])
    .order("id")
    .limit(BATCH);
  if (cursor) query = query.gt("id", cursor);

  const { data, error } = await query;
  if (error) return { ok: false, message: "Couldn't read your shelves. Try again." };
  if (data.length === 0) return { ok: true, done: true, filled: 0, cursor };

  const done = data.length < BATCH;
  const next = data[data.length - 1].id;
  const pending = data.flatMap((item) =>
    item.external_id ? [{ ...item, external_id: item.external_id }] : [],
  );

  const shapes = await lookUp(pending);
  const rows = pending.flatMap((item) => {
    const shape = shapes.get(item.id);
    if (!shape || (shape.runtimeMinutes === undefined && shape.format === undefined)) return [];
    return [{ id: item.id, runtime_minutes: shape.runtimeMinutes ?? null, format: shape.format ?? null }];
  });

  if (rows.length === 0) return { ok: true, done, filled: 0, cursor: next };

  const { data: filled, error: writeError } = await supabase.rpc("fill_item_runtimes", { rows });
  if (writeError) return { ok: false, message: "Couldn't save what it found. Try again." };

  // Only at the end: the counts in the layout don't change on the way through.
  if (done) revalidatePath("/", "layout");
  return { ok: true, done, filled: filled ?? 0, cursor: next };
}
