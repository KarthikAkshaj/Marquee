"use server";

import { revalidatePath } from "next/cache";
import { SOURCE_FOR_KIND, searchKindOf } from "@/lib/add";
import { getSeriesDetails } from "@/lib/search";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { saveMatchesSchema, type SaveMatchesInput } from "@/lib/validators";

type ItemUpdate = Database["public"]["Tables"]["items"]["Update"];

export type SaveMatchesResult =
  | { ok: true; saved: string[]; taken: string[]; failed: string[] }
  | { ok: false; message: string };

/**
 * Find covers (SPEC §8.9 step 6): hand-added titles become the search result
 * picked for them: cover, release year, episode total, genres, score. Where
 * you're up to is never lost: a total is only filled in where there wasn't
 * one and it isn't below your progress, and finished titles are filled to it.
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
  if (!kind || matches.some((match) => match.result.source !== SOURCE_FOR_KIND[kind])) {
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

  for (const { itemId, result } of matches) {
    const item = byId.get(itemId);
    if (!item) {
      failed.push(itemId);
      continue;
    }
    const series = kind === "series" ? await getSeriesDetails(result.externalId) : null;
    const total = series ? series.progressTotal : result.progressTotal;
    const patch: ItemUpdate = {
      title: keepTitles ? item.title : result.title,
      year: result.year ?? null,
      cover_url: result.coverUrl ?? null,
      backdrop_url: result.backdropUrl ?? null,
      accent_color: result.accentColor ?? null,
      source: result.source,
      external_id: result.externalId,
      genres: series?.genres ?? result.genres ?? [],
      community_score: result.communityScore ?? null,
    };
    if (total && item.progress_total === null && total >= item.progress_current) {
      patch.progress_total = total;
      if (item.status === "completed") patch.progress_current = total;
    }

    const { error: updateError } = await supabase.from("items").update(patch).eq("id", itemId).eq("source", "manual");
    // 23505: another title on this shelf is already that search result.
    if (updateError?.code === "23505") taken.push(itemId);
    else if (updateError) failed.push(itemId);
    else saved.push(itemId);
  }

  revalidatePath("/", "layout");
  return { ok: true, saved, taken, failed };
}
