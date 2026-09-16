/** Category colours are stored as token names, never hex (SPEC §5, §9.2). */
export const CATEGORY_COLORS = [
  "amber",
  "crimson",
  "violet",
  "teal",
  "sky",
  "rose",
  "lime",
  "sand",
] as const;

export type CategoryColor = (typeof CATEGORY_COLORS)[number];

type CategoryStyle = {
  /** The dot. */
  dot: string;
  /** The dot on a shelf with nothing on it yet — the lights are off. */
  dotDim: string;
  /** Soft light around the dot. */
  glow: string;
  /** Row background when this category's page is open (nav links set aria-current). */
  activeBg: string;
};

// Full class names spelled out so Tailwind can see them at build time.
const STYLES: Record<CategoryColor, CategoryStyle> = {
  amber: {
    dot: "bg-cat-amber",
    dotDim: "bg-cat-amber/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-amber)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-amber/12",
  },
  crimson: {
    dot: "bg-cat-crimson",
    dotDim: "bg-cat-crimson/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-crimson)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-crimson/12",
  },
  violet: {
    dot: "bg-cat-violet",
    dotDim: "bg-cat-violet/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-violet)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-violet/12",
  },
  teal: {
    dot: "bg-cat-teal",
    dotDim: "bg-cat-teal/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-teal)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-teal/12",
  },
  sky: {
    dot: "bg-cat-sky",
    dotDim: "bg-cat-sky/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-sky)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-sky/12",
  },
  rose: {
    dot: "bg-cat-rose",
    dotDim: "bg-cat-rose/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-rose)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-rose/12",
  },
  lime: {
    dot: "bg-cat-lime",
    dotDim: "bg-cat-lime/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-lime)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-lime/12",
  },
  sand: {
    dot: "bg-cat-sand",
    dotDim: "bg-cat-sand/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-sand)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-sand/12",
  },
};

export function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

export function categoryStyle(color: string): CategoryStyle {
  return STYLES[isCategoryColor(color) ? color : "amber"];
}
