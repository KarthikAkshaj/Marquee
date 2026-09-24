"use server";

/**
 * Writing a Marquee backup back in (SPEC §8.10, U7).
 *
 * The file is read and reviewed in the browser, so nothing leaves the device
 * until the person confirms. That means everything arriving here is re-checked
 * against the same schema the browser used, and the writes themselves go
 * through `restore_shelves` and `restore_titles`, which run as the caller under
 * row level security and quiet the triggers that would otherwise stamp today's
 * date over the history being restored.
 *
 * Shelves go in one call, titles a shelf at a time in batches, so a long
 * library is a run of short requests rather than one that times out.
 */

import { revalidatePath } from "next/cache";
import { restoreShelvesSchema, restoreTitlesSchema, type RestoreItem, type RestoreShelfPayload } from "@/lib/restore";
import { createClient } from "@/lib/supabase/server";

export type ShelvesResult =
  | { ok: true; ids: Record<string, string> }
  | { ok: false; message: string };

export type TitlesResult =
  | { ok: true; inserted: number; updated: number; skipped: number }
  | { ok: false; message: string };

const SESSION_ENDED = "Your session ended. Sign in again.";

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? supabase : null;
}

/**
 * Creates the backup's shelves, updating any the viewer already has under the
 * same slug, and hands back slug to id so the titles know where to go.
 */
export async function restoreShelves(shelves: RestoreShelfPayload[]): Promise<ShelvesResult> {
  const parsed = restoreShelvesSchema.safeParse(shelves);
  if (!parsed.success) return { ok: false, message: "That backup's shelves didn't check out." };

  const supabase = await signedIn();
  if (!supabase) return { ok: false, message: SESSION_ENDED };

  const { data, error } = await supabase.rpc("restore_shelves", { shelves: parsed.data });
  if (error) return { ok: false, message: "Couldn't create those shelves. Try again." };

  const ids: Record<string, string> = {};
  if (data && typeof data === "object" && !Array.isArray(data)) {
    for (const [slug, id] of Object.entries(data)) if (typeof id === "string") ids[slug] = id;
  }

  // Every shelf has to have landed, or titles would go to the wrong place.
  if (parsed.data.some((shelf) => !ids[shelf.slug])) {
    return { ok: false, message: "Some shelves didn't come back. Try again." };
  }

  return { ok: true, ids };
}

/** One batch of titles into one shelf. Never deletes; updates what it matches. */
export async function restoreTitles(categoryId: string, items: RestoreItem[]): Promise<TitlesResult> {
  if (!/^[0-9a-f-]{36}$/i.test(categoryId)) return { ok: false, message: "That shelf isn't there anymore." };

  const parsed = restoreTitlesSchema.safeParse(items);
  if (!parsed.success) return { ok: false, message: "Some titles didn't check out." };

  const supabase = await signedIn();
  if (!supabase) return { ok: false, message: SESSION_ENDED };

  const { data, error } = await supabase.rpc("restore_titles", {
    target_category: categoryId,
    rows: parsed.data,
  });
  if (error) return { ok: false, message: "Couldn't restore those titles. Try again." };

  const counts = (data ?? {}) as { inserted?: number; updated?: number; skipped?: number };
  return {
    ok: true,
    inserted: counts.inserted ?? 0,
    updated: counts.updated ?? 0,
    skipped: counts.skipped ?? 0,
  };
}

/** Called once at the end: shelf counts live in the layout. */
export async function restoreFinished(): Promise<void> {
  revalidatePath("/", "layout");
}
