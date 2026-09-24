"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { SOURCE_FOR_KIND, searchKindOf } from "@/lib/add";
import { getAddDetails, type AddDetails } from "@/lib/search";
import type { ItemStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { saveMatchesSchema, type SaveMatchesInput } from "@/lib/validators";

type ItemUpdate = Database["public"]["Tables"]["items"]["Update"];
type Supabase = Awaited<ReturnType<typeof createClient>>;
type Match = z.output<typeof saveMatchesSchema>["matches"][number];
type Result = Match["result"];
type Extra = Match["extras"][number];
type ShelfRow = { title: string; status: ItemStatus; progress_current: number; progress_total: number | null };

export type SaveMatchesResult =
  | { ok: true; saved: string[]; taken: string[]; failed: string[]; added: number; missed: number }
  | { ok: false; message: string };

/**
 * What a hand-added title becomes: the result's details, and a total only where
 * there wasn't one and it isn't below your progress. Finished titles fill up to it.
 */
function matchPatch(item: ShelfRow, result: Result, title: string, details: AddDetails | null): ItemUpdate {
  const total = details ? details.progressTotal : result.progressTotal;
  const patch: ItemUpdate = {
    title,
    year: result.year ?? null,
    cover_url: result.coverUrl ?? null,
    backdrop_url: result.backdropUrl ?? null,
    accent_color: result.accentColor ?? null,
    source: result.source,
    external_id: result.externalId,
    genres: details?.genres ?? result.genres ?? [],
    community_score: result.communityScore ?? null,
    runtime_minutes: details?.runtimeMinutes ?? result.runtimeMinutes ?? null,
    format: result.format ?? null,
  };
  if (total && item.progress_total === null && total >= item.progress_current) {
    patch.progress_total = total;
    if (item.status === "completed") patch.progress_current = total;
  }
  return patch;
}

/**
 * Other seasons of a matched title, added as new titles. They go in through
 * `import_titles()` so nothing is stamped "started" or "finished" today, then
 * get their details like any match. Ones already on the shelf are skipped.
 */
async function addSeasons(supabase: Supabase, categoryId: string, extras: Extra[]): Promise<{ added: number; missed: number }> {
  if (extras.length === 0) return { added: 0, missed: 0 };
  const source = extras[0].result.source;
  const { data: existing, error } = await supabase
    .from("items")
    .select("external_id")
    .eq("category_id", categoryId)
    .eq("source", source)
    .in(
      "external_id",
      extras.map((extra) => extra.result.externalId),
    );
  if (error) return { added: 0, missed: extras.length };
  const have = new Set(existing.map((row) => row.external_id));
  const fresh: Extra[] = [];
  for (const extra of extras) {
    if (have.has(extra.result.externalId)) continue;
    have.add(extra.result.externalId);
    fresh.push(extra);
  }
  if (fresh.length === 0) return { added: 0, missed: 0 };

  const { error: insertError } = await supabase.rpc("import_titles", {
    target_category: categoryId,
    titles: fresh.map((extra, position) => ({ title: extra.result.title, status: extra.status, year: extra.result.year ?? null, position })),
    // The function takes the earlier of this and the database's clock, so the
    // new rows are the newest hand-added ones on the shelf, first one first.
    batch_started: "9999-12-31T00:00:00.000Z",
  });
  if (insertError) return { added: 0, missed: fresh.length };

  const { data: created } = await supabase
    .from("items")
    .select("id, title")
    .eq("category_id", categoryId)
    .eq("source", "manual")
    .order("created_at", { ascending: false })
    .limit(fresh.length);
  if (!created || created.length !== fresh.length || created.some((row, index) => row.title !== fresh[index].result.title)) {
    return { added: 0, missed: fresh.length };
  }

  let added = 0;
  for (const [index, row] of created.entries()) {
    const { result, status } = fresh[index];
    const patch = matchPatch({ title: result.title, status, progress_current: 0, progress_total: null }, result, result.title, null);
    const { error: updateError } = await supabase.from("items").update(patch).eq("id", row.id).eq("source", "manual");
    if (!updateError) added += 1;
    // Don't leave a bare hand-added copy behind.
    else await supabase.from("items").delete().eq("id", row.id).eq("source", "manual");
  }
  return { added, missed: fresh.length - added };
}

/**
 * Find covers (SPEC §8.9 step 6): hand-added titles become the search result
 * picked for them: cover, release year, episode total, genres, score. Where
 * you're up to is never lost. Other seasons picked alongside are added too.
 */
export async function saveMatches(input: SaveMatchesInput): Promise<SaveMatchesResult> {
  const parsed = saveMatchesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Some matches didn't check out. Try again." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, message: "Your session ended. Sign in again." };

  const { categoryId, keepTitles, matches } = parsed.data;
  const { data: category } = await supabase.from("categories").select("kind").eq("id", categoryId).maybeSingle();
  const kind = category ? searchKindOf(category.kind) : null;
  const results = matches.flatMap((match) => [match.result, ...match.extras.map((extra) => extra.result)]);
  if (!kind || results.some((result) => result.source !== SOURCE_FOR_KIND[kind])) {
    return { ok: false, message: "Those matches don't fit this shelf." };
  }

  const { data: items, error } = await supabase
    .from("items")
    .select("id, title, status, progress_current, progress_total")
    .eq("category_id", categoryId)
    .eq("source", "manual")
    .in(
      "id",
      matches.map((match) => match.itemId),
    );
  if (error) return { ok: false, message: "Couldn't save those matches. Try again." };
  const byId = new Map(items.map((item) => [item.id, item]));

  const saved: string[] = [];
  const taken: string[] = [];
  const failed: string[] = [];
  const extras: Extra[] = [];

  for (const { itemId, result, extras: more } of matches) {
    const item = byId.get(itemId);
    if (!item) {
      failed.push(itemId);
      continue;
    }
    const details = await getAddDetails(kind, result.externalId);
    const patch = matchPatch(item, result, keepTitles ? item.title : result.title, details);
    const { error: updateError } = await supabase.from("items").update(patch).eq("id", itemId).eq("source", "manual");
    // 23505: another title on this shelf is already that search result.
    if (updateError?.code === "23505") taken.push(itemId);
    else if (updateError) failed.push(itemId);
    else {
      saved.push(itemId);
      extras.push(...more);
    }
  }

  const { added, missed } = await addSeasons(supabase, categoryId, extras);
  revalidatePath("/", "layout");
  return { ok: true, saved, taken, failed, added, missed };
}
