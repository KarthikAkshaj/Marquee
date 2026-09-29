"use client";

import { useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo } from "react";
import { pickShelf, type StatsItem, type StatsShelf } from "@/lib/stats";
import { StatsView } from "./StatsView";

type StatsBrowserProps = {
  shelves: readonly StatsShelf[];
  items: readonly StatsItem[];
  /** The server's clock, as an ISO string, so "this year" and "this month" agree with it. */
  today: string;
  wrappedYear: number;
};

/**
 * /stats in the browser (SPEC §16). Every title comes down once, so picking a
 * shelf chip recounts right here: the chip lights and the cards redraw at
 * once, with no trip to the server (that took one or two seconds on a phone).
 * The shelf stays in the URL (`?shelf=`), so a reload or a shared link keeps it.
 */
export function StatsBrowser({ shelves, items, today, wrappedYear }: StatsBrowserProps) {
  const slug = useSearchParams().get("shelf") ?? undefined;
  const picked = pickShelf(shelves, slug);
  // The chip lights at once; the recount follows as a background update, so a
  // slow phone never holds the tap up while every card redraws.
  const shelf = useDeferredValue(picked);
  const now = useMemo(() => new Date(today), [today]);

  return (
    <StatsView
      shelves={shelves}
      shelf={shelf}
      picked={picked}
      items={items}
      today={now}
      wrappedYear={wrappedYear}
      onPickShelf={(href) => window.history.replaceState(null, "", href)}
    />
  );
}
