import type { CategoryKind } from "@/lib/status";

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
  /** Icons and accents in the category's colour. */
  text: string;
};

// Full class names spelled out so Tailwind can see them at build time.
const STYLES: Record<CategoryColor, CategoryStyle> = {
  amber: {
    dot: "bg-cat-amber",
    dotDim: "bg-cat-amber/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-amber)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-amber/12",
    text: "text-cat-amber",
  },
  crimson: {
    dot: "bg-cat-crimson",
    dotDim: "bg-cat-crimson/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-crimson)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-crimson/12",
    text: "text-cat-crimson",
  },
  violet: {
    dot: "bg-cat-violet",
    dotDim: "bg-cat-violet/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-violet)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-violet/12",
    text: "text-cat-violet",
  },
  teal: {
    dot: "bg-cat-teal",
    dotDim: "bg-cat-teal/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-teal)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-teal/12",
    text: "text-cat-teal",
  },
  sky: {
    dot: "bg-cat-sky",
    dotDim: "bg-cat-sky/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-sky)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-sky/12",
    text: "text-cat-sky",
  },
  rose: {
    dot: "bg-cat-rose",
    dotDim: "bg-cat-rose/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-rose)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-rose/12",
    text: "text-cat-rose",
  },
  lime: {
    dot: "bg-cat-lime",
    dotDim: "bg-cat-lime/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-lime)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-lime/12",
    text: "text-cat-lime",
  },
  sand: {
    dot: "bg-cat-sand",
    dotDim: "bg-cat-sand/35",
    glow: "shadow-[0_0_10px_color-mix(in_oklab,var(--color-cat-sand)_40%,transparent)]",
    activeBg: "aria-[current=page]:bg-cat-sand/12",
    text: "text-cat-sand",
  },
};

export function isCategoryColor(value: string): value is CategoryColor {
  return (CATEGORY_COLORS as readonly string[]).includes(value);
}

export function categoryStyle(color: string): CategoryStyle {
  return STYLES[isCategoryColor(color) ? color : "amber"];
}

/** Lucide icon names a category can use (stored in the DB, SPEC §5). The first four are the seeded ones. */
export const CATEGORY_ICONS = [
  "sparkles",
  "clapperboard",
  "tv",
  "gamepad-2",
  "film",
  "popcorn",
  "drama",
  "book-open",
  "library",
  "music",
  "headphones",
  "mic",
  "podcast",
  "swords",
  "ghost",
  "rocket",
  "heart",
  "trophy",
] as const;

export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export const CATEGORY_KINDS = ["anime", "movie", "series", "game", "custom"] as const satisfies readonly CategoryKind[];

/** What each kind is called when you pick one. Its status words come from lib/status. */
export const KIND_NAMES: Record<CategoryKind, string> = {
  anime: "Anime",
  movie: "Movie",
  series: "Series",
  game: "Game",
  custom: "Custom",
};

/** "Big Screen: Classics" → "big-screen-classics". Falls back to "list" when nothing usable is left. */
export function slugify(name: string) {
  const slug = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return slug || "list";
}

/** The slug for `name`, with -2, -3… added if another of the viewer's categories already has it. */
export function uniqueSlug(name: string, taken: Iterable<string>) {
  const used = new Set(taken);
  const base = slugify(name);
  if (!used.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
}

export function isCategoryIcon(value: string): value is CategoryIcon {
  return (CATEGORY_ICONS as readonly string[]).includes(value);
}

type Orderable = { id: string; position: number };

export type CategoryChange<T> =
  | { type: "update"; id: string; patch: Partial<T> }
  | { type: "reorder"; ids: string[] }
  | { type: "remove"; id: string };

/** One settings edit applied ahead of the save. Reordering rewrites positions to match. */
export function applyCategoryChange<T extends Orderable>(list: T[], change: CategoryChange<T>): T[] {
  switch (change.type) {
    case "update":
      return list.map((category) => (category.id === change.id ? { ...category, ...change.patch } : category));
    case "remove":
      return list.filter((category) => category.id !== change.id);
    case "reorder": {
      const byId = new Map(list.map((category) => [category.id, category]));
      const ordered = change.ids.flatMap((id) => byId.get(id) ?? []);
      // Anything the new order didn't mention keeps its place at the end.
      const rest = list.filter((category) => !change.ids.includes(category.id));
      return [...ordered, ...rest].map((category, position) => ({ ...category, position }));
    }
  }
}
