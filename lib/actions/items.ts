"use server";

import { revalidatePath } from "next/cache";
import { incrementPatch, progressPatch, statusPatch, type ItemDetails } from "@/lib/items";
import type { ItemStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import {
  createItemSchema,
  itemDetailsSchema,
  itemFavoriteSchema,
  itemIdSchema,
  itemProgressSchema,
  itemStatusSchema,
  moveItemSchema,
} from "@/lib/validators";

/** What was typed, handed back on an error: React resets the form after every submit. */
export type CreateItemValues = { title: string; year: string; progressTotal: string; progressCurrent: string };

export type CreateItemState =
  | { status: "idle" }
  | { status: "error"; message: string; values: CreateItemValues }
  /** `at` changes on every success so the dialog can react to repeat adds. */
  | { status: "created"; id: string; title: string; at: number };

const field = (formData: FormData, name: string) => {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
};

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
  const values: CreateItemValues = {
    title: field(formData, "title"),
    year: field(formData, "year"),
    progressTotal: field(formData, "progressTotal"),
    progressCurrent: field(formData, "progressCurrent"),
  };
  const parsed = createItemSchema.safeParse({
    categoryId: formData.get("categoryId"),
    status: formData.get("status"),
    ...values,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the details.", values };
  }

  const { supabase, userId } = await requireUserId();
  if (!userId) return { status: "error", message: "Your session ended. Sign in again.", values };

  const { categoryId, title, year, status, progressTotal, progressCurrent } = parsed.data;
  // Only a title you're partway through has a place to be up to: queued starts at
  // zero, and finished fills to the total in the database.
  const midway = status === "in_progress" || status === "dropped";
  const { data, error } = await supabase
    .from("items")
    .insert({
      user_id: userId,
      category_id: categoryId,
      title,
      year: year ?? null,
      status,
      progress_total: progressTotal ?? null,
      progress_current: midway ? (progressCurrent ?? 0) : 0,
    })
    .select("id")
    .single();

  if (error) {
    return { status: "error", message: "Couldn't add that title. Try again.", values };
  }

  // Sidebar counts live in the layout, so refresh the whole app tree.
  revalidatePath("/", "layout");
  return { status: "created", id: data.id, title, at: Date.now() };
}

export type ItemActionResult = { ok: true } | { ok: false; message: string };

const SESSION_ENDED = { ok: false, message: "Your session ended. Sign in again." } as const satisfies ItemActionResult;
const GONE = { ok: false, message: "That title isn't on your shelf anymore." } as const satisfies ItemActionResult;
const NOT_SAVED = { ok: false, message: "Couldn't save that. Try again." } as const satisfies ItemActionResult;
const SAVED = { ok: true } as const satisfies ItemActionResult;

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

/** A typed count, a total (null while airing), or the stepper's −. */
export async function setItemProgress(id: string, current: number, total: number | null): Promise<ItemActionResult> {
  const parsed = itemProgressSchema.safeParse({ id, current, total });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? NOT_SAVED.message };

  const read = await readProgress(parsed.data.id);
  if (!read.found) return read.failure;

  const { error } = await read.supabase
    .from("items")
    .update(progressPatch(read.item, parsed.data.current, parsed.data.total))
    .eq("id", parsed.data.id);
  if (error) return NOT_SAVED;

  revalidatePath("/", "layout");
  return SAVED;
}

/** Title, year, rating, notes and dates from the item sheet. */
export async function updateItemDetails(id: string, details: ItemDetails): Promise<ItemActionResult> {
  const parsedId = itemIdSchema.safeParse(id);
  const parsed = itemDetailsSchema.safeParse(details);
  if (!parsedId.success) return NOT_SAVED;
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? NOT_SAVED.message };

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data, error } = await supabase
    .from("items")
    .update(parsed.data)
    .eq("id", parsedId.data)
    .select("id")
    .maybeSingle();
  if (error) return NOT_SAVED;
  if (!data) return GONE;

  revalidatePath("/", "layout");
  return SAVED;
}

/** Onto another shelf. RLS rejects a category that isn't the viewer's. */
export async function moveItem(id: string, categoryId: string): Promise<ItemActionResult> {
  const parsed = moveItemSchema.safeParse({ id, categoryId });
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data, error } = await supabase
    .from("items")
    .update({ category_id: parsed.data.categoryId })
    .eq("id", parsed.data.id)
    .select("id")
    .maybeSingle();
  // 23505: that shelf already has this exact title from the same search source.
  if (error?.code === "23505") return { ok: false, message: "It's already on that shelf." };
  if (error) return { ok: false, message: "Couldn't move that title. Try again." };
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
