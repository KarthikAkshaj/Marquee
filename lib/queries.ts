import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Per-request cached reads shared by the app shell and pages, so the sidebar
 * and the page don't each hit the database for the same rows.
 * Every query runs as the signed-in user; RLS scopes the results.
 */
export const getViewer = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  // proxy.ts already guards (app) routes; this is the belt to its braces.
  if (!claims) redirect("/login");

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("username, display_name, avatar_url")
    .eq("id", claims.sub)
    .maybeSingle();

  if (error) throw new Error(`Couldn't load your profile: ${error.message}`);

  return { id: claims.sub, email: claims.email ?? null, profile };
});

export const getCategories = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, kind, color, icon, position, items(count)")
    .order("position");

  if (error) throw new Error(`Couldn't load your categories: ${error.message}`);

  return data.map(({ items, ...category }) => ({
    ...category,
    itemCount: items[0]?.count ?? 0,
  }));
});

export type CategoryWithCount = Awaited<ReturnType<typeof getCategories>>[number];

/** One category by its URL slug, or the 404 page. RLS limits it to the viewer's own. */
export const getCategoryBySlug = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, slug, kind, color, icon, position")
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`Couldn't load this category: ${error.message}`);
  if (!data) notFound();
  return data;
});

/** Every item on a shelf. Status tabs, favourites and sort are applied in lib/items. */
export const getCategoryItems = cache(async (categoryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("category_id", categoryId)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`Couldn't load these titles: ${error.message}`);
  return data;
});

export type Category = Awaited<ReturnType<typeof getCategoryBySlug>>;

/** Everything Settings → Profile edits, plus the small stats card (SPEC §8.10). */
export const getProfile = cache(async () => {
  const viewer = await getViewer();
  const supabase = await createClient();
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [profile, titles, finished] = await Promise.all([
    supabase.from("profiles").select("username, display_name, avatar_url, bio, created_at").eq("id", viewer.id).single(),
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("finished_at", yearStart),
  ]);

  if (profile.error) throw new Error(`Couldn't load your profile: ${profile.error.message}`);
  if (titles.error || finished.error) throw new Error("Couldn't count your titles.");

  return {
    ...profile.data,
    email: viewer.email,
    stats: {
      memberSince: profile.data.created_at.slice(0, 7),
      totalTitles: titles.count ?? 0,
      completedThisYear: finished.count ?? 0,
    },
  };
});

export type Profile = Awaited<ReturnType<typeof getProfile>>;
