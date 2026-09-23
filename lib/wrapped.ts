/**
 * The year in numbers, for /wrapped. Pure: it takes rows and returns what the
 * frames claim, so the awkward parts are all testable.
 *
 * Two clocks run here and they must not be blurred. `created_at` says when a
 * title arrived in Marquee and is right for everyone. `finished_at` says when
 * it was finished and only exists for titles finished inside the app, so an
 * imported library has hundreds of completions with no date. Frames worded
 * "added" use the first; frames worded "finished" use the second and leave the
 * undated ones to a line of their own.
 */
import type { Item } from "@/lib/items";
import type { CategoryKind } from "@/lib/status";

/** An item plus the shelf it sits on, which is where its kind comes from. */
export type WrappedItem = Pick<
  Item,
  "title" | "status" | "rating" | "genres" | "progress_current" | "created_at" | "finished_at" | "cover_url" | "accent_color"
> & { kind: CategoryKind; categoryName: string };

/**
 * The year /wrapped looks back on. In January that is still the year just gone:
 * nobody wants a review of the five days they have had so far.
 */
export function wrappedYear(now = new Date()): number {
  return now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
}

/** December and January, the stretch where a look back earns a spot on Home. */
export function wrappedInSeason(now = new Date()): boolean {
  const month = now.getMonth();
  return month === 11 || month === 0;
}

/** Under this, there isn't a year to look back on yet. */
export const ENOUGH_TITLES = 5;

/** How many genres get their own slice before the rest become "other". */
const GENRE_SLICES = 5;

/**
 * No runtime is stored on an item, so hours are an estimate and the copy says
 * so out loud: a TV anime episode runs about 24 minutes, an hour-long series
 * episode about 42, a feature about 115.
 */
const MINUTES = { anime: 24, series: 42, movie: 115 } as const;

export type GenreSlice = { name: string; count: number; share: number };

export type TopTitle = {
  title: string;
  rating: number;
  categoryName: string;
  cover_url: string | null;
  accent_color: string | null;
};

export type Wrapped = {
  year: number;
  /** Titles that arrived in Marquee this year. True for everyone. */
  added: number;
  /** Finished inside the app this year, so carrying a date. */
  finished: number;
  /** Completed, but from before Marquee: no date to place them in a year. */
  alreadyWatched: number;
  /** Episodes inside the titles finished this year. Progress keeps no history. */
  episodes: number;
  /** Rounded, and only ever watching: games count no progress at all. */
  hours: number;
  genres: GenreSlice[];
  top: TopTitle | null;
  /** The colour of the year, taken from the cover of its best title. */
  accent: string | null;
  /** False when there isn't enough of a year to show. */
  enough: boolean;
};

/**
 * The year a timestamp falls in. Read in the server's zone, which is UTC in
 * production: a title added within a few hours of new year can land either
 * side of it, and we don't store a viewer's zone to do better.
 */
function yearOf(timestamp: string | null): number | null {
  if (!timestamp) return null;
  const year = new Date(timestamp).getFullYear();
  return Number.isNaN(year) ? null : year;
}

function countGenres(items: WrappedItem[]): GenreSlice[] {
  const tally = new Map<string, number>();
  for (const item of items) {
    for (const genre of item.genres) tally.set(genre, (tally.get(genre) ?? 0) + 1);
  }
  const total = [...tally.values()].reduce((sum, n) => sum + n, 0);
  if (total === 0) return [];

  return [...tally.entries()]
    // Alphabetical under the count, so an equal tally doesn't reorder itself.
    .sort(([aName, a], [bName, b]) => b - a || aName.localeCompare(bName))
    .slice(0, GENRE_SLICES)
    .map(([name, count]) => ({ name, count, share: count / total }));
}

/** The best-rated of the year's titles. Unrated titles can't win. */
function pickTop(items: WrappedItem[]): TopTitle | null {
  const rated = items.filter((item) => item.rating !== null);
  if (rated.length === 0) return null;

  const best = rated.reduce((winner, item) => {
    if (item.rating! !== winner.rating!) return item.rating! > winner.rating! ? item : winner;
    // Same score: the one finished later, then alphabetical, so it never flickers.
    const byDate = (item.finished_at ?? "").localeCompare(winner.finished_at ?? "");
    return byDate !== 0 ? (byDate > 0 ? item : winner) : item.title.localeCompare(winner.title) < 0 ? item : winner;
  });

  return {
    title: best.title,
    rating: best.rating!,
    categoryName: best.categoryName,
    cover_url: best.cover_url,
    accent_color: best.accent_color,
  };
}

/** Episodes and rough watching time inside a set of finished titles. */
function watchTime(finished: WrappedItem[]) {
  let episodes = 0;
  let minutes = 0;

  for (const item of finished) {
    if (item.kind === "anime" || item.kind === "series") {
      episodes += item.progress_current;
      minutes += item.progress_current * MINUTES[item.kind];
    } else if (item.kind === "movie") {
      minutes += MINUTES.movie;
    }
    // Games and custom shelves count no progress, so they can't be timed.
  }

  return { episodes, hours: Math.round(minutes / 60) };
}

/** Everything /wrapped shows, from one year's worth of rows. */
export function summarise(items: WrappedItem[], year: number): Wrapped {
  const arrived = items.filter((item) => yearOf(item.created_at) === year);
  const completed = items.filter((item) => item.status === "completed");
  const finished = completed.filter((item) => yearOf(item.finished_at) === year);
  const { episodes, hours } = watchTime(finished);
  const top = pickTop(arrived);

  return {
    year,
    added: arrived.length,
    finished: finished.length,
    alreadyWatched: completed.filter((item) => item.finished_at === null).length,
    episodes,
    hours,
    genres: countGenres(arrived),
    top,
    accent: top?.accent_color ?? null,
    enough: arrived.length >= ENOUGH_TITLES,
  };
}
