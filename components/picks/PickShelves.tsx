"use client";

import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { ShelfFilter } from "@/components/stats/ShelfFilter";
import type { PickShelf } from "@/lib/recommend";
import { showShelf, useShelfParam } from "./useShelfParam";

/** For you's shelf chips, and the room's light in the chosen shelf's colour. */
export function PickShelves({ shelves }: { shelves: readonly PickShelf[] }) {
  const shelf = useShelfParam(shelves);

  return (
    <>
      <AmbientBackground {...(shelf ? { variant: "category", color: shelf.color } : { variant: "app" })} />
      <div className="mt-5.5 md:mt-7">
        <ShelfFilter shelves={shelves} shelf={shelf} path="/for-you" label="Picks from one shelf" onPick={showShelf} />
      </div>
    </>
  );
}
