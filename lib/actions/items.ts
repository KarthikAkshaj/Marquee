"use server";

import { revalidatePath } from "next/cache";
import { incrementPatch, statusPatch } from "@/lib/items";
import type { ItemStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import { createItemSchema, itemFavoriteSchema, itemIdSchema, itemStatusSchema } from "@/lib/validators";

export type CreateItemState =
  | { status: "idle" }
  | { status: "error"; message: string }
  /** `at` changes on every success so the dialog can react to repeat adds. */
  | { status: "created"; id: string; title: string; at: number };

/** Signed-in user id, re-checked inside every action (proxy.ts is not the boundary). */
async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/** Adds a title by hand (SPEC §8.7). RLS also checks the category belongs to the user. */
export async function createItem(
  _prev: CreateItemState,
  formData: FormData,
): Promise<CreateItemState> {
  const parsed = createItemSchema.safeParse({
    categoryId: formData.get("categoryId"),
    title: formData.get("title"),
    year: formData.get("year"),
    status: formData.get("status"),
    progressTotal: formData.get("progressTotal"),
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the details." };
  }

  const { supabase, userId } = await requireUserId();
  if (!userId) return { status: "error", message: "Your session ended. Sign in again." };

  const { categoryId, title, year, status, progressTotal } = parsed.data;
  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      category_id: categoryId,
      title,
      year: year ?? null,
      status,
      progress_total: progressTotal ?? null,
    })
    .select("id")
    .single();

  if (error) {
    return { status: "error", message: "Couldn't add that title. Try again." };
  }

  // Sidebar counts live in the layout, so refresh the whole app tree.
  revalidatePath("/", "layout");
  return { status: "created", id: data.id, title, at: Date.now() };
}

export type ItemActionResult = { ok: true } | { ok: false; message: string };

const SESSION_ENDED: ItemActionResult = { ok: false, message: "Your session ended. Sign in again." };
const GONE: ItemActionResult = { ok: false, message: "That title isn't on your shelf anymore." };
const NOT_SAVED: ItemActionResult = { ok: false, message: "Couldn't save that. Try again." };
const SAVED: ItemActionResult = { ok: true };

/** The progress fields a status change or +1 is worked out from. RLS keeps it to the viewer's rows. */
async function readProgress(id: string) {
  const { supabase, userId } = await requireUserId();
  if (!userId) return { found: false, failure: SESSION_ENDED } as const;
  const { data, error } = await supabase
    .from("items")
    .select("status, progress_current, progress_total")
    .eq("id", id)
    .maybeSingle();
  if (error) return { found: false, failure: NOT_SAVED } as const;
  if (!data) return { found: false, failure: GONE } as const;
  return { found: true, supabase, item: data } as const;
}

export async function setItemStatus(id: string, status: ItemStatus): Promise<ItemActionResult> {
  const parsed = itemStatusSchema.safeParse({ id, status });
  if (!parsed.success) return NOT_SAVED;

  const read = await readProgress(parsed.data.id);
  if (!read.found) return read.failure;

  const { error } = await read.supabase
    .from("items")
    .update(statusPatch(read.item, parsed.data.status))
    .eq("id", parsed.data.id);
  if (error) return NOT_SAVED;

  revalidatePath("/", "layout");
  return SAVED;
}

/** +1 on progress (SPEC §8.5 quick actions): may start or finish the title too. */
export async function incrementItemProgress(id: string): Promise<ItemActionResult> {
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return NOT_SAVED;

  const read = await readProgress(parsed.data);
  if (!read.found) return read.failure;

  const patch = incrementPatch(read.item);
  if (!patch) return { ok: false, message: "That one's already finished." };

  const { error } = await read.supabase.from("items").update(patch).eq("id", parsed.data);
  if (error) return NOT_SAVED;

  revalidatePath("/", "layout");
  return SAVED;
}

export async function setItemFavorite(id: string, favorite: boolean): Promise<ItemActionResult> {
  const parsed = itemFavoriteSchema.safeParse({ id, favorite });
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data, error } = await supabase
    .from("items")
    .update({ is_favorite: parsed.data.favorite })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  if (error) return NOT_SAVED;
  if (!data) return GONE;

  revalidatePath("/", "layout");
  return SAVED;
}

/** Callers confirm first: anything destructive goes through a confirm dialog. */
export async function deleteItem(id: string): Promise<ItemActionResult> {
  const parsed = itemIdSchema.safeParse(id);
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data, error } = await supabase
    .from("items")
    .delete()
    .eq("id", parsed.data)
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, message: "Couldn't remove that title. Try again." };
  if (!data) return GONE;

  revalidatePath("/", "layout");
  return SAVED;
}
