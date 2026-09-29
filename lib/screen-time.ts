/**
 * How long things took to watch, shared by /wrapped and /stats so the two
 * never disagree about the same title.
 *
 * `runtime_minutes` is per episode for anything episodic and the whole thing
 * for a film (SPEC §15), so minutes are always episodes x runtime. Where a row
 * has no runtime (anything added by hand, or before runtimes were kept), a
 * rough figure stands in, and the copy says "roughly" either way.
 */
import type { Item } from "@/lib/items";
import { isReading, type CategoryKind } from "@/lib/status";

export type TimedItem = Pick<Item, "status" | "progress_current" | "progress_total" | "runtime_minutes" | "format"> & {
  kind: CategoryKind;
};

/**
 * The fallback when a row has no stored runtime. A TV anime episode runs
 * about 24 minutes, an hour-long series episode about 45, a live action
 * feature about 115, an anime film about 90.
 */
const MINUTES = { anime: 24, series: 45, movie: 115 } as const;
const ANIME_FILM_MINUTES = 90;

/**
 * One sitting, where the runtime is the whole picture rather than a figure per
 * episode. Anything added since runtimes were stored says so outright. Older
 * rows fall back to the shape of the shelf, and to the guess that an anime
 * with exactly one episode is probably a film and might be an OVA.
 */
export function isFeature(item: Pick<TimedItem, "format" | "kind" | "progress_total">): boolean {
  if (item.format) return item.format === "movie";
  return item.kind === "movie" || (item.kind === "anime" && item.progress_total === 1);
}

/**
 * How long a title takes: `sitting` is the film, or one episode; `whole` is
 * the film, or every episode when the count is known. `guessed` when a
 * fallback stood in for the runtime. Null for what no clock can time: games,
 * custom shelves, comics and novels.
 */
export type Length = { feature: boolean; sitting: number; whole: number | null; guessed: boolean };

export function lengthOf(item: Pick<TimedItem, "format" | "kind" | "progress_total" | "runtime_minutes">): Length | null {
  if (isReading(item.format) || !isWatchedKind(item.kind)) return null;
  const guessed = item.runtime_minutes === null;
  if (isFeature(item)) {
    const minutes = item.runtime_minutes ?? (item.kind === "movie" ? MINUTES.movie : ANIME_FILM_MINUTES);
    return { feature: true, sitting: minutes, whole: minutes, guessed };
  }
  const episode = item.runtime_minutes ?? (item.kind === "series" ? MINUTES.series : MINUTES.anime);
  return { feature: false, sitting: episode, whole: item.progress_total ? item.progress_total * episode : null, guessed };
}

/**
 * Episodes or chapters actually gone through. A finished title counts all of
 * them even if its progress was never ticked, which is how an imported
 * completion arrives: its status says done, its counter says nothing.
 */
export function unitsSeen(item: TimedItem): number {
  if (item.status !== "completed") return item.progress_current;
  return Math.max(item.progress_current, item.progress_total ?? 0);
}

/** Shelves that are watched, so their titles can be timed at all. */
export function isWatchedKind(kind: CategoryKind): boolean {
  return kind === "anime" || kind === "series" || kind === "movie";
}

export type ScreenTime = {
  episodes: number;
  hours: number;
  /** Comics and novels, which no clock can time (U5). */
  chapters: number;
  /**
   * Finished shows with no episode count to multiply: an import that never
   * got matched. They add nothing, so the total is short by that much.
   */
  untimed: number;
};

/**
 * Episodes and rough watching time across a set of titles. Films count only
 * once they're finished, since a film has no progress to be part way through.
 * Games and custom shelves count no progress, so they can't be timed.
 */
export function screenTime(items: readonly TimedItem[]): ScreenTime {
  let episodes = 0;
  let minutes = 0;
  let chapters = 0;
  let untimed = 0;

  for (const item of items) {
    // Read, not watched: chapters are counted on their own.
    if (isReading(item.format)) {
      chapters += unitsSeen(item);
    } else if (isFeature(item)) {
      // Counts towards the hours and nothing else: a film is not an episode.
      if (item.status === "completed") {
        minutes += item.runtime_minutes ?? (item.kind === "movie" ? MINUTES.movie : ANIME_FILM_MINUTES);
      }
    } else if (item.kind === "anime" || item.kind === "series") {
      const seen = unitsSeen(item);
      if (seen === 0 && item.status === "completed") untimed += 1;
      episodes += seen;
      minutes += seen * (item.runtime_minutes ?? MINUTES[item.kind]);
    }
  }

  return { episodes, hours: Math.round(minutes / 60), chapters, untimed };
}
