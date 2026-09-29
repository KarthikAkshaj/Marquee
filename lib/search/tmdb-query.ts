/**
 * Telling namesakes apart on TMDB, where 344 films are called something with
 * "Darling" in it. A year or a language at the end of what you typed narrows
 * the search ("darling 2010", "darling telugu", "dune (1984)"), and titles
 * named exactly what you typed come first, best known first. Pure, so the
 * rules are testable without a network.
 */

/** Languages you might add to a search, by the ISO 639-1 code TMDB files films under. */
export const QUERY_LANGUAGES: Readonly<Record<string, string>> = {
  arabic: "ar",
  bengali: "bn",
  cantonese: "cn",
  chinese: "zh",
  danish: "da",
  dutch: "nl",
  english: "en",
  filipino: "tl",
  french: "fr",
  german: "de",
  gujarati: "gu",
  hindi: "hi",
  indonesian: "id",
  italian: "it",
  japanese: "ja",
  kannada: "kn",
  korean: "ko",
  malayalam: "ml",
  mandarin: "zh",
  marathi: "mr",
  norwegian: "no",
  persian: "fa",
  polish: "pl",
  portuguese: "pt",
  punjabi: "pa",
  russian: "ru",
  spanish: "es",
  swedish: "sv",
  tagalog: "tl",
  tamil: "ta",
  telugu: "te",
  thai: "th",
  turkish: "tr",
  urdu: "ur",
};

/** The first year TMDB has films from. */
const FIRST_YEAR = 1870;

export type TmdbHint = {
  /** What to search for, without the hints. */
  text: string;
  year?: number;
  /** An ISO 639-1 code: the language the title was made in. */
  language?: string;
};

/**
 * A year and a language at the end of a search, in either order, or null
 * when there's neither. A year has to be one films could come from, and
 * something has to be left to search for, so "1917" is a title, not a year.
 */
export function readTmdbHint(query: string, thisYear = new Date().getFullYear()): TmdbHint | null {
  const words = query.trim().split(/\s+/);
  const hint: TmdbHint = { text: "" };

  for (let pass = 0; pass < 2 && words.length > 1; pass += 1) {
    const last = words[words.length - 1];
    const year = /^\(?(\d{4})\)?$/.exec(last);
    const language = QUERY_LANGUAGES[last.toLowerCase()];
    if (year && !hint.year && Number(year[1]) >= FIRST_YEAR && Number(year[1]) <= thisYear + 2) {
      hint.year = Number(year[1]);
      words.pop();
    } else if (language && !hint.language) {
      hint.language = language;
      words.pop();
    } else {
      break;
    }
  }

  if (!hint.year && !hint.language) return null;
  hint.text = words.join(" ");
  return hint;
}

/** "Amélie", "amelie" and "AMÉLIE!" are the same title. */
export function titleKey(title: string): string {
  return title
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

type Ranked = { title: string; originalTitle?: string | null; votes: number };

/**
 * Titles named exactly what was typed first, the most voted-on first; then
 * the rest in TMDB's own order. TMDB's order alone puts Strange Darling and
 * Don't Worry Darling above six films called just "Darling".
 */
export function rankNamesakes<T>(entries: readonly T[], typed: string, describe: (entry: T) => Ranked): T[] {
  const key = titleKey(typed);
  const exact = (entry: T) => {
    const { title, originalTitle } = describe(entry);
    return titleKey(title) === key || (originalTitle ? titleKey(originalTitle) === key : false);
  };
  const named = entries.filter(exact).sort((a, b) => describe(b).votes - describe(a).votes);
  return [...named, ...entries.filter((entry) => !exact(entry))];
}
