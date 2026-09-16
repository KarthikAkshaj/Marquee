"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createItemSchema } from "@/lib/validators";

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
