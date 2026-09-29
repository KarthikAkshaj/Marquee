import Link from "next/link";
import type { CSSProperties } from "react";
import { ItemCover } from "@/components/items/ItemCover";
import type { Item } from "@/lib/items";
import { titleHref, type PaletteCategory } from "@/lib/palette";
import { generatedCover } from "@/lib/poster-art";

export type PosterItem = Pick<Item, "id" | "title" | "category_id" | "cover_url" | "accent_color" | "rating">;

type PosterTileProps = {
  item: PosterItem;
  shelf: Pick<PaletteCategory, "slug" | "color">;
  eager?: boolean;
  /** A muted line under the title, e.g. why it was picked. */
  caption?: string | null;
  /** Rendered width hint for the cover. */
  sizes?: string;
};

/**
 * One poster with your rating on it and its title below (handoff §01), opening
 * the title's sheet. Fills the width it's given; the cover keeps to 2:3.
 */
export function PosterTile({ item, shelf, eager = false, caption, sizes = "118px" }: PosterTileProps) {
  const glow = item.accent_color
    ? `color-mix(in oklab, ${item.accent_color} 34%, transparent)`
    : generatedCover(item.id, shelf.color).glow;

  return (
    <Link href={titleHref(shelf, item.id)} className="group flex flex-col gap-2 rounded-card md:gap-2.25">
      <div
        className="relative aspect-2/3 overflow-hidden rounded-[9px] border border-white/7 shadow-[0_10px_26px_var(--glow)] transition-transform duration-200 ease-cinematic group-hover:-translate-y-1"
        style={{ "--glow": glow } as CSSProperties}
      >
        <ItemCover item={item} categoryColor={shelf.color} sizes={sizes} eager={eager} />
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
      <span className="flex flex-col gap-1">
        <span className="line-clamp-2 text-[11.5px] leading-[1.3] text-pretty transition-colors group-hover:text-white md:text-[12.5px]">
          {item.title}
        </span>
        {caption && <span className="line-clamp-2 text-[10.5px] leading-[1.35] text-text-muted md:text-[11.5px]">{caption}</span>}
      </span>
    </Link>
  );
}
