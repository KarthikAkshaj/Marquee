"use client";

import { useSearchParams } from "next/navigation";
import { readMood, type MoodChoice } from "@/lib/moods";
import type { PickShelf } from "@/lib/recommend";
import { pickShelf } from "@/lib/stats";

/** The shelf For you is scoped to (`?shelf=`), or null for everything. */
export function useShelfParam(shelves: readonly PickShelf[]): PickShelf | null {
  return pickShelf(shelves, useSearchParams().get("shelf") ?? undefined);
}

/** The mood For you is in (`?mood=`): one of the moods, a typed word, or null. */
export function useMoodParam(): MoodChoice {
  return readMood(useSearchParams().get("mood"));
}

/**
 * Switches shelf or mood in place: the chips and both sections follow the URL
 * with no page load (a mood's new titles come from /api/picks).
 */
export function showPicks(href: string) {
  window.history.replaceState(null, "", href);
}
