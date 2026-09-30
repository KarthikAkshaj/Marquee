import type { Item } from "@/lib/items";
import { fitsLength, lengthOption, type LengthSlug } from "@/lib/lengths";
import { MOODS, fitsMood } from "@/lib/moods";
import { lengthOf } from "@/lib/screen-time";
import type { SearchResult } from "@/lib/search/types";
import type { CategoryKind } from "@/lib/status";

type Random = () => number;

/**
 * A planned title as Surprise me gets it from /api/surprise (SPEC §10): what
 * the reel shows, what the questions filter on, and how the pick leans.
 */
export type SurpriseTitle = Pick<
  Item,
  "id" | "title" | "category_id" | "year" | "cover_url" | "accent_color" | "format" | "genres" | "runtime_minutes" | "progress_total"
> & {
  /** "You rate Mystery 8.6", "AniList 88", or nothing worth saying. */
  reason: string | null;
  /** How strongly the reel leans to it; 1 is neutral. */
  weight: number;
};

/** Everything Surprise me needs, and whether your taste is known well enough to lean on. */
export type SurprisePool = { titles: SurpriseTitle[]; personal: boolean };

/**
 * A title from outside your shelves, as /api/surprise/new sends it: what a
 * provider says, the shelf of yours it would go on, why, and the lean.
 */
export type NewSurprise = { key: string; result: SearchResult; categoryId: string; reason: string; weight: number };

/** Something new for the choices, and a line for each provider that didn't answer. */
export type NewSurprisePayload = { titles: NewSurprise[]; notices: string[] };

/** Where the reel spins from: your planned titles, or ones you don't have yet. */
export type SurpriseSource = "list" | "new";

/** One cover on the reel, from either source, with what it stands for. */
export type ReelEntry = { id: string; cover_url: string | null; category_id: string; weight: number } & (
  | { own: SurpriseTitle; fresh?: never }
  | { fresh: NewSurprise; own?: never }
);

export const ownEntry = (title: SurpriseTitle): ReelEntry => ({
  id: title.id,
  cover_url: title.cover_url,
  category_id: title.category_id,
  weight: title.weight,
  own: title,
});

export const newEntry = (title: NewSurprise): ReelEntry => ({
  id: title.key,
  cover_url: title.result.coverUrl ?? null,
  category_id: title.categoryId,
  weight: title.weight,
  fresh: title,
});

export { LENGTHS, type LengthSlug } from "@/lib/lengths";

/** The three questions; null is "any". */
export type SurpriseFilter = { shelf: string | null; length: LengthSlug | null; mood: string | null };

export const ANY: SurpriseFilter = { shelf: null, length: null, mood: null };

/**
 * What's left to spin through. Games, custom shelves and comics have no length
 * to go by, so they only come up when the length is left open.
 */
export function surpriseCandidates<T extends SurpriseTitle>(
  titles: readonly T[],
  filter: SurpriseFilter,
  kinds: ReadonlyMap<string, CategoryKind>,
): T[] {
  const mood = MOODS.find((entry) => entry.slug === filter.mood);
  return titles.filter((title) => {
    if (filter.shelf && title.category_id !== filter.shelf) return false;
    if (mood && !fitsMood(title.genres, { mood, word: null })) return false;
    if (!filter.length) return true;
    const kind = kinds.get(title.category_id);
    return kind !== undefined && fitsLength({ ...title, kind }, filter.length);
  });
}

/**
 * Why there's nothing to spin, in words: "Nothing on your list can be
 * finished in an hour.", "No Horror on your Anime shelf runs one to three
 * hours.", or for titles you don't have, "Nothing new can be finished in an hour."
 */
export function nothingLine(filter: SurpriseFilter, shelfName: string | null, source: SurpriseSource = "list"): string {
  const fresh = source === "new";
  const mood = MOODS.find((entry) => entry.slug === filter.mood);
  const length = lengthOption(filter.length);
  const what = mood ? `No ${fresh ? "new " : ""}${mood.label}` : fresh ? "Nothing new" : "Nothing";
  const where = shelfName ? `${fresh ? "for" : "on"} your ${shelfName} shelf` : fresh ? null : "on your list";
  return `${[what, where, length?.nothing].filter(Boolean).join(" ")}.`;
}

/**
 * How much the reel leans to a title, from how well it suits you (For you's
 * backlog score, 0 neutral). Gentle on purpose: a great fit comes up several
 * times as often as a poor one, but anything can land.
 */
export function surpriseWeight(score: number): number {
  return Math.exp(Math.max(-3, Math.min(3, score)) / 1.5);
}

/**
 * The lean for a list already sorted best first (new titles, ranked like For
 * you's): the top one comes up about seven times as often as the last.
 */
export function rankWeight(index: number, count: number): number {
  return surpriseWeight(3 * (1 - (2 * index) / Math.max(count - 1, 1)));
}

/** A pick, leaning by weight, never the one just shown when there's anything else to choose. */
export function pickSurprise<T extends { id: string; weight?: number }>(
  candidates: readonly T[],
  avoid: string | null = null,
  random: Random = Math.random,
): T | null {
  if (candidates.length === 0) return null;
  const pool = candidates.length > 1 && avoid ? candidates.filter((title) => title.id !== avoid) : candidates;
  let roll = random() * pool.reduce((sum, title) => sum + (title.weight ?? 1), 0);
  for (const title of pool) {
    roll -= title.weight ?? 1;
    if (roll < 0) return title;
  }
  return pool[pool.length - 1] ?? null;
}

function randomFrame<T extends { id: string }>(candidates: readonly T[], previous: T | undefined, random: Random) {
  const pool = candidates.length > 1 ? candidates.filter((title) => title.id !== previous?.id) : candidates;
  return pool[Math.floor(random() * pool.length)] ?? candidates[0];
}

/**
 * The covers the reel spins past: `count` before the pick lands in the gate,
 * then a few after it so the strip stays full on both sides. Neighbours differ
 * when there are at least two candidates, so the reel visibly moves.
 */
export function reelFrames<T extends { id: string }>(
  candidates: readonly T[],
  pick: T,
  count = 16,
  random: Random = Math.random,
  after = 3,
): { frames: T[]; pickIndex: number } {
  const frames: T[] = [];
  for (let index = 0; index < count - 1; index += 1) frames.push(randomFrame(candidates, frames[index - 1], random));
  // The frame before the pick shouldn't be the pick, or the landing looks like a stall.
  if (candidates.length > 1 && frames.at(-1)?.id === pick.id) {
    frames[frames.length - 1] = candidates.find((title) => title.id !== pick.id) ?? pick;
  }
  const pickIndex = frames.push(pick) - 1;
  for (let index = 0; index < after; index += 1) frames.push(randomFrame(candidates, frames.at(-1), random));
  return { frames, pickIndex };
}

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

/**
 * "1h 55m", "12 eps · 4h 48m", "24 min episodes", with "about" where a
 * stand-in runtime was used. Null for what has no length.
 */
export function lengthLine(title: Pick<SurpriseTitle, "format" | "progress_total" | "runtime_minutes">, kind: CategoryKind): string | null {
  const length = lengthOf({ ...title, kind });
  if (!length) return null;
  const about = length.guessed ? "about " : "";
  if (length.feature) return `${about}${duration(length.guessed ? Math.round(length.sitting / 30) * 30 : length.sitting)}`;
  if (length.whole === null) return `${about}${length.sitting} min episodes`;
  const whole = length.guessed ? Math.max(1, Math.round(length.whole / 60)) * 60 : length.whole;
  return `${title.progress_total} ${title.progress_total === 1 ? "ep" : "eps"} · ${about}${duration(whole)}`;
}
