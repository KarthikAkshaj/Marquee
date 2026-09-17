/** Profile rules shared by the form, the actions and the database check (SPEC §5, §8.10). */

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;
export const DISPLAY_NAME_MAX = 40;
export const BIO_MAX = 160;

/** What typing into the username box turns into: lowercase, spaces become underscores. */
export function normaliseUsername(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, "_");
}

/** A nearby name to offer when one's taken: "akuma" → "akuma_42". Stays within 20 characters. */
export function suggestUsername(taken: string, random = Math.random) {
  const suffix = String(10 + Math.floor(random() * 90));
  return `${taken.slice(0, 20 - suffix.length - 1)}_${suffix}`;
}

const PUBLIC_AVATARS = "/storage/v1/object/public/avatars/";

/**
 * The Storage path of an avatar this user uploaded, or null for anything else
 * (a Google photo, someone else's folder, a malformed URL). Only these get deleted.
 */
export function ownAvatarPath(url: string | null | undefined, userId: string) {
  if (!url) return null;
  const at = url.indexOf(PUBLIC_AVATARS);
  if (at < 0) return null;
  const path = decodeURIComponent(url.slice(at + PUBLIC_AVATARS.length).split(/[?#]/)[0]);
  const [folder, file, ...rest] = path.split("/");
  return folder === userId && file && rest.length === 0 ? path : null;
}

export const AVATAR_TYPES = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" } as const;
export type AvatarType = keyof typeof AVATAR_TYPES;
/** The bucket's own limit (0002_avatars.sql). */
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
