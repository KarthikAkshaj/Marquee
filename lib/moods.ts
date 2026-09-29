/**
 * Moods on For you (SPEC §20): "War & military", "Romance", and so on. Each
 * one says what to ask every provider for (hand-picked genre, tag, theme and
 * keyword ids, checked against the live APIs), which of your own genres count
 * for it, and which typed words mean it. Pure and safe in the browser: the
 * chips and "Next from your list" work from this alone.
 */
import type { AniListFilter, DiscoverFilter, IgdbFilter, SearchKind, TmdbFilter } from "@/lib/search/types";
import { genreNames } from "@/lib/stats";

export type Mood = {
  slug: string;
  label: string;
  /** Typed words that mean this mood ("military" is War & military). */
  words: readonly string[];
  /** Your own titles' genres that count for it, as Stats spells them. */
  genres: readonly string[];
  anilist: AniListFilter;
  tmdbMovie: TmdbFilter;
  tmdbTv: TmdbFilter;
  igdb: IgdbFilter;
};

// TMDB's keywords, where a genre is missing or too broad: military 162365,
// romance 9840, horror 315058, and feel good 383896, feelgood 275276,
// wholesome 335803, heartwarming 319357. IGDB's keywords: cozy 24685,
// wholesome 23931.
export const MOODS: readonly Mood[] = [
  {
    slug: "action",
    label: "Action",
    words: ["action", "fights", "fighting"],
    genres: ["Action", "Shooter", "Fighting", "Hack and slash/Beat 'em up"],
    anilist: { genres: ["Action"] },
    tmdbMovie: { genres: [28] },
    tmdbTv: { genres: [10759] },
    igdb: { themes: [1] },
  },
  {
    slug: "war",
    label: "War & military",
    words: ["war", "military", "army", "soldiers", "combat", "war and military", "war & military"],
    genres: ["War"],
    anilist: { tags: ["Military", "War"] },
    tmdbMovie: { genres: [10752] },
    tmdbTv: { genres: [10768] },
    igdb: { themes: [39] },
  },
  {
    slug: "romance",
    label: "Romance",
    words: ["romance", "romantic", "love", "love story", "romcom", "rom-com"],
    genres: ["Romance"],
    anilist: { genres: ["Romance"] },
    tmdbMovie: { genres: [10749] },
    tmdbTv: { keywords: [9840] },
    igdb: { themes: [44] },
  },
  {
    slug: "comedy",
    label: "Comedy",
    words: ["comedy", "funny", "laughs", "comedies"],
    genres: ["Comedy"],
    anilist: { genres: ["Comedy"] },
    tmdbMovie: { genres: [35] },
    tmdbTv: { genres: [35] },
    igdb: { themes: [27] },
  },
  {
    slug: "horror",
    label: "Horror",
    words: ["horror", "scary", "creepy", "spooky"],
    genres: ["Horror"],
    anilist: { genres: ["Horror"] },
    tmdbMovie: { genres: [27] },
    tmdbTv: { keywords: [315058] },
    igdb: { themes: [19] },
  },
  {
    slug: "mystery",
    label: "Mystery",
    words: ["mystery", "mysteries", "whodunit", "detective"],
    genres: ["Mystery"],
    anilist: { genres: ["Mystery"] },
    tmdbMovie: { genres: [9648] },
    tmdbTv: { genres: [9648] },
    igdb: { themes: [43] },
  },
  {
    slug: "sci-fi",
    label: "Sci-Fi",
    words: ["sci-fi", "scifi", "sci fi", "science fiction", "space"],
    genres: ["Sci-Fi"],
    anilist: { genres: ["Sci-Fi"] },
    tmdbMovie: { genres: [878] },
    tmdbTv: { genres: [10765] },
    igdb: { themes: [18] },
  },
  {
    slug: "feel-good",
    label: "Feel-good",
    words: ["feel-good", "feel good", "feelgood", "wholesome", "cozy", "cosy", "heartwarming", "comfy", "comfort"],
    genres: ["Slice of Life", "Family"],
    anilist: { tags: ["Iyashikei"] },
    tmdbMovie: { keywords: [383896, 275276, 335803, 319357] },
    tmdbTv: { keywords: [383896, 275276, 335803, 319357] },
    igdb: { keywords: [24685, 23931] },
  },
];

/** The longest word the box takes. */
export const MOOD_WORD_MAX = 40;

/**
 * A typed word as For you keeps it: lower case, single spaces, letters,
 * digits and a little punctuation. Null when there's nothing usable.
 */
export function cleanMoodWord(raw: string | null | undefined): string | null {
  const word = (raw ?? "").trim().replace(/\s+/g, " ").toLowerCase();
  if (word.length < 2 || word.length > MOOD_WORD_MAX) return null;
  return /^[\p{L}\p{N}][\p{L}\p{N} '&-]*$/u.test(word) ? word : null;
}

/** What `?mood=` means: one of the moods, a word of your own, or nothing. */
export type MoodChoice = { mood: Mood; word: null } | { mood: null; word: string } | null;

export function readMood(raw: string | null | undefined): MoodChoice {
  const word = cleanMoodWord(raw);
  if (!word) return null;
  const mood = MOODS.find((entry) => entry.slug === word || entry.words.includes(word));
  return mood ? { mood, word: null } : { mood: null, word };
}

/** How `?mood=` spells a choice: the slug for a mood, the word itself otherwise. */
export function moodParam(choice: MoodChoice): string | null {
  if (!choice) return null;
  return choice.mood ? choice.mood.slug : choice.word;
}

/** "War & military", or the typed word in quotes. */
export function moodLabel(choice: NonNullable<MoodChoice>): string {
  return choice.mood ? choice.mood.label : `“${choice.word}”`;
}

const wholeWord = (text: string, word: string) =>
  new RegExp(`(^|[^\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}($|[^\\p{L}\\p{N}])`, "u").test(text);

/**
 * Whether a title of yours fits: one of the mood's genres, or for a typed
 * word, a genre with that word in it. Only genres are kept on your titles,
 * so a word that's a tag or keyword elsewhere ("heist") matches nothing here.
 */
export function fitsMood(genres: readonly string[], choice: MoodChoice): boolean {
  if (!choice) return true;
  const names = genres.flatMap(genreNames);
  if (choice.mood) return names.some((name) => choice.mood.genres.includes(name));
  return names.some((name) => wholeWord(name.toLowerCase(), choice.word));
}

/** What a mood asks the provider behind this kind of shelf for. */
export function moodFilter(mood: Mood, kind: SearchKind): DiscoverFilter {
  switch (kind) {
    case "anime":
      return { kind, anilist: mood.anilist };
    case "movie":
      return { kind, tmdb: mood.tmdbMovie };
    case "series":
      return { kind, tmdb: mood.tmdbTv };
    case "game":
      return { kind, igdb: mood.igdb };
  }
}

/** For you's address for a shelf and a mood, leaving out whichever isn't set. */
export function forYouHref({ shelf, mood }: { shelf?: string | null; mood?: string | null }): string {
  const params = new URLSearchParams();
  if (shelf) params.set("shelf", shelf);
  if (mood) params.set("mood", mood);
  const query = params.toString();
  return query ? `/for-you?${query}` : "/for-you";
}
