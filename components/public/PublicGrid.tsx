"use client";

import { usePosterTilt } from "@/components/items/usePosterTilt";
import { rise } from "@/lib/motion";
import type { PublicShelf, PublicTitle } from "@/lib/public-profile";
import { PublicPosterCard } from "./PublicPosterCard";

type PublicGridProps = {
  titles: PublicTitle[];
  shelf: Pick<PublicShelf, "kind" | "color">;
  hrefFor: (id: string) => string;
  onOpen: (id: string) => void;
};

/** A shared shelf's posters, leaning toward the mouse like your own (U19). */
export function PublicGrid({ titles, shelf, hrefFor, onOpen }: PublicGridProps) {
  const tilt = usePosterTilt<HTMLUListElement>();

  return (
    <ul ref={tilt} className="grid grid-cols-2 gap-x-4 gap-y-4.5 sm:grid-cols-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6">
      {titles.map((title, index) => (
        <li key={title.id} {...rise(index)}>
          <div className="reveal">
            <PublicPosterCard
              title={title}
              href={hrefFor(title.id)}
              kind={shelf.kind}
              categoryColor={shelf.color}
              onOpen={() => onOpen(title.id)}
              eager={index < 6}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
