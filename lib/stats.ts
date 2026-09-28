/**
 * The numbers behind /stats. Pure, like lib/wrapped: rows in, claims out, so
 * the awkward parts are all testable.
 *
 * The same honesty rule as Wrapped (SPEC §15). A finish date only exists for
 * titles finished inside the app; an imported library arrives with hundreds of
 * completions that have none. Those never get placed in a month. They're
 * counted on a line of their own instead.
 */
import type { Item } from "@/lib/items";
import { isWatchedKind, screenTime, type ScreenTime } from "@/lib/screen-time";
import type { CategoryKind } from "@/lib/status";

export type StatsItem = Pick<
  Item,
  | "id"
  | "title"
  | "category_id"
  | "status"
  | "rating"
  | "genres"
  | "progress_current"
  | "progress_total"
  | "runtime_minutes"
  | "format"
  | "finished_at"
  | "community_score"
  | "source"
  | "cover_url"
>;

export type StatsShelf = { id: string; name: string; slug: string; kind: CategoryKind; color: string };

/** How many months the finishes chart looks back, this one included. */
export const MONTHS_SHOWN = 12;

/** Fewer titles scored by both you and the crowd than this, and an average would be noise. */
export const CROWD_MIN = 3;

/** A disagreement worth naming: 15 points is a 7 against a 85, give or take. */
export const DISAGREEMENT_MIN = 15;
const DISAGREEMENTS_SHOWN = 4;

/** A genre's average rating means something from this many rated titles. */
export const GENRE_MIN_RATED = 3;
const GENRES_SHOWN = 8;

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** "March". Spelled out here, since locales disagree. */
export function monthName(month: number): string {
  return MONTH_NAMES[month];
}

/** "1,204": counts get grouped, always the same way whatever the server's locale. */
export function formatCount(count: number): string {
  return new Intl.NumberFormat("en-US").format(count);
}

/** "7.4": one place, and never "7.0" for a whole number. */
export function formatAverage(average: number): string {
  return String(Math.round(average * 10) / 10);
}

function mean(values: readonly number[]): number | null {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** The shelf a `?shelf=` slug names, or null for everything (an unknown slug included). */
export function pickShelf(shelves: readonly StatsShelf[], slug: string | undefined): StatsShelf | null {
  return shelves.find((shelf) => shelf.slug === slug) ?? null;
}

export type Headline = {
  titles: number;
  inProgress: number;
  planned: number;
  finished: number;
  finishedThisYear: number;
  rated: number;
  average: number | null;
  /** Null when nothing in view is watched at all (only games and custom shelves). */
  time: ScreenTime | null;
};

/** The four numbers across the top. `kinds` maps a shelf id to its kind. */
export function headline(items: readonly StatsItem[], kinds: ReadonlyMap<string, CategoryKind>, today: Date): Headline {
  const year = String(today.getFullYear());
  const completed = items.filter((item) => item.status === "completed");
  const ratings = items.flatMap((item) => (item.rating === null ? [] : [item.rating]));
  const watched = items.flatMap((item) => {
    const kind = kinds.get(item.category_id);
    return kind && isWatchedKind(kind) ? [{ ...item, kind }] : [];
  });

  return {
    titles: items.length,
    inProgress: items.filter((item) => item.status === "in_progress").length,
    planned: items.filter((item) => item.status === "planned").length,
    finished: completed.length,
    finishedThisYear: completed.filter((item) => item.finished_at?.startsWith(year)).length,
    rated: ratings.length,
    average: mean(ratings),
    time: watched.length > 0 ? screenTime(watched) : null,
  };
}

export type MonthColumn = {
  /** "2026-03", which is also how `finished_at` begins. */
  key: string;
  year: number;
  /** 0 to 11. */
  month: number;
  count: number;
  /** Shelf id → finishes that month, for the breakdown on hover. */
  byShelf: Record<string, number>;
};

export type Finishes = {
  months: MonthColumn[];
  /** Finished inside the window. */
  total: number;
  /** Completed with no date: imported already watched, never placed in a month. */
  undated: number;
  /** The busiest month; the latest one when several tie. Null when the window is empty. */
  peak: MonthColumn | null;
};

/**
 * Finishes per month for the last `MONTHS_SHOWN` months, this one last.
 * `finished_at` is a plain date, so its month is read off the string: no
 * timezone can move a title finished on the 1st into the month before.
 */
export function finishedByMonth(items: readonly StatsItem[], today: Date): Finishes {
  const months: MonthColumn[] = Array.from({ length: MONTHS_SHOWN }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (MONTHS_SHOWN - 1 - index), 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    return { key: `${year}-${String(month + 1).padStart(2, "0")}`, year, month, count: 0, byShelf: {} };
  });
  const byKey = new Map(months.map((column) => [column.key, column]));

  let undated = 0;
  for (const item of items) {
    if (item.status !== "completed") continue;
    if (!item.finished_at) {
      undated += 1;
      continue;
    }
    const column = byKey.get(item.finished_at.slice(0, 7));
    if (!column) continue;
    column.count += 1;
    column.byShelf[item.category_id] = (column.byShelf[item.category_id] ?? 0) + 1;
  }

  const total = months.reduce((sum, column) => sum + column.count, 0);
  const peak = total === 0 ? null : months.reduce((best, column) => (column.count >= best.count ? column : best));
  return { months, total, undated, peak };
}

export type Ratings = {
  /** One entry per score, 1 to 10, zeros included. */
  scores: { score: number; count: number }[];
  rated: number;
  average: number | null;
  /** The score given most; the higher one when two tie. */
  mode: number | null;
  /** Finished and never scored: the nudge under the chart. */
  unratedFinished: number;
};

export function ratingSpread(items: readonly StatsItem[]): Ratings {
  const scores = Array.from({ length: 10 }, (_, index) => ({ score: index + 1, count: 0 }));
  const given: number[] = [];
  for (const item of items) {
    if (item.rating === null) continue;
    scores[item.rating - 1].count += 1;
    given.push(item.rating);
  }

  const mode = given.length === 0 ? null : scores.reduce((best, entry) => (entry.count >= best.count ? entry : best)).score;
  return {
    scores,
    rated: given.length,
    average: mean(given),
    mode,
    unratedFinished: items.filter((item) => item.status === "completed" && item.rating === null).length,
  };
}

export type Disagreement = {
  id: string;
  title: string;
  categoryId: string;
  coverUrl: string | null;
  /** Your score, 1 to 10. */
  rating: number;
  /** The provider's, 0 to 100. */
  community: number;
  source: StatsItem["source"];
  /** Your score x 10, minus theirs: above zero, you liked it more. */
  gap: number;
};

export type Crowd = {
  /** Titles scored by both you and a provider. */
  pairs: number;
  /** The average gap, rounded. Null under `CROWD_MIN` pairs. */
  gap: number | null;
  /** The biggest arguments, biggest first. */
  disagreements: Disagreement[];
};

/**
 * Your scores against AniList's, TMDB's and IGDB's. Yours are whole numbers
 * out of 10 and theirs are out of 100, so an 8 counts as 80.
 */
export function crowdGap(items: readonly StatsItem[]): Crowd {
  const pairs: Disagreement[] = items.flatMap((item) =>
    item.rating === null || item.community_score === null
      ? []
      : [
          {
            id: item.id,
            title: item.title,
            categoryId: item.category_id,
            coverUrl: item.cover_url,
            rating: item.rating,
            community: item.community_score,
            source: item.source,
            gap: item.rating * 10 - item.community_score,
          },
        ],
  );

  const average = mean(pairs.map((pair) => pair.gap));
  return {
    pairs: pairs.length,
    gap: pairs.length >= CROWD_MIN && average !== null ? Math.round(average) : null,
    disagreements: pairs
      .filter((pair) => Math.abs(pair.gap) >= DISAGREEMENT_MIN)
      // Alphabetical under the size, so an equal gap doesn't reorder itself.
      .sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap) || a.title.localeCompare(b.title))
      .slice(0, DISAGREEMENTS_SHOWN),
  };
}

/**
 * One name per genre, whichever provider it came from. TMDB's TV list pairs
 * genres up ("Sci-Fi & Fantasy", "Action & Adventure"), which count as both,
 * and its film list says "Science Fiction" where AniList says "Sci-Fi".
 */
export function genreNames(genre: string): string[] {
  return genre
    .split(" & ")
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => (name === "Science Fiction" ? "Sci-Fi" : name));
}

export type GenreRow = {
  name: string;
  titles: number;
  rated: number;
  /** Null under `GENRE_MIN_RATED` rated titles. */
  average: number | null;
};

export type Genres = {
  /** The most-tracked genres, most first. */
  rows: GenreRow[];
  /** The best-rated genre with enough scores to mean it, whether or not it made the list. */
  favourite: GenreRow | null;
  /** Titles with no genres at all: hand-added, mostly. */
  untagged: number;
};

export function genreTable(items: readonly StatsItem[]): Genres {
  const tally = new Map<string, { titles: number; ratings: number[] }>();
  let untagged = 0;

  for (const item of items) {
    const names = new Set(item.genres.flatMap(genreNames));
    if (names.size === 0) untagged += 1;
    for (const name of names) {
      const entry = tally.get(name) ?? { titles: 0, ratings: [] };
      entry.titles += 1;
      if (item.rating !== null) entry.ratings.push(item.rating);
      tally.set(name, entry);
    }
  }

  const all: GenreRow[] = [...tally.entries()].map(([name, entry]) => ({
    name,
    titles: entry.titles,
    rated: entry.ratings.length,
    average: entry.ratings.length >= GENRE_MIN_RATED ? mean(entry.ratings) : null,
  }));

  const favourite = all
    .filter((row) => row.average !== null)
    // Ties go to the genre with more behind its average, then alphabetical.
    .sort((a, b) => b.average! - a.average! || b.rated - a.rated || a.name.localeCompare(b.name))[0];

  return {
    rows: [...all].sort((a, b) => b.titles - a.titles || a.name.localeCompare(b.name)).slice(0, GENRES_SHOWN),
    favourite: favourite ?? null,
    untagged,
  };
}

/** A round top for a count axis, with a whole-number halfway tick: 14 → 20, 9 → 10, 3 → 4, 1 → 2. */
export function niceCeiling(max: number): number {
  const half = Math.max(max / 2, 1);
  const magnitude = 10 ** Math.floor(Math.log10(half));
  const step = [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= half)!;
  return step * 2;
}
