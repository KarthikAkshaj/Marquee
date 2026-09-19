import type { PaletteTitle } from "@/lib/palette";

type Random = () => number;

/** Everything waiting to be started, optionally on one shelf (SPEC §10 Surprise me). */
export function surpriseCandidates(titles: readonly PaletteTitle[], categoryId: string | null): PaletteTitle[] {
  return titles.filter((title) => title.status === "planned" && (!categoryId || title.category_id === categoryId));
}

/** A random pick, never the one just shown when there's anything else to choose. */
export function pickSurprise(candidates: readonly PaletteTitle[], avoid: string | null = null, random: Random = Math.random): PaletteTitle | null {
  if (candidates.length === 0) return null;
  const pool = candidates.length > 1 && avoid ? candidates.filter((title) => title.id !== avoid) : candidates;
  return pool[Math.floor(random() * pool.length)] ?? pool[0];
}

function randomFrame(candidates: readonly PaletteTitle[], previous: PaletteTitle | undefined, random: Random) {
  const pool = candidates.length > 1 ? candidates.filter((title) => title.id !== previous?.id) : candidates;
  return pool[Math.floor(random() * pool.length)] ?? candidates[0];
}

/**
 * The covers the reel spins past: `count` before the pick lands in the gate,
 * then a few after it so the strip stays full on both sides. Neighbours differ
 * when there are at least two candidates, so the reel visibly moves.
 */
export function reelFrames(
  candidates: readonly PaletteTitle[],
  pick: PaletteTitle,
  count = 16,
  random: Random = Math.random,
  after = 3,
): { frames: PaletteTitle[]; pickIndex: number } {
  const frames: PaletteTitle[] = [];
  for (let index = 0; index < count - 1; index += 1) frames.push(randomFrame(candidates, frames[index - 1], random));
  // The frame before the pick shouldn't be the pick, or the landing looks like a stall.
  if (candidates.length > 1 && frames.at(-1)?.id === pick.id) {
    frames[frames.length - 1] = candidates.find((title) => title.id !== pick.id) ?? pick;
  }
  const pickIndex = frames.push(pick) - 1;
  for (let index = 0; index < after; index += 1) frames.push(randomFrame(candidates, frames.at(-1), random));
  return { frames, pickIndex };
}
