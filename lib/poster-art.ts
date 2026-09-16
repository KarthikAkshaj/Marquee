/**
 * Placeholder "cover" gradients from the design handoff. Used wherever the
 * marketing pages need poster-shaped light without real (copyrighted) posters.
 */
export const POSTER_GRADIENTS = [
  "linear-gradient(160deg,#7A1720,#35111A 55%,#120C10)", // crimson
  "linear-gradient(155deg,#6A4113,#2C1D0E 58%,#100C09)", // ember
  "linear-gradient(165deg,#3E2C66,#1A1630 55%,#0D0C14)", // violet
  "linear-gradient(150deg,#0F4A45,#0D2426 58%,#090F10)", // teal
  "linear-gradient(170deg,#4E2030,#22111C 55%,#0E0A0E)", // rose
  "linear-gradient(155deg,#22314F,#131A2B 58%,#0A0C12)", // steel
  "linear-gradient(160deg,#2A3D22,#151F14 58%,#0A0D09)", // moss
  "linear-gradient(150deg,#4A3A2C,#231C16 58%,#0F0C0A)", // dust
] as const;

export type PosterTone =
  | "crimson"
  | "ember"
  | "violet"
  | "teal"
  | "rose"
  | "steel"
  | "moss"
  | "dust";

const TONE_INDEX: Record<PosterTone, number> = {
  crimson: 0,
  ember: 1,
  violet: 2,
  teal: 3,
  rose: 4,
  steel: 5,
  moss: 6,
  dust: 7,
};

export function posterGradient(tone: PosterTone) {
  return POSTER_GRADIENTS[TONE_INDEX[tone]];
}

/** One row of the drifting wall: eight tiles, rotated so rows don't line up. */
export function posterWallRow(offset: number) {
  return Array.from(
    { length: 8 },
    (_, index) => POSTER_GRADIENTS[(index + offset) % POSTER_GRADIENTS.length],
  );
}
