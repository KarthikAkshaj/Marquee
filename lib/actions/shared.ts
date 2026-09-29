"use server";

import { createClient } from "@/lib/supabase/server";
import { addSharedTitleSchema, type AddSharedTitleInput } from "@/lib/validators";

export type AddSharedResult =
  | { ok: true; id: string }
  /** `yours`: it's on that shelf already, so the card can say so instead. */
  | { ok: false; message: string; yours?: true };

const SESSION_ENDED = { ok: false, message: "Your session ended. Sign in again." } as const satisfies AddSharedResult;
const NOT_ADDED = { ok: false, message: "Couldn't add that title. Try again." } as const satisfies AddSharedResult;

/** What the database says, in words (0014_add_shared_titles.sql). */
const REFUSALS: Record<string, AddSharedResult> = {
  "23505": { ok: false, message: "That's already on this shelf.", yours: true },
  P0002: { ok: false, message: "That title isn't shared anymore." },
  "22023": { ok: false, message: "That shelf isn't there anymore." },
};

/**
 * Add to my shelf (SPEC §19): a title from someone's public shelf onto one of
 * yours, in a status you pick. The database copies what the title is and
 * nothing of what its owner made of it, and the insert runs as you, so RLS
 * checks the shelf is yours like any other add.
 *
 * Nothing is revalidated: that would redraw the public page behind the open
 * card (the scroll jump fixed in 42a4e2a), and your own pages are read afresh
 * on every visit anyway.
 */
export async function addSharedTitle(input: AddSharedTitleInput): Promise<AddSharedResult> {
  const parsed = addSharedTitleSchema.safeParse(input);
  if (!parsed.success) return NOT_ADDED;

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return SESSION_ENDED;

  const { username, itemId, categoryId, status } = parsed.data;
  const { data, error } = await supabase.rpc("copy_shared_title", {
    p_username: username,
    p_item: itemId,
    p_category: categoryId,
    p_status: status,
  });
  if (error) return REFUSALS[error.code] ?? NOT_ADDED;
  return typeof data === "string" ? { ok: true, id: data } : NOT_ADDED;
}
