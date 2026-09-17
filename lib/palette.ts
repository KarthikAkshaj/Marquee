import type { Item } from "@/lib/items";
import type { CategoryKind } from "@/lib/status";

/** A shelf as the palette needs it. */
export type PaletteCategory = { id: string; name: string; slug: string; color: string; icon: string; kind: CategoryKind };

/** One of the viewer's titles, light enough to load them all (GET /api/titles). */
export type PaletteTitle = Pick<
  Item,
  "id" | "title" | "status" | "year" | "cover_url" | "accent_color" | "source" | "external_id" | "category_id"
>;

/** Case, accents, curly quotes and extra spaces don't matter when matching. */
export function normaliseForMatch(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[’‘`]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The query's letters in order, close together and inside one word ("frrn"
 * in "frieren"), not scattered across the title ("dune" in "beyonD joUrNEy").
 */
function isCompactSubsequence(query: string, text: string) {
  const maxSpan = query.length * 2;
  for (let start = text.indexOf(query[0]); start >= 0; start = text.indexOf(query[0], start + 1)) {
    let at = 0;
    for (let index = start; index < text.length && index - start < maxSpan && text[index] !== " "; index += 1) {
      if (text[index] === query[at]) at += 1;
      if (at === query.length) return true;
    }
  }
  return false;
}

/**
 * How well a title matches what was typed; 0 means not at all. Whole title,
 * then the start, then the start of a word, then anywhere, then every word
 * somewhere, then initials ("jk" finds "Jujutsu Kaisen"), then (for 3+
 * letters) a typo-ish run of letters inside one word ("frrn").
 */
export function matchScore(query: string, text: string): number {
  const q = normaliseForMatch(query);
  const t = normaliseForMatch(text);
  if (!q) return 1;
  if (t === q) return 1000;
  if (t.startsWith(q)) return 900 - Math.min(t.length - q.length, 99);
  if (t.split(/[\s:·\-–—/(),.!?]+/).some((word) => word.startsWith(q))) return 700;
  const index = t.indexOf(q);
  if (index >= 0) return 500 - Math.min(index, 99);
  const words = q.split(" ");
  if (words.length > 1 && words.every((word) => t.includes(word))) return 300;
  const initials = t
    .split(/[\s:·\-–—/(),.!?]+/)
    .map((word) => word[0] ?? "")
    .join("");
  if (q.length >= 2 && !q.includes(" ") && initials.startsWith(q)) return 250;
  if (q.length >= 3 && !q.includes(" ") && isCompactSubsequence(q, t)) return 100;
  return 0;
}

/** Best matches first, ties keeping their original order (e.g. most recently updated). */
export function rankMatches<T>(query: string, entries: readonly T[], text: (entry: T) => string, limit: number): T[] {
  return entries
    .map((entry, index) => ({ entry, index, score: matchScore(query, text(entry)) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ entry }) => entry);
}

export type PaletteLink = {
  value: string;
  label: string;
  href: string;
  /** Extra words that should find it ("profile" finds Settings → Profile). */
  keywords: string[];
  category?: PaletteCategory;
};

/** Everywhere "Go to" can take you (SPEC §8.8). Import joins in Phase 4. */
export function paletteLinks(categories: readonly PaletteCategory[]): PaletteLink[] {
  return [
    { value: "go:home", label: "Home", href: "/home", keywords: ["continue", "stats"] },
    ...categories.map((category) => ({
      value: `go:category:${category.id}`,
      label: category.name,
      href: `/c/${encodeURIComponent(category.slug)}`,
      keywords: [category.kind],
      category,
    })),
    { value: "go:settings-profile", label: "Settings · Profile", href: "/settings/profile", keywords: ["avatar", "username", "photo"] },
    { value: "go:settings-categories", label: "Settings · Categories", href: "/settings/categories", keywords: ["lists", "shelves", "reorder"] },
    { value: "go:settings-account", label: "Settings · Account", href: "/settings/account", keywords: ["email", "sign out", "delete", "export"] },
  ];
}

/** "/c/anime" → "anime". */
export function categorySlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/c\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Where "Add" puts things: the shelf you're looking at, else the first shelf
 * that can be searched, else the first shelf at all.
 */
export function defaultAddTarget(categories: readonly PaletteCategory[], pathname: string): PaletteCategory | null {
  const slug = categorySlugFromPath(pathname);
  return (
    categories.find((category) => category.slug === slug) ??
    categories.find((category) => category.kind !== "custom") ??
    categories[0] ??
    null
  );
}

/** "/c/anime?item=…", the link that opens a title's sheet. */
export function titleHref(category: Pick<PaletteCategory, "slug">, id: string): string {
  return `/c/${encodeURIComponent(category.slug)}?item=${id}`;
}
