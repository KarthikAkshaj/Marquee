"use server";

import { revalidatePath } from "next/cache";
import { uniqueSlug } from "@/lib/categories";
import { createClient } from "@/lib/supabase/server";
import {
  categoryIdSchema,
  createCategorySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
  type CategoryInput,
} from "@/lib/validators";

export type CategoryActionResult = { ok: true; slug?: string } | { ok: false; message: string };

const SESSION_ENDED = { ok: false, message: "Your session ended. Sign in again." } as const satisfies CategoryActionResult;
const NOT_SAVED = { ok: false, message: "Couldn't save that. Try again." } as const satisfies CategoryActionResult;
const GONE = { ok: false, message: "That category isn't here anymore." } as const satisfies CategoryActionResult;

/** Signed-in user id, re-checked inside every action (proxy.ts is not the boundary). */
async function requireUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

type Client = Awaited<ReturnType<typeof createClient>>;

/** Slugs and positions already in use, except the category being edited. RLS keeps it to the viewer's own. */
async function siblings(supabase: Client, exceptId?: string) {
  const { data, error } = await supabase.from("categories").select("id, slug, position");
  if (error) return null;
  return data.filter((row) => row.id !== exceptId);
}

const isSlugClash = (error: { code?: string } | null) => error?.code === "23505";

/** New shelf at the bottom of the list (SPEC §8.10). */
export async function createCategory(input: CategoryInput): Promise<CategoryActionResult> {
  const parsed = createCategorySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? NOT_SAVED.message };

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  // Two tries: a slug taken between the read and the insert gets the next free one.
  for (let attempt = 0; attempt < 2; attempt++) {
    const others = await siblings(supabase);
    if (!others) return NOT_SAVED;
    const slug = uniqueSlug(parsed.data.name, others.map((row) => row.slug));
    const position = others.reduce((max, row) => Math.max(max, row.position + 1), 0);

    const { error } = await supabase.from("categories").insert({ ...parsed.data, user_id: userId, slug, position });
    if (isSlugClash(error)) continue;
    if (error) return { ok: false, message: "Couldn't create that category. Try again." };

    revalidatePath("/", "layout");
    return { ok: true, slug };
  }
  return NOT_SAVED;
}

/** Rename (which moves its URL), or change kind, colour or icon. */
export async function updateCategory(id: string, patch: Partial<CategoryInput>): Promise<CategoryActionResult> {
  const parsed = updateCategorySchema.safeParse({ id, ...patch });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? NOT_SAVED.message };

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { id: categoryId, ...fields } = parsed.data;
  for (let attempt = 0; attempt < 2; attempt++) {
    let slug: string | undefined;
    if (fields.name !== undefined) {
      const others = await siblings(supabase, categoryId);
      if (!others) return NOT_SAVED;
      slug = uniqueSlug(fields.name, others.map((row) => row.slug));
    }

    const { data, error } = await supabase
      .from("categories")
      .update({ ...fields, ...(slug ? { slug } : {}) })
      .eq("id", categoryId)
      .select("slug")
      .maybeSingle();
    if (isSlugClash(error)) continue;
    if (error) return NOT_SAVED;
    if (!data) return GONE;

    revalidatePath("/", "layout");
    return { ok: true, slug: data.slug };
  }
  return NOT_SAVED;
}

/** Positions follow the given order; the sidebar reads them. */
export async function reorderCategories(ids: string[]): Promise<CategoryActionResult> {
  const parsed = reorderCategoriesSchema.safeParse(ids);
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const results = await Promise.all(
    parsed.data.map((categoryId, position) =>
      supabase.from("categories").update({ position }).eq("id", categoryId),
    ),
  );
  if (results.some(({ error }) => error)) return { ok: false, message: "Couldn't save the new order. Try again." };

  revalidatePath("/", "layout");
  return { ok: true };
}

/** Takes its titles with it (the database cascades). Callers confirm first, showing the count. */
export async function deleteCategory(id: string): Promise<CategoryActionResult> {
  const parsed = categoryIdSchema.safeParse(id);
  if (!parsed.success) return NOT_SAVED;

  const { supabase, userId } = await requireUserId();
  if (!userId) return SESSION_ENDED;

  const { data, error } = await supabase.from("categories").delete().eq("id", parsed.data).select("id").maybeSingle();
  if (error) return { ok: false, message: "Couldn't delete that category. Try again." };
  if (!data) return GONE;

  revalidatePath("/", "layout");
  return { ok: true };
}
