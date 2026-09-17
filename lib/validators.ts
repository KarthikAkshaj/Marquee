import { z } from "zod";
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_KINDS } from "@/lib/categories";
import { AVATAR_MAX_BYTES, AVATAR_TYPES, BIO_MAX, DISPLAY_NAME_MAX, USERNAME_PATTERN, type AvatarType } from "@/lib/profile";
import { SEARCH_KINDS } from "@/lib/search/types";
import { ITEM_STATUSES } from "@/lib/status";

/** Every server action input is parsed through zod (SPEC §11). */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter your email.")
  .email("That doesn't look like an email.");

export const signInWithEmailSchema = z.object({
  email: emailSchema,
});

export type SignInWithEmailInput = z.infer<typeof signInWithEmailSchema>;

/** The 6-digit email sign-in code (SPEC §6). */
export const otpCodeSchema = z.string().regex(/^\d{6}$/, "Enter all 6 digits.");

export const verifyEmailCodeSchema = z.object({
  email: emailSchema,
  token: otpCodeSchema,
});

/** Empty form fields arrive as "" — treat them as not provided. */
const blankToUndefined = (value: unknown) =>
  value === "" || value === null || value === undefined ? undefined : value;

const PAST_THE_END = "That's past the last one. Check the total.";
const TOO_MANY = "That's a lot of episodes.";

const titleSchema = z.string().trim().min(1, "Give it a title.").max(200, "Keep the title under 200 characters.");

/** The year a title came out (not when you watched it). */
const releasedSchema = z
  .number()
  .int("Years are whole numbers.")
  .min(1870, "That year is before film existed.")
  .max(2100, "That year is a little far off.");

/** Manual add from the category page (SPEC §8.7 "Add manually"). */
export const createItemSchema = z
  .object({
    categoryId: z.string().uuid("Pick a category."),
    title: titleSchema,
    year: z.preprocess(blankToUndefined, z.coerce.number().pipe(releasedSchema).optional()),
    status: z.enum(ITEM_STATUSES),
    progressTotal: z.preprocess(
      blankToUndefined,
      z.coerce.number().int("Use a whole number.").min(1, "At least 1.").max(100_000, TOO_MANY).optional(),
    ),
    /** Where you're up to, so a long show doesn't take 800 presses of +1. */
    progressCurrent: z.preprocess(
      blankToUndefined,
      z.coerce.number().int("Use a whole number.").min(0, "Can't be below zero.").max(100_000, TOO_MANY).optional(),
    ),
  })
  .refine(
    ({ progressCurrent, progressTotal }) =>
      progressCurrent === undefined || progressTotal === undefined || progressCurrent <= progressTotal,
    { message: PAST_THE_END, path: ["progressCurrent"] },
  );

export type CreateItemInput = z.infer<typeof createItemSchema>;

/** Quick actions and the item sheet act on one title at a time. */
export const itemIdSchema = z.string().uuid();

export const itemStatusSchema = z.object({
  id: itemIdSchema,
  status: z.enum(ITEM_STATUSES),
});

export const itemFavoriteSchema = z.object({
  id: itemIdSchema,
  favorite: z.boolean(),
});

/** The stepper, or a typed count. A null total means it's still airing. */
export const itemProgressSchema = z
  .object({
    id: itemIdSchema,
    current: z.number().int("Use a whole number.").min(0, "Can't be below zero.").max(100_000, TOO_MANY),
    total: z.number().int("Use a whole number.").min(1, "At least 1.").max(100_000, TOO_MANY).nullable(),
  })
  .refine(({ current, total }) => total === null || current <= total, { message: PAST_THE_END, path: ["current"] });

const dateSchema = z.iso.date("That isn't a real date.").nullable();

/** Fields edited in place on the item sheet (SPEC §8.6). Only what changed is sent. */
export const itemDetailsSchema = z
  .object({
    title: titleSchema,
    year: releasedSchema.nullable(),
    rating: z.number().int("Ratings are whole numbers.").min(1, "Ratings run 1 to 10.").max(10, "Ratings run 1 to 10.").nullable(),
    // Blank notes are no notes.
    notes: z
      .string()
      .max(2000, "Notes top out at 2,000 characters.")
      .nullable()
      .transform((notes) => (notes?.trim() ? notes : null)),
    started_at: dateSchema,
    finished_at: dateSchema,
  })
  .partial()
  .strict()
  .refine((details) => Object.keys(details).length > 0, "Nothing to save.");

export const moveItemSchema = z.object({
  id: itemIdSchema,
  categoryId: z.string().uuid("Pick a category."),
});

/** A category's editable parts (SPEC §8.10 Categories). Colour and icon are token names, never hex or markup. */
const categoryFields = {
  name: z.string().trim().min(1, "Give it a name.").max(40, "Keep the name under 40 characters."),
  kind: z.enum(CATEGORY_KINDS),
  color: z.enum(CATEGORY_COLORS),
  icon: z.enum(CATEGORY_ICONS),
};

export const categoryIdSchema = z.string().uuid();

export const createCategorySchema = z.object(categoryFields);

export const updateCategorySchema = z
  .object({ id: categoryIdSchema, ...categoryFields })
  .partial({ name: true, kind: true, color: true, icon: true })
  .strict()
  .refine((patch) => Object.keys(patch).length > 1, "Nothing to save.");

/** Every category id in its new order, top first. */
export const reorderCategoriesSchema = z
  .array(z.string().uuid())
  .min(1)
  .max(100)
  .refine((ids) => new Set(ids).size === ids.length, "Each category once.");

export type CategoryInput = z.infer<typeof createCategorySchema>;

/** Same rule as the database check on profiles.username (SPEC §5). */
export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "3–20 characters: lowercase letters, numbers and _.");

/** Settings → Profile (SPEC §8.10). A blank bio is no bio. */
export const profileSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(1, "Give yourself a name.")
    .max(DISPLAY_NAME_MAX, `Keep it under ${DISPLAY_NAME_MAX} characters.`),
  username: usernameSchema,
  bio: z
    .string()
    .trim()
    .max(BIO_MAX, `Bios top out at ${BIO_MAX} characters.`)
    .transform((bio) => bio || null),
});

export type ProfileInput = z.input<typeof profileSchema>;

/** What the browser uploads after cropping: a small square in a format the bucket accepts. */
export const avatarFileSchema = z.object({
  type: z.enum(Object.keys(AVATAR_TYPES) as [AvatarType, ...AvatarType[]], "Use a PNG, JPEG or WebP image."),
  size: z.number().positive("That file is empty.").max(AVATAR_MAX_BYTES, "That photo is over 2 MB."),
});

/** GET /api/search?kind=&q= (SPEC §7). Custom shelves have no provider. */
export const searchQuerySchema = z.object({
  kind: z.enum(SEARCH_KINDS),
  q: z.string().trim().min(2).max(100),
});

/**
 * Only same-origin, path-only redirects survive — an open redirect here would
 * send a freshly signed-in user to whatever host an attacker put in the URL.
 * Resolving against a fixed origin catches the tricks a prefix check misses,
 * like `/\evil.example`, which browsers and `new URL()` treat as `//evil.example`.
 */
const REDIRECT_BASE = "http://marquee.invalid";

export function safeRedirectPath(value: string | null | undefined, fallback = "/home") {
  if (!value || !value.startsWith("/")) return fallback;
  try {
    const url = new URL(value, REDIRECT_BASE);
    if (url.origin !== REDIRECT_BASE) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
