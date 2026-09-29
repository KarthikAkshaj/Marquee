"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { categoryIdSchema } from "@/lib/validators";

export type ShelfLinkResult = { ok: true; token: string | null } | { ok: false; message: string };

const SESSION_ENDED = { ok: false, message: "Your session ended. Sign in again." } as const satisfies ShelfLinkResult;
const NOT_CHANGED = { ok: false, message: "Couldn't change that link. Try again." } as const satisfies ShelfLinkResult;

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Signed-in user id, re-checked inside every action (proxy.ts is not the boundary). */
async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/** A new link for the shelf. The database picks the token; RLS checks the shelf is yours. */
async function insertLink(supabase: Supabase, categoryId: string) {
  const { data, error } = await supabase.from("shelf_links").insert({ category_id: categoryId }).select("token").single();
  return error ? null : data.token;
}

/**
 * A shelf's link (SPEC §19): anyone with it sees that shelf and nothing else
 * of yours, profile public or not. Making one when there's one already hands
 * that one back, so two taps never leave two links about.
 */
export async function createShelfLink(categoryId: string): Promise<ShelfLinkResult> {
  const parsed = categoryIdSchema.safeParse(categoryId);
  if (!parsed.success) return NOT_CHANGED;
  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data: existing, error } = await supabase
    .from("shelf_links")
    .select("token")
    .eq("category_id", parsed.data)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NOT_CHANGED;
  const token = existing?.token ?? (await insertLink(supabase, parsed.data));
  if (!token) return NOT_CHANGED;

  revalidatePath("/settings/profile");
  return { ok: true, token };
}

/** A fresh link in place of the old one, which stops working: for a link that got around. */
export async function renewShelfLink(categoryId: string): Promise<ShelfLinkResult> {
  const parsed = categoryIdSchema.safeParse(categoryId);
  if (!parsed.success) return NOT_CHANGED;
  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { error } = await supabase.from("shelf_links").delete().eq("category_id", parsed.data);
  if (error) return NOT_CHANGED;
  const token = await insertLink(supabase, parsed.data);
  if (!token) return NOT_CHANGED;

  revalidatePath("/settings/profile");
  return { ok: true, token };
}

/** Stops sharing the shelf by link. Anyone holding it sees "Nothing showing". */
export async function removeShelfLink(categoryId: string): Promise<ShelfLinkResult> {
  const parsed = categoryIdSchema.safeParse(categoryId);
  if (!parsed.success) return NOT_CHANGED;
  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { error } = await supabase.from("shelf_links").delete().eq("category_id", parsed.data);
  if (error) return NOT_CHANGED;

  revalidatePath("/settings/profile");
  return { ok: true, token: null };
}
