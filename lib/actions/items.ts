"use server";

import { revalidatePath } from "next/cache";
import type { z } from "zod";
import { SOURCE_FOR_KIND, searchKindOf, type AddFromSearchInput } from "@/lib/add";
import { incrementPatch, progressPatch, statusPatch, type ItemDetails } from "@/lib/items";
import { getAddDetails, type AddDetails } from "@/lib/search";
import type { ItemStatus } from "@/lib/status";
import { createClient } from "@/lib/supabase/server";
import {
  addFromSearchSchema,
  addManyFromSearchSchema,
  createItemSchema,
  type AddManyFromSearchInput,
  itemAccentSchema,
  itemAccentsSchema,
  itemDetailsSchema,
  itemFavoriteSchema,
  itemIdSchema,
  itemIdsSchema,
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

type Supabase = Awaited<ReturnType<typeof createClient>>;

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

/**
 * Undo for titles added together (SPEC §8.7). The Undo button is the confirm:
 * it only ever takes back what that same toast just added.
 */
export async function deleteItems(ids: string[]): Promise<ItemActionResult> {
  const parsed = itemIdsSchema.safeParse(ids);
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { error } = await supabase.from("items").delete().in("id", parsed.data);
  if (error) return { ok: false, message: "Couldn't remove those titles. Try again." };

  revalidatePath("/", "layout");
  return SAVED;
}

const NOT_ADDED ={ ok: false, message: "Couldn't add that title. Try again." } as const satisfies ItemActionResult;

/**
 * Adds a title picked from search (SPEC §8.7) with its metadata snapshot (§7).
 * The browser picks the id so the title can show, open and be undone at once.
 */
export async function addFromSearch(input: AddFromSearchInput): Promise<ItemActionResult> {
  const parsed = addFromSearchSchema.safeParse(input);
  if (!parsed.success) return NOT_ADDED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { id, categoryId, status, result } = parsed.data;
  const shelf = await searchShelf(supabase, categoryId);
  if (!shelf.ok) return shelf.missing ? SHELF_GONE : NOT_ADDED;
  if (SOURCE_FOR_KIND[shelf.kind] !== result.source) return NOT_ADDED;

  // Search results carry neither a show's episode count nor a film's running
  // time. AniList answers both in the search itself, so anime needs no lookup.
  const details = await getAddDetails(shelf.kind, result.externalId);

  const { error } = await supabase.from("items").insert(searchRow({ id, status, result }, userId, categoryId, details));
  // 23505: the same search result is already on this shelf.
  if (error?.code === "23505") return { ok: false, message: "That's already on this shelf." };
  if (error) return NOT_ADDED;

  revalidatePath("/", "layout");
  return SAVED;
}

type SearchPick = Pick<z.output<typeof addFromSearchSchema>, "id" | "status" | "result">;

const SHELF_GONE = { ok: false, message: "That shelf isn't there anymore." } as const satisfies ItemActionResult;

/** Which provider the shelf a search result is going onto searches. RLS limits it to the viewer's own. */
async function searchShelf(supabase: Supabase, categoryId: string) {
  const { data, error } = await supabase.from("categories").select("kind").eq("id", categoryId).maybeSingle();
  const kind = data ? searchKindOf(data.kind) : null;
  if (error || !kind) return { ok: false, missing: !error && !data } as const;
  return { ok: true, kind } as const;
}

/** The row a search result becomes, with whatever the add-time lookup found. */
function searchRow({ id, status, result }: SearchPick, userId: string, categoryId: string, details: AddDetails | null) {
  const progressTotal = details ? details.progressTotal : result.progressTotal;
  return {
    id,
    user_id: userId,
    category_id: categoryId,
    title: result.title,
    status,
    year: result.year ?? null,
    progress_total: progressTotal ?? null,
    progress_current: 0,
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
}

export type AddManyResult = { ok: true; added: string[] } | { ok: false; message: string };

const NOT_ADDED_MANY = { ok: false, message: "Couldn't add those titles. Try again." } as const satisfies ItemActionResult;

/** Add-time lookups in flight at once: a collection can run past twenty films. */
const LOOKUPS_AT_ONCE = 5;

/**
 * The rest of a run, added alongside a title just picked from search: an
 * anime's other seasons, a film's collection (SPEC §8.7). One insert, so they
 * land together, the first one newest so a shelf sorted by recent reads them
 * in order. Ones already on the shelf are left out instead of failing the lot.
 */
export async function addManyFromSearch(input: AddManyFromSearchInput): Promise<AddManyResult> {
  const parsed = addManyFromSearchSchema.safeParse(input);
  if (!parsed.success) return NOT_ADDED_MANY;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { categoryId, entries } = parsed.data;
  const shelf = await searchShelf(supabase, categoryId);
  if (!shelf.ok) return shelf.missing ? SHELF_GONE : NOT_ADDED_MANY;
  const source = SOURCE_FOR_KIND[shelf.kind];
  if (entries.some((entry) => entry.result.source !== source)) return NOT_ADDED_MANY;

  const { data: existing, error: existingError } = await supabase
    .from("items")
    .select("external_id")
    .eq("category_id", categoryId)
    .eq("source", source)
    .in(
      "external_id",
      entries.map((entry) => entry.result.externalId),
    );
  if (existingError) return NOT_ADDED_MANY;
  const have = new Set(existing.map((row) => row.external_id));
  const fresh = entries.filter((entry) => {
    if (have.has(entry.result.externalId)) return false;
    have.add(entry.result.externalId);
    return true;
  });
  if (fresh.length === 0) return { ok: true, added: [] };

  const details: (AddDetails | null)[] = [];
  for (let start = 0; start < fresh.length; start += LOOKUPS_AT_ONCE) {
    const chunk = fresh.slice(start, start + LOOKUPS_AT_ONCE);
    details.push(...(await Promise.all(chunk.map((entry) => getAddDetails(shelf.kind, entry.result.externalId)))));
  }

  const now = Date.now();
  const rows = fresh.map((entry, index) => {
    const at = new Date(now - index).toISOString();
    return { ...searchRow(entry, userId, categoryId, details[index]), created_at: at, updated_at: at };
  });
  const { error } = await supabase.from("items").insert(rows);
  if (error?.code === "23505") return { ok: false, message: "Some of those are already on this shelf." };
  if (error) return NOT_ADDED_MANY;

  revalidatePath("/", "layout");
  return { ok: true, added: fresh.map((entry) => entry.id) };
}

/**
 * The cover's colour, worked out in the browser after an add (SPEC §3). Only
 * fills a blank, so it never overwrites a colour the provider gave.
 */
export async function setItemAccent(id: string, color: string): Promise<ItemActionResult> {
  const parsed = itemAccentSchema.safeParse({ id, color });
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { error } = await supabase
    .from("items")
    .update({ accent_color: parsed.data.color })
    .eq("id", parsed.data.id)
    .is("accent_color", null);
  if (error) return NOT_SAVED;

  revalidatePath("/", "layout");
  return SAVED;
}

/**
 * Cover colours for many titles at once (after Find covers), so the shelf
 * refreshes once rather than once per title. Only fills blanks.
 */
export async function setItemAccents(colors: { id: string; color: string }[]): Promise<ItemActionResult> {
  const parsed = itemAccentsSchema.safeParse(colors);
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const results = await Promise.all(
    parsed.data.map(({ id, color }) => supabase.from("items").update({ accent_color: color }).eq("id", id).is("accent_color", null)),
  );
  if (results.some((result) => result.error)) return NOT_SAVED;

  revalidatePath("/", "layout");
  return SAVED;
}
