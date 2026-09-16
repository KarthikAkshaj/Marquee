/**
 * Poster-shaped light for anything without real cover art: the landing wall,
 * the landing mockup, and generated covers for manually added titles.
 * Never anyone's copyrighted posters.
 */
export type PosterTone =
  | "crimson"
  | "ember"
  | "violet"
  | "teal"
  | "rose"
  | "steel"
  | "moss"
  | "dust";

type Tone = {
  stops: [string, string, string];
  /** Where the middle stop sits, in %. */
  mid: number;
  /** Default angle from the design handoff. */
  angle: number;
  /** Soft coloured shadow under the poster. */
  glow: string;
};

const TONES: Record<PosterTone, Tone> = {
  crimson: { stops: ["#7A1720", "#35111A", "#120C10"], mid: 55, angle: 160, glow: "rgba(229,72,77,.26)" },
  ember: { stops: ["#6A4113", "#2C1D0E", "#100C09"], mid: 58, angle: 155, glow: "rgba(244,182,80,.24)" },
  violet: { stops: ["#3E2C66", "#1A1630", "#0D0C14"], mid: 55, angle: 165, glow: "rgba(167,139,250,.24)" },
  teal: { stops: ["#0F4A45", "#0D2426", "#090F10"], mid: 58, angle: 150, glow: "rgba(45,212,191,.22)" },
  rose: { stops: ["#4E2030", "#22111C", "#0E0A0E"], mid: 55, angle: 170, glow: "rgba(242,119,122,.2)" },
  steel: { stops: ["#22314F", "#131A2B", "#0A0C12"], mid: 58, angle: 155, glow: "rgba(140,155,255,.2)" },
  moss: { stops: ["#2A3D22", "#151F14", "#0A0D09"], mid: 58, angle: 160, glow: "rgba(111,221,168,.18)" },
  dust: { stops: ["#4A3A2C", "#231C16", "#0F0C0A"], mid: 58, angle: 150, glow: "rgba(244,182,80,.16)" },
};

const WALL_ORDER: PosterTone[] = ["crimson", "ember", "violet", "teal", "rose", "steel", "moss", "dust"];

export function posterGradient(tone: PosterTone, angle = TONES[tone].angle) {
  const { stops, mid } = TONES[tone];
  return `linear-gradient(${angle}deg,${stops[0]},${stops[1]} ${mid}%,${stops[2]})`;
}

export function posterGlow(tone: PosterTone) {
  return TONES[tone].glow;
}

export const POSTER_GRADIENTS = WALL_ORDER.map((tone) => posterGradient(tone));

/** One row of the drifting wall: eight tiles, rotated so rows don't line up. */
export function posterWallRow(offset: number) {
  return Array.from(
    { length: 8 },
    (_, index) => POSTER_GRADIENTS[(index + offset) % POSTER_GRADIENTS.length],
  );
}

/** Category colour token (stored in the DB) → the poster tone that matches it. */
const CATEGORY_TONE: Record<string, PosterTone> = {
  crimson: "crimson",
  amber: "ember",
  violet: "violet",
  teal: "teal",
  sky: "steel",
  rose: "rose",
  lime: "moss",
  sand: "dust",
};

/** FNV-1a: small, fast, stable across server and client. */
function hash(text: string) {
  let value = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    value ^= text.charCodeAt(i);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

/** Each tone's closest cousin, for a little borrowed light. */
const NEIGHBOUR: Record<PosterTone, PosterTone> = {
  crimson: "rose",
  rose: "crimson",
  ember: "dust",
  dust: "ember",
  violet: "steel",
  steel: "violet",
  teal: "moss",
  moss: "teal",
};

/**
 * A generated cover (SPEC §8.5): the category's colour leads, but every item
 * gets its own angle, depth and pool of light (a third borrow a neighbouring
 * hue), so a shelf of manual titles reads as a family rather than clones.
 */
export function generatedCover(itemId: string, categoryColor: string) {
  const tone = CATEGORY_TONE[categoryColor] ?? "ember";
  const { stops, mid } = TONES[tone];
  const seed = hash(itemId);

  const angle = 130 + (seed % 50);
  const depth = mid - 12 + ((seed >>> 6) % 24);
  const light = TONES[(seed >>> 11) % 3 === 0 ? NEIGHBOUR[tone] : tone].stops[0];
  const poolX = (seed >>> 14) % 100;
  const poolY = (seed >>> 21) % 55;

  return {
    background:
      `radial-gradient(85% 55% at ${poolX}% ${poolY}%,${light}B3,transparent 72%),` +
      `linear-gradient(${angle}deg,${stops[0]},${stops[1]} ${depth}%,${stops[2]})`,
    sheen: `radial-gradient(120% 80% at ${Math.min(poolX, 60)}% ${poolY}%,rgba(255,255,255,.08),transparent)`,
    glow: posterGlow(tone),
  };
}
