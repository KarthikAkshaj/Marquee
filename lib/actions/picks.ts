"use server";

import { createClient } from "@/lib/supabase/server";
import { pickKeySchema, type PickKey } from "@/lib/validators";

export type PickActionResult = { ok: true } | { ok: false; message: string };

const SESSION_ENDED = { ok: false, message: "Your session ended. Sign in again." } as const satisfies PickActionResult;
const NOT_SAVED = { ok: false, message: "Couldn't save that. Try again." } as const satisfies PickActionResult;

/** Signed-in user id, re-checked inside every action (proxy.ts is not the boundary). */
async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/**
 * "Not for me" on For you (SPEC §20): the title is never offered again. Saying
 * it twice is fine. Nothing is revalidated: the card has already gone, and the
 * page reads the list afresh on the next visit.
 */
export async function dismissPick(key: PickKey): Promise<PickActionResult> {
  const parsed = pickKeySchema.safeParse(key);
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { error } = await supabase
    .from("dismissed_picks")
    .upsert({ user_id: userId, source: parsed.data.source, external_id: parsed.data.externalId }, { ignoreDuplicates: true });
  return error ? NOT_SAVED : { ok: true };
}

/** Undo for "Not for me": the title can be offered again. */
export async function restorePick(key: PickKey): Promise<PickActionResult> {
  const parsed = pickKeySchema.safeParse(key);
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { error } = await supabase
    .from("dismissed_picks")
    .delete()
    .eq("user_id", userId)
    .eq("source", parsed.data.source)
    .eq("external_id", parsed.data.externalId);
  return error ? NOT_SAVED : { ok: true };
}
