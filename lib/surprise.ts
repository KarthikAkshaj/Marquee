import type { Item } from "@/lib/items";
import { MOODS, fitsMood } from "@/lib/moods";
import { lengthOf, type Length } from "@/lib/screen-time";
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

/** "How long have you got?": each answer, and which lengths fit it. */
export const LENGTHS = [
  { slug: "hour", label: "An hour", hint: "One episode, or a short film", fits: (length: Length) => length.sitting <= 60 },
  {
    slug: "evening",
    label: "An evening",
    hint: "A film, or something short enough to finish tonight",
    fits: (length: Length) => (length.feature ? length.sitting <= 180 : length.whole !== null && length.whole <= 180),
  },
  {
    slug: "weekend",
    label: "A weekend",
    hint: "A series you could finish in two days",
    fits: (length: Length) => !length.feature && length.whole !== null && length.whole > 180 && length.whole <= 720,
  },
] as const;

export type LengthSlug = (typeof LENGTHS)[number]["slug"];

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
  const length = LENGTHS.find((entry) => entry.slug === filter.length);
  const mood = MOODS.find((entry) => entry.slug === filter.mood);
  return titles.filter((title) => {
    if (filter.shelf && title.category_id !== filter.shelf) return false;
    if (mood && !fitsMood(title.genres, { mood, word: null })) return false;
    if (!length) return true;
    const kind = kinds.get(title.category_id);
    const timed = kind ? lengthOf({ ...title, kind }) : null;
    return timed !== null && length.fits(timed);
  });
}

/**
 * How much the reel leans to a title, from how well it suits you (For you's
 * backlog score, 0 neutral). Gentle on purpose: a great fit comes up several
 * times as often as a poor one, but anything can land.
 */
export function surpriseWeight(score: number): number {
  return Math.exp(Math.max(-3, Math.min(3, score)) / 1.5);
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
