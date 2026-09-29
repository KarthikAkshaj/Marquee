import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import { hasPassword } from "@/lib/auth/password";
import { USERNAME_PATTERN } from "@/lib/profile";
import { publicPageSchema, publicProfileSchema } from "@/lib/public-profile";
import type { Dismissed, TasteItem } from "@/lib/recommend";
import { createClient } from "@/lib/supabase/server";
import type { StatsItem } from "@/lib/stats";
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

/** Settings → Profile's sharing card (SPEC §19): the main switch, and each shelf's. */
export const getSharing = cache(async () => {
  const viewer = await getViewer();
  const supabase = await createClient();
  const [profile, shelves] = await Promise.all([
    supabase.from("profiles").select("is_public").eq("id", viewer.id).single(),
    supabase.from("categories").select("id, name, slug, color, icon, is_public, items(count)").order("position"),
  ]);

  if (profile.error || shelves.error) throw new Error("Couldn't load what you share.");

  return {
    username: viewer.profile?.username ?? null,
    isPublic: profile.data.is_public,
    shelves: shelves.data.map(({ items, ...shelf }) => ({ ...shelf, itemCount: items[0]?.count ?? 0 })),
  };
});

export type Sharing = Awaited<ReturnType<typeof getSharing>>;

/**
 * Someone's public profile (SPEC §19), read through the `public_profile`
 * function so only the safe fields ever leave the database. Null for a
 * private profile and for a username nobody has: the page treats them alike.
 */
export const getPublicProfile = cache(async (username: string) => {
  // Links get retyped; the page sends /u/Akshaj on to /u/akshaj.
  const handle = username.toLowerCase();
  if (!USERNAME_PATTERN.test(handle)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_profile", { p_username: handle });
  if (error) throw new Error(`Couldn't load this profile: ${error.message}`);
  return data === null ? null : publicProfileSchema.parse(data);
});

/**
 * The whole public page in one trip (SPEC §19): the profile, the shelf asked
 * for (or the first shared one) with its titles, and whether the viewer owns
 * it. Null for a private profile and for a username nobody has.
 */
export const getPublicPage = cache(async (username: string, shelf: string | null) => {
  const handle = username.toLowerCase();
  if (!USERNAME_PATTERN.test(handle)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_page", { p_username: handle, p_slug: shelf ?? undefined });
  if (error) throw new Error(`Couldn't load this profile: ${error.message}`);
  return data === null ? null : publicPageSchema.parse(data);
});

/** Whether anyone is signed in, for the public pages' top button. Unlike getViewer it never sends people to sign in. */
export const isSignedIn = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return Boolean(data?.claims?.sub);
});

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
    signsInWith: {
      google: providers.has("google"),
      email: providers.has("email"),
      password: hasPassword(user.user_metadata),
    },
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

/** One title in full: Home's spotlight when it lands on something planned. Null once it's gone. */
export const getItem = cache(async (id: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("items").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(`Couldn't load this title: ${error.message}`);
  return data;
});

/** PostgREST's cap on rows per request. */
const PAGE = 1000;

type Page<Row> = PromiseLike<{ data: Row[] | null; error: { message: string } | null }>;

/**
 * Every row a query matches, 1,000 at a time. Anything that counts or checks a
 * whole library needs this: past the cap, one request quietly comes back
 * short. `page` must order by something unique, or rows slip between pages.
 */
async function readAll<Row>(page: (from: number, to: number) => Page<Row>, what: string): Promise<Row[]> {
  const rows: Row[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(`Couldn't load ${what}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** Every title the viewer has, lightly: an import needs all of them to spot duplicates. */
export const getAllTitles = cache(async () => {
  const supabase = await createClient();
  return readAll(
    (from, to) =>
      supabase
        .from("items")
        .select("title, status, category_id")
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    "your titles",
  );
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
 * Titles that came from a provider but carry nothing a provider could tell us
 * about how long they run, so Settings can offer to fill them in and hide the
 * offer once there is nothing left. A row that came back with either column
 * filled has been asked about and is done, whatever the answer was.
 */
export const countRuntimeGaps = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("items")
    .select("id", { count: "exact", head: true })
    .is("format", null)
    .is("runtime_minutes", null)
    .not("external_id", "is", null)
    .in("source", ["anilist", "tmdb"]);
  // Never the reason a settings page fails to load.
  return error ? 0 : (count ?? 0);
});

/**
 * Everything /wrapped counts: what arrived this year, plus every completion
 * whenever it happened, since the ones with no date are a line of their own.
 * lib/wrapped does the arithmetic.
 */
export const getWrappedItems = cache(async (year: number): Promise<WrappedItem[]> => {
  const supabase = await createClient();
  const rows = await readAll(
    (from, to) =>
      supabase
        .from("items")
        .select(
          "title, status, rating, genres, progress_current, progress_total, runtime_minutes, format, created_at, finished_at, cover_url, accent_color, categories(name, kind)",
        )
        .or(`created_at.gte.${year}-01-01,status.eq.completed`)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    "your year",
  );

  return rows.map(({ categories, ...item }) => ({
    ...item,
    kind: categories.kind,
    categoryName: categories.name,
  }));
});

/**
 * Every title, with only what /stats counts. The whole library, so it pages;
 * lib/stats does the arithmetic and the shelf filter.
 */
export const getStatsItems = cache(async (): Promise<StatsItem[]> => {
  const supabase = await createClient();
  return readAll(
    (from, to) =>
      supabase
        .from("items")
        .select(
          "id, title, category_id, status, rating, genres, progress_current, progress_total, runtime_minutes, format, finished_at, community_score, source, cover_url",
        )
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    "your numbers",
  );
});

/**
 * Every title, with what For you weighs (SPEC §20): ratings and genres for
 * your taste, provider ids to tell what you already have, and enough to draw
 * a Planned title's poster. The whole library, so it pages.
 */
export const getTasteItems = cache(async (): Promise<TasteItem[]> => {
  const supabase = await createClient();
  return readAll(
    (from, to) =>
      supabase
        .from("items")
        .select(
          "id, title, category_id, status, rating, genres, tags, community_score, source, external_id, is_favorite, format, cover_url, accent_color, year, created_at, updated_at, finished_at",
        )
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to),
    "your picks",
  );
});

/**
 * Every title you've said isn't for you (SPEC §20): `keys` as
 * `source:external_id` so they're never offered again, and what each was
 * about, which your taste counts a little against.
 */
export const getDismissedPicks = cache(async (): Promise<{ keys: Set<string>; about: Dismissed[] }> => {
  const supabase = await createClient();
  const rows = await readAll(
    (from, to) =>
      supabase
        .from("dismissed_picks")
        .select("source, external_id, genres, tags")
        .order("source", { ascending: true })
        .order("external_id", { ascending: true })
        .range(from, to),
    "the picks you waved away",
  );
  return {
    keys: new Set(rows.map((row) => `${row.source}:${row.external_id}`)),
    about: rows.map((row) => ({ genres: row.genres, tags: row.tags })),
  };
});
