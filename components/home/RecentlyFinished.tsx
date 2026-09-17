import Link from "next/link";
import type { CSSProperties } from "react";
import { ItemCover } from "@/components/items/ItemCover";
import type { Item } from "@/lib/items";
import { titleHref, type PaletteCategory } from "@/lib/palette";
import { generatedCover } from "@/lib/poster-art";
import { SectionHeader } from "./SectionHeader";

type RecentlyFinishedProps = {
  items: Item[];
  shelves: PaletteCategory[];
  className?: string;
};

/** The last eight finished, with your rating on the poster (SPEC §8.4, handoff §01). */
export function RecentlyFinished({ items, shelves, className }: RecentlyFinishedProps) {
  const byId = new Map(shelves.map((shelf) => [shelf.id, shelf]));
  const posters = items.flatMap((item) => {
    const shelf = byId.get(item.category_id);
    return shelf ? [{ item, shelf }] : [];
  });

  return (
    <section aria-labelledby="finished-heading" className={className}>
      <SectionHeader
        id="finished-heading"
        title="Recently finished"
        aside={posters.length > 0 && <span className="text-12 text-text-muted md:text-[12.5px]">Nice run.</span>}
      />
      {posters.length === 0 ? (
        <p className="text-13 text-text-muted">Nothing finished yet. No rush.</p>
      ) : (
        <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:gap-4 md:px-0">
          {posters.map(({ item, shelf }) => {
            const glow = item.accent_color
              ? `color-mix(in oklab, ${item.accent_color} 34%, transparent)`
              : generatedCover(item.id, shelf.color).glow;
            return (
              <li key={item.id} className="w-24 shrink-0 md:w-29.5">
                <Link href={titleHref(shelf, item.id)} className="group flex flex-col gap-2 rounded-card md:gap-2.25">
                  <div
                    className="relative h-36 overflow-hidden rounded-[9px] border border-white/7 shadow-[0_10px_26px_var(--glow)] transition-transform duration-200 ease-cinematic group-hover:-translate-y-1 md:h-44.25"
                    style={{ "--glow": glow } as CSSProperties}
                  >
                    <ItemCover item={item} categoryColor={shelf.color} sizes="118px" />
                    {item.rating !== null && (
                      <span className="absolute top-1.75 right-1.75 flex items-center gap-1 rounded-full bg-bg/60 px-1.5 py-0.75 backdrop-blur-[6px] md:top-2 md:right-2 md:px-1.75">
                        <span aria-hidden className="size-1 rounded-full bg-completed md:size-1.25" />
                        <span className="font-mono text-[9px] text-completed md:text-[9.5px]">
                          <span className="sr-only">Rated </span>
                          {item.rating}
                          <span aria-hidden>/10</span>
                          <span className="sr-only"> out of 10</span>
                        </span>
                      </span>
                    )}
                  </div>
                  <span className="line-clamp-2 text-[11.5px] leading-[1.3] text-pretty transition-colors group-hover:text-white md:text-[12.5px]">
                    {item.title}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
