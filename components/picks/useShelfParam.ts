"use client";

import { useSearchParams } from "next/navigation";
import type { PickShelf } from "@/lib/recommend";
import { pickShelf } from "@/lib/stats";

/** The shelf For you is scoped to (`?shelf=`), or null for everything. */
export function useShelfParam(shelves: readonly PickShelf[]): PickShelf | null {
  return pickShelf(shelves, useSearchParams().get("shelf") ?? undefined);
}

/** Switches shelf in place: the chips and both sections follow the URL with no trip to the server. */
export function showShelf(href: string) {
  window.history.replaceState(null, "", href);
}
