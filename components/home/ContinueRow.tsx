"use client";

import { useState } from "react";
import { useItemActions } from "@/components/items/useItemActions";
import type { Item } from "@/lib/items";
import type { PaletteCategory } from "@/lib/palette";
import { cn } from "@/lib/utils";
import { ContinueCard } from "./ContinueCard";
import { SectionHeader } from "./SectionHeader";

type ContinueRowProps = {
  items: Item[];
  shelves: PaletteCategory[];
};

/**
 * Everything in progress, across shelves (SPEC §8.4). Two cards on phones,
 * three on wide screens, "See all" for the rest. +1 shows at once and saves
 * behind it, like on a shelf.
 */
export function ContinueRow({ items, shelves }: ContinueRowProps) {
  const actions = useItemActions(items);
  const [expanded, setExpanded] = useState(false);
  const byId = new Map(shelves.map((shelf) => [shelf.id, shelf]));
  const cards = actions.items.flatMap((item) => {
    const shelf = byId.get(item.category_id);
    return item.status === "in_progress" && shelf ? [{ item, shelf }] : [];
  });
  const count = cards.length;

  const toggle =
    count > 2 ? (
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((open) => !open)}
        className={cn("-my-3 min-h-11 text-12 text-text-muted transition-colors hover:text-text md:text-[12.5px]", count === 3 && !expanded && "xl:hidden")}
      >
        {expanded ? "Show less" : `See all ${count}`}
      </button>
    ) : null;

  return (
    <section aria-labelledby="continue-heading">
      <SectionHeader id="continue-heading" title="Continue" aside={toggle} />
      {count === 0 ? (
        <p className="text-13 text-text-muted">Nothing in progress. Start something and it&apos;ll wait for you here.</p>
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2 md:gap-4.5 xl:grid-cols-3">
          {cards.map(({ item, shelf }, index) => (
            <li key={item.id} className={cn(!expanded && index >= 2 && "hidden", !expanded && index === 2 && "xl:block")}>
              <ContinueCard item={item} shelf={shelf} onIncrement={() => actions.increment(item)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
