"use server";

import { z } from "zod";
import { accessArgs } from "@/lib/public-profile";
import { createClient } from "@/lib/supabase/server";
import { copyIdsSchema, copySharedSchema, type CopySharedInput } from "@/lib/validators";

/** One copy made: the shared title's id, and your new title's. */
export type Copied = { shared: string; item: string };

export type CopySharedResult =
  | { ok: true; added: Copied[]; /** Skipped because they're yours already. */ already: number }
  | { ok: false; message: string };

const SESSION_ENDED = { ok: false, message: "Your session ended. Sign in again." } as const satisfies CopySharedResult;
const NOT_ADDED = { ok: false, message: "Couldn't add that. Try again." } as const satisfies CopySharedResult;

/** What the database says, in words (0015_shelf_links.sql). */
const REFUSALS: Record<string, CopySharedResult> = {
  P0002: { ok: false, message: "That shelf isn't shared anymore." },
  "22023": { ok: false, message: "That shelf of yours isn't there anymore." },
};

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/**
 * Add to my shelf and Add all (SPEC §19): shared titles onto one of your
 * shelves, in a status you pick, up to 500 at a time. The database copies
 * what each title is and nothing of what its owner made of it, skips the
 * ones you have already, and inserts as you, so RLS checks the shelf is yours
 * like any other add.
 *
 * Nothing is revalidated: that would redraw the shared page behind the open
 * card (the scroll jump fixed in 42a4e2a), and your own pages are read afresh
 * on every visit anyway.
 */
export async function copySharedTitles(input: CopySharedInput): Promise<CopySharedResult> {
  const parsed = copySharedSchema.safeParse(input);
  if (!parsed.success) return NOT_ADDED;

  const { supabase, userId } = await signedIn();
  if (!userId) return SESSION_ENDED;

  const { access, itemIds, categoryId, status } = parsed.data;
  const { data, error } = await supabase.rpc("copy_shared_titles", {
    ...accessArgs(access),
    p_items: itemIds,
    p_category: categoryId,
    p_status: status,
  });
  if (error) return REFUSALS[error.code] ?? NOT_ADDED;

  const result = copiedSchema.safeParse(data);
  return result.success ? { ok: true, ...result.data } : NOT_ADDED;
}

const copiedSchema = z.object({
  added: z.array(z.object({ shared: z.string(), item: z.string() })),
  already: z.number().int().min(0),
});

/** Undo for Add all: the copies just made go again. Not revalidated, for the same reason. */
export async function undoCopies(ids: string[]): Promise<{ ok: boolean }> {
  const parsed = copyIdsSchema.safeParse(ids);
  if (!parsed.success) return { ok: false };

  const { supabase, userId } = await signedIn();
  if (!userId) return { ok: false };

  const { error } = await supabase.from("items").delete().eq("user_id", userId).in("id", parsed.data);
  return { ok: !error };
}
