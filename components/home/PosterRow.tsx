import type { ReactNode } from "react";
import { rise } from "@/lib/motion";
import type { PaletteCategory } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { PosterTile, type PosterItem } from "./PosterTile";
import { SectionHeader } from "./SectionHeader";

type PosterRowProps = {
  id: string;
  title: string;
  /** A quiet note on the right, e.g. "Nice run.", or a link on. */
  note: ReactNode;
  /** What to say when the row is empty. */
  empty: string;
  items: PosterItem[];
  shelves: PaletteCategory[];
  /** Posters from the start whose covers load at once: for a row in the first screenful. */
  eager?: number;
  /** A muted line under each title, by item id (why it was picked). */
  captions?: ReadonlyMap<string, string | null>;
  className?: string;
};

/**
 * A row of posters with your rating on each (handoff §01): Recently finished
 * and Favourites on Home (SPEC §8.4, §10), and Picked for you (§20). Each
 * opens its title.
 */
export function PosterRow({ id, title, note, empty, items, shelves, eager = 0, captions, className }: PosterRowProps) {
  const byId = new Map(shelves.map((shelf) => [shelf.id, shelf]));
  const posters = items.flatMap((item) => {
    const shelf = byId.get(item.category_id);
    return shelf ? [{ item, shelf }] : [];
  });

  return (
    <section aria-labelledby={id} className={cn("reveal", className)}>
      <SectionHeader id={id} title={title} aside={posters.length > 0 && <span className="text-12 text-text-muted md:text-[12.5px]">{note}</span>} />
      {posters.length === 0 ? (
        <p className="text-13 text-text-muted">{empty}</p>
      ) : (
        <ul className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:gap-4 md:px-0">
          {posters.map(({ item, shelf }, index) => (
            <li key={item.id} style={rise(index).style} className={cn("w-24 shrink-0 md:w-29.5", rise(index).className)}>
              <PosterTile item={item} shelf={shelf} eager={index < eager} caption={captions?.get(item.id)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
