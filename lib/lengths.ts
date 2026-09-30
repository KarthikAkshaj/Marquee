/**
 * "How long have you got?" (SPEC §10): Surprise me's answers, and which
 * titles fit each. Shared by your own list and by discovery, so a new title
 * and one of yours are held to the same clock.
 */
import { lengthOf, type Length, type TimedItem } from "@/lib/screen-time";
import type { DiscoverLength } from "@/lib/search/types";

type LengthOption = {
  slug: DiscoverLength;
  label: string;
  /** What it means, under the chips. */
  hint: string;
  /** Finishes "Nothing on your list ..." when a choice leaves nothing. */
  nothing: string;
  fits: (length: Length) => boolean;
};

/**
 * The first three are bands of the whole title, so what comes up both fits
 * the time and fills it: an evening doesn't land on a 20 minute special.
 */
export const LENGTHS = [
  {
    slug: "hour",
    label: "An hour",
    hint: "Something you can finish in an hour",
    nothing: "can be finished in an hour",
    fits: (length) => length.whole !== null && length.whole <= 60,
  },
  {
    slug: "evening",
    label: "An evening",
    hint: "A film, or a short run: one to three hours in all",
    nothing: "runs one to three hours",
    // A film is an evening whatever it runs; a three hour epic isn't a weekend binge.
    fits: (length) => length.whole !== null && length.whole > 60 && (length.feature || length.whole <= 180),
  },
  {
    slug: "weekend",
    label: "A weekend",
    hint: "A series you could finish in two days: three to twelve hours",
    nothing: "has a series of three to twelve hours",
    fits: (length) => !length.feature && length.whole !== null && length.whole > 180 && length.whole <= 720,
  },
  // Not how long it all takes: just starting something longer, one episode tonight.
  {
    slug: "episode",
    label: "Just an episode",
    hint: "One episode of any show, however long it runs",
    nothing: "comes in episodes of an hour or less",
    fits: (length) => !length.feature && length.sitting <= 60,
  },
] as const satisfies readonly LengthOption[];

export type LengthSlug = DiscoverLength;

export function lengthOption(slug: LengthSlug | null | undefined) {
  return LENGTHS.find((entry) => entry.slug === slug);
}

/** Whether a title fits the time. Games, custom shelves and comics have no clock, so they never do. */
export function fitsLength(title: Pick<TimedItem, "format" | "kind" | "progress_total" | "runtime_minutes">, slug: LengthSlug): boolean {
  const length = lengthOf(title);
  const option = lengthOption(slug);
  return length !== null && option !== undefined && option.fits(length);
}
