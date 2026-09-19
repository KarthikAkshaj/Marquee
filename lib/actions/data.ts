"use server";

import { z } from "zod";
import { buildCategoryCsv, buildExport, csvFileName, exportFileName, type MarqueeExport } from "@/lib/export";
import { statusLabels } from "@/lib/status";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type ItemRow = Database["public"]["Tables"]["items"]["Row"];
type Failed = { ok: false; message: string };

const SESSION_ENDED: Failed = { ok: false, message: "Your session ended. Sign in again." };
const GATHER_FAILED: Failed = { ok: false, message: "Couldn't gather your data. Try again." };

/** PostgREST hands back at most 1,000 rows a request. */
const PAGE = 1000;

/** Every title (or one shelf's), oldest first, a page at a time so big lists come out whole. */
async function allItems(supabase: Supabase, categoryId?: string): Promise<ItemRow[] | null> {
  const items: ItemRow[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = supabase.from("items").select("*");
    if (categoryId) query = query.eq("category_id", categoryId);
    const { data, error } = await query
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) return null;
    items.push(...data);
    if (data.length < PAGE) return items;
  }
}

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

/** Profile, categories and titles as one JSON document (SPEC §8.10 Data, and "Export my data first"). */
export async function exportData(): Promise<{ ok: true; data: MarqueeExport; fileName: string } | Failed> {
  const { supabase, userId } = await signedIn();
  if (!userId) return SESSION_ENDED;

  const [profile, categories, items] = await Promise.all([
    supabase.from("profiles").select("username, display_name, bio, avatar_url, created_at").eq("id", userId).single(),
    supabase.from("categories").select("*"),
    allItems(supabase),
  ]);
  if (profile.error || categories.error || !items) return GATHER_FAILED;
  return { ok: true, data: buildExport(profile.data, categories.data, items), fileName: exportFileName(profile.data.username) };
}

/** One shelf as a CSV file (SPEC §8.10 Data). RLS keeps it to the viewer's own shelves. */
export async function exportCategoryCsv(categoryId: string): Promise<{ ok: true; csv: string; fileName: string } | Failed> {
  if (!z.uuid().safeParse(categoryId).success) return { ok: false, message: "Pick one of your categories." };
  const { supabase, userId } = await signedIn();
  if (!userId) return SESSION_ENDED;

  const { data: category } = await supabase.from("categories").select("slug, kind").eq("id", categoryId).maybeSingle();
  if (!category) return { ok: false, message: "Pick one of your categories." };
  const items = await allItems(supabase, categoryId);
  if (!items) return GATHER_FAILED;
  return { ok: true, csv: buildCategoryCsv(statusLabels(category.kind), items), fileName: csvFileName(category.slug) };
}
