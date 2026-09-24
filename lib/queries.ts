import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { WrappedItem } from "@/lib/wrapped";

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

/** Settings → Account (SPEC §8.10): how the user signs in, and what deleting would take with it. */
export const getAccount = cache(async () => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login");

  const { user } = data;
  const providers = new Set((user.identities ?? []).map((identity) => identity.provider));
  const [profile, titles, categories] = await Promise.all([
    supabase.from("profiles").select("username").eq("id", user.id).single(),
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("categories").select("id", { count: "exact", head: true }),
  ]);
  if (profile.error) throw new Error(`Couldn't load your account: ${profile.error.message}`);

  return {
    email: user.email ?? null,
    /** Set while an email change waits for its confirmation links. */
    pendingEmail: user.new_email ?? null,
    signsInWith: { google: providers.has("google"), email: providers.has("email") },
    username: profile.data.username,
    titleCount: titles.count ?? 0,
    categoryCount: categories.count ?? 0,
  };
});

export type Account = Awaited<ReturnType<typeof getAccount>>;

/**
 * Everything Home shows (SPEC §8.4): what's in progress everywhere, the last
 * eight finished, your favourites (§10), and per-shelf counts. The counts are filtered embeds, so
 * they stay right past PostgREST's 1,000-row page.
 */
export const getHome = cache(async () => {
  const supabase = await createClient();
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [continuing, finished, favourites, shelves, finishedThisYear] = await Promise.all([
    supabase.from("items").select("*").eq("status", "in_progress").order("updated_at", { ascending: false }).limit(24),
    supabase
      .from("items")
      .select("*")
      .eq("status", "completed")
      .order("finished_at", { ascending: false, nullsFirst: false })
      .order("updated_at", { ascending: false })
      .limit(8),
    supabase.from("items").select("*").eq("is_favorite", true).order("updated_at", { ascending: false }).limit(12),
    supabase
      .from("categories")
      .select("id, watching:items(count), planned:items(count)")
      .eq("watching.status", "in_progress")
      .eq("planned.status", "planned"),
    supabase
      .from("items")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .gte("finished_at", yearStart),
  ]);

  if (continuing.error || finished.error || favourites.error || shelves.error || finishedThisYear.error) {
    throw new Error("Couldn't load your home screen.");
  }

  return {
    continuing: continuing.data,
    finished: finished.data,
    favourites: favourites.data,
    counts: new Map(
      shelves.data.map((shelf) => [shelf.id, { inProgress: shelf.watching[0]?.count ?? 0, planned: shelf.planned[0]?.count ?? 0 }]),
    ),
    finishedThisYear: finishedThisYear.count ?? 0,
  };
});

const PAGE = 1000;

/**
 * Every title the viewer has, lightly, in pages: PostgREST returns at most
 * 1,000 rows per request, and an import needs all of them to spot duplicates.
 */
export const getAllTitles = cache(async () => {
  const supabase = await createClient();
  const titles: { title: string; status: Database["public"]["Enums"]["item_status"]; category_id: string }[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("items")
      .select("title, status, category_id")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't load your titles: ${error.message}`);
    titles.push(...data);
    if (data.length < PAGE) return titles;
  }
});

/** A shelf's hand-added titles, for Find covers. */
export const getManualTitles = cache(async (categoryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("id, title, year, status")
    .eq("category_id", categoryId)
    .eq("source", "manual")
    .order("created_at", { ascending: false })
    .order("id", { ascending: true });
  if (error) throw new Error(`Couldn't load these titles: ${error.message}`);
  return data;
});

export type ManualTitle = Awaited<ReturnType<typeof getManualTitles>>[number];

/** Search results a shelf already holds ("anilist:21"), so Find covers doesn't pick one twice. */
export const getShelfMatches = cache(async (categoryId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select("title, source, external_id")
    .eq("category_id", categoryId)
    .not("external_id", "is", null);
  if (error) throw new Error(`Couldn't load these titles: ${error.message}`);
  return data.map((item) => ({ key: `${item.source}:${item.external_id}`, title: item.title }));
});

/**
 * Everything /wrapped counts: what arrived this year, plus every completion
 * whenever it happened, since the ones with no date are a line of their own.
 * lib/wrapped does the arithmetic.
 */
export const getWrappedItems = cache(async (year: number): Promise<WrappedItem[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("items")
    .select(
      "title, status, rating, genres, progress_current, progress_total, runtime_minutes, format, created_at, finished_at, cover_url, accent_color, categories(name, kind)",
    )
    .or(`created_at.gte.${year}-01-01,status.eq.completed`);

  if (error) throw new Error(`Couldn't load your year: ${error.message}`);

  return data.map(({ categories, ...item }) => ({
    ...item,
    kind: categories.kind,
    categoryName: categories.name,
  }));
});
