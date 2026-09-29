"use client";

import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { ShelfFilter } from "@/components/stats/ShelfFilter";
import { forYouHref, moodParam } from "@/lib/moods";
import type { PickShelf } from "@/lib/recommend";
import { MoodChips } from "./MoodChips";
import { showPicks, useMoodParam, useShelfParam } from "./useShelfParam";

/** For you's shelf and mood chips, and the room's light in the chosen shelf's colour. */
export function PickShelves({ shelves }: { shelves: readonly PickShelf[] }) {
  const shelf = useShelfParam(shelves);
  const mood = moodParam(useMoodParam());

  return (
    <>
      <AmbientBackground {...(shelf ? { variant: "category", color: shelf.color } : { variant: "app" })} />
      <div className="mt-5.5 md:mt-7">
        <ShelfFilter
          shelves={shelves}
          shelf={shelf}
          hrefFor={(slug) => forYouHref({ shelf: slug, mood })}
          glideId="for-you-shelves"
          label="Picks from one shelf"
          onPick={showPicks}
        />
        <MoodChips shelf={shelf?.slug ?? null} />
      </div>
    </>
  );
}
