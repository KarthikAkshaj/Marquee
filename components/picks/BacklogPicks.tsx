"use client";

import { PosterTile, type PosterItem } from "@/components/home/PosterTile";
import { SectionHeader } from "@/components/home/SectionHeader";
import { rise } from "@/lib/motion";
import type { PickShelf } from "@/lib/recommend";
import { useShelfParam } from "./useShelfParam";

/** How many Planned titles show: a few rows across everything, more for one shelf. */
const SHOWN_EVERYWHERE = 12;
const SHOWN_ON_A_SHELF = 24;

type BacklogPicksProps = {
  picks: readonly { item: PosterItem; reason: string | null }[];
  shelves: readonly PickShelf[];
  /** Enough ratings to sort by your taste, rather than by the crowd. */
  personal: boolean;
};

/** "Next from your list" (SPEC §20): your Planned titles, best fit first, each with its reason. */
export function BacklogPicks({ picks, shelves, personal }: BacklogPicksProps) {
  const shelf = useShelfParam(shelves);
  const byId = new Map(shelves.map((entry) => [entry.id, entry]));
  const inView = shelf ? picks.filter((pick) => pick.item.category_id === shelf.id) : picks;
  const shown = inView.slice(0, shelf ? SHOWN_ON_A_SHELF : SHOWN_EVERYWHERE);
  const more = inView.length - shown.length;

  return (
    <section aria-labelledby="backlog-heading" className="mt-7 md:mt-9">
      <SectionHeader
        id="backlog-heading"
        title="Next from your list"
        aside={
          shown.length > 0 && (
            <span className="text-12 text-text-muted md:text-[12.5px]">
              {personal ? "Best fit first" : "Crowd favourites first"}
            </span>
          )
        }
      />
      {shown.length === 0 ? (
        <p className="text-13 text-text-muted">
          Nothing planned {shelf ? `on ${shelf.name}` : "yet"}. The new picks below can fix that.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 md:gap-x-4 md:gap-y-6 lg:grid-cols-6">
            {shown.map(({ item, reason }, index) => {
              const home = byId.get(item.category_id);
              if (!home) return null;
              return (
                <li key={item.id} {...rise(index)}>
                  <PosterTile item={item} shelf={home} caption={reason} sizes="(min-width: 768px) 160px, 30vw" eager={index < 6} />
                </li>
              );
            })}
          </ul>
          {!personal && (
            <p className="mt-4 text-12 text-text-muted">
              Rate a few more titles and these get personal: the order follows the genres you score highest.
            </p>
          )}
          {more > 0 && (
            <p className="mt-3 font-mono text-[11.5px] text-text-muted">
              +{more} more planned{shelf ? "" : " across your shelves"}
            </p>
          )}
        </>
      )}
    </section>
  );
}
