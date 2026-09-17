import { z } from "zod";
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

/** Manual add from the category page (SPEC §8.7 "Add manually"). */
export const createItemSchema = z.object({
  categoryId: z.string().uuid("Pick a category."),
  title: z
    .string()
    .trim()
    .min(1, "Give it a title.")
    .max(200, "Keep the title under 200 characters."),
  year: z.preprocess(
    blankToUndefined,
    z.coerce
      .number()
      .int("Years are whole numbers.")
      .min(1870, "That year is before film existed.")
      .max(2100, "That year is a little far off.")
      .optional(),
  ),
  status: z.enum(ITEM_STATUSES),
  progressTotal: z.preprocess(
    blankToUndefined,
    z.coerce
      .number()
      .int("Use a whole number.")
      .min(1, "At least 1.")
      .max(100_000, "That's a lot of episodes.")
      .optional(),
  ),
});

export type CreateItemInput = z.infer<typeof createItemSchema>;

/** Quick actions on one title: status, +1, favourite, delete. */
export const itemIdSchema = z.string().uuid();

export const itemStatusSchema = z.object({
  id: itemIdSchema,
  status: z.enum(ITEM_STATUSES),
});

export const itemFavoriteSchema = z.object({
  id: itemIdSchema,
  favorite: z.boolean(),
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
