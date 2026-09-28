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

/** Everything the page needs in one trip (`public_page`): the profile, the open shelf and its titles. */
export const publicPageSchema = publicProfileSchema.extend({
  /** The viewer is the owner. */
  own: z.boolean().catch(false),
  /** The open shelf's slug; null when nothing is shared yet. */
  shelf: z.string().nullable(),
  titles: z.array(publicTitleSchema),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;
export type PublicPage = z.infer<typeof publicPageSchema>;
export type PublicShelf = PublicProfile["shelves"][number];
export type PublicTitle = z.infer<typeof publicTitleSchema>;

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
