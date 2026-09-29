import { z } from "zod";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_KINDS } from "@/lib/categories";
import type { StatusTab } from "@/lib/items";
import { ITEM_FORMATS, ITEM_STATUSES } from "@/lib/status";

/**
 * Public profiles (SPEC §19). What the `public_profile` and `public_shelf`
 * functions hand out, checked on the way in: a page shown to strangers should
 * never trust the shape of what it's about to render.
 */
const publicShelfSchema = z.object({
  slug: z.string(),
  name: z.string(),
  kind: z.enum(CATEGORY_KINDS),
  color: z.enum(CATEGORY_COLORS).catch("amber"),
  icon: z.enum(CATEGORY_ICONS).catch("clapperboard"),
  count: z.number().int(),
});

export const publicProfileSchema = z.object({
  username: z.string(),
  display_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
  bio: z.string().nullable(),
  /** "2026-03", as the member pass wants it. */
  member_since: z.string(),
  shelves: z.array(publicShelfSchema),
  finished_this_year: z.number().int(),
});

export const publicTitleSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(ITEM_STATUSES),
  rating: z.number().int().nullable(),
  progress_current: z.number().int(),
  progress_total: z.number().int().nullable(),
  cover_url: z.string().nullable(),
  backdrop_url: z.string().nullable(),
  accent_color: z.string().nullable(),
  year: z.number().int().nullable(),
  format: z.enum(ITEM_FORMATS).nullable().catch(null),
  genres: z.array(z.string()),
  is_favorite: z.boolean(),
});

/**
 * A signed-in visitor's side of Add to my shelf: their own shelves, and which
 * of the open shelf's titles they already have (keyed by the shared title's
 * id). Only ever the visitor's own rows.
 */
const viewerSchema = z.object({
  shelves: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      slug: z.string(),
      kind: z.enum(CATEGORY_KINDS),
      color: z.enum(CATEGORY_COLORS).catch("amber"),
    }),
  ),
  has: z.record(z.string(), z.object({ item: z.string(), shelf: z.string() })).catch({}),
});

/** Everything the page needs in one trip (`public_page`): the profile, the open shelf and its titles. */
export const publicPageSchema = publicProfileSchema.extend({
  /** The viewer is the owner. */
  own: z.boolean().catch(false),
  /** The open shelf's slug; null when nothing is shared yet. */
  shelf: z.string().nullable(),
  titles: z.array(publicTitleSchema),
  /** Null for the owner and for anyone signed out. */
  viewer: viewerSchema.nullable().catch(null),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicPage = z.infer<typeof publicPageSchema>;
export type PublicShelf = PublicProfile["shelves"][number];
export type PublicTitle = z.infer<typeof publicTitleSchema>;
export type PublicViewer = z.infer<typeof viewerSchema>;
export type ViewerShelf = PublicViewer["shelves"][number];
/** Where the visitor's own copy of a shared title is. */
export type ViewerCopy = PublicViewer["has"][string];

/** The visitor's shelves a title from a shelf of this kind can go on: only the same kind. */
export function shelvesFor(viewer: PublicViewer, kind: PublicShelf["kind"]): ViewerShelf[] {
  return viewer.shelves.filter((shelf) => shelf.kind === kind);
}

/**
 * How a visitor reached a shared shelf: through a public profile, or a
 * shelf's secret link. Everything that reads or copies from it passes this
 * along, and the database's `visible_shelves` checks it. A new way in adds a
 * case here and there.
 */
export type ShelfAccess = { by: "profile"; username: string } | { by: "link"; token: string };

/** A shelf link's secret: 22 URL-safe characters (0015_shelf_links.sql). */
export const LINK_TOKEN = /^[A-Za-z0-9_-]{22}$/;

/**
 * What the database functions take for each way in. They want both; the one
 * not used goes as an empty string, which matches nothing: usernames run 3 to
 * 20 characters and tokens are 22.
 */
export function accessArgs(access: ShelfAccess): { p_username: string; p_token: string } {
  return access.by === "profile" ? { p_username: access.username, p_token: "" } : { p_username: "", p_token: access.token };
}

/** A shared shelf's address with its tab and open title: the profile's, or the link's. */
export function accessHref(access: ShelfAccess, first: string | undefined, params: Partial<PublicParams>) {
  if (access.by === "profile") return publicHref(access.username, first, params);
  const search = new URLSearchParams();
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.item) search.set("item", params.item);
  const query = search.toString();
  return `/s/${access.token}${query ? `?${query}` : ""}`;
}

/** One shelf by its link (`link_page`): the owner's name and photo, and the shelf as a public one reads. */
export const linkPageSchema = z.object({
  owner: z.object({ name: z.string().nullable(), avatar_url: z.string().nullable() }),
  shelf: publicShelfSchema,
  own: z.boolean().catch(false),
  titles: z.array(publicTitleSchema),
  viewer: viewerSchema.nullable().catch(null),
});

export type LinkPage = z.infer<typeof linkPageSchema>;

/** The member pass's numbers, from the shared shelves only. */
export function publicStats(profile: PublicProfile) {
  return {
    memberSince: profile.member_since,
    totalTitles: profile.shelves.reduce((sum, shelf) => sum + shelf.count, 0),
    completedThisYear: profile.finished_this_year,
  };
}

export type PublicParams = {
  shelf: string;
  status: StatusTab;
  item: string | null;
};

/** A public profile URL, with the first shelf and "All" left out so shared links stay short. */
export function publicHref(username: string, first: string | undefined, params: Partial<PublicParams>) {
  const search = new URLSearchParams();
  if (params.shelf && params.shelf !== first) search.set("shelf", params.shelf);
  if (params.status && params.status !== "all") search.set("status", params.status);
  if (params.item) search.set("item", params.item);
  const query = search.toString();
  return `/u/${encodeURIComponent(username)}${query ? `?${query}` : ""}`;
}
