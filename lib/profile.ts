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

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** "2026-03" → "MAR 2026", for the member pass (U31). Anything else comes back as it was. */
export function memberSinceLabel(memberSince: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(memberSince);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  return match && month ? `${month} ${match[1]}` : memberSince;
}

/**
 * The member pass's barcode (U31): bar widths, 1 to 3, drawn from the
 * username, so every pass has its own and it changes as the name is typed.
 * Decorative; it encodes nothing anyone could scan.
 */
export function passBarcode(seed: string, bars = 30) {
  // FNV-1a, then a small xorshift: steady for the same name, scattered for a new letter.
  let state = 2166136261;
  for (const char of seed) state = Math.imul(state ^ char.charCodeAt(0), 16777619);
  const widths: number[] = [];
  for (let index = 0; index < bars; index += 1) {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    widths.push(1 + ((state >>> 0) % 3));
  }
  return widths;
}
