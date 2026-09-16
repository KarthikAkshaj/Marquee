import { z } from "zod";

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
