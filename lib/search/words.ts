/**
 * Matching a typed word to a provider's own vocabulary (SPEC §20): its
 * genres, tags, themes and keywords. Exact names only, give or take a plural,
 * so "military" never pulls in "military spoof". Pure, so the rules are
 * testable without a network.
 */

/** "zombies" also tries "zombie", and "sport" also tries "sports". */
export function wordForms(word: string): string[] {
  const clean = word.trim().toLowerCase();
  const other = clean.endsWith("s") ? clean.slice(0, -1) : `${clean}s`;
  return other.length > 1 ? [clean, other] : [clean];
}

/**
 * The names that are this word, ignoring case and plurals. A paired name
 * ("Sci-Fi & Fantasy", "Action & Adventure") matches either half.
 */
export function namesMatching<T extends { name: string }>(entries: readonly T[], word: string): T[] {
  const forms = new Set(wordForms(word));
  return entries.filter((entry) =>
    [entry.name, ...entry.name.split(" & ")].some((part) => forms.has(part.trim().toLowerCase())),
  );
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Names with the word in them as a whole word ("loop" finds "Time Loop"),
 * for when nothing is named it exactly. A few at most, the shortest first,
 * since the shortest is the closest.
 */
export function namesContaining(names: readonly string[], word: string, limit = 3): string[] {
  const patterns = wordForms(word).map((form) => new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRegExp(form)}($|[^\\p{L}\\p{N}])`, "iu"));
  return names
    .filter((name) => patterns.some((pattern) => pattern.test(name)))
    .sort((a, b) => a.length - b.length || a.localeCompare(b))
    .slice(0, limit);
}
