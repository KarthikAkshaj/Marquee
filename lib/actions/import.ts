"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { importBatchSchema, type ImportBatch } from "@/lib/validators";

export type ImportBatchResult = { ok: true; added: number } | { ok: false; message: string };

/**
 * Saves one batch of an import (SPEC §8.9) through import_titles(), which runs
 * as the user (RLS picks the shelf) and leaves imported titles' dates empty:
 * they weren't started or finished today.
 */
export async function importTitles(batch: ImportBatch): Promise<ImportBatchResult> {
  const parsed = importBatchSchema.safeParse(batch);
  if (!parsed.success) return { ok: false, message: "Some titles didn't check out. Go back and look them over." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return { ok: false, message: "Your session ended. Sign in again." };

  const { categoryId, startedAt, titles } = parsed.data;
  const { data, error } = await supabase.rpc("import_titles", {
    target_category: categoryId,
    titles,
    batch_started: startedAt,
  });
  if (error) return { ok: false, message: "Couldn't import those titles. Try again." };

  revalidatePath("/", "layout");
  return { ok: true, added: data ?? 0 };
}
