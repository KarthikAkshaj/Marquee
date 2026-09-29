import { memo } from "react";
import { ItemRow } from "@/components/items/ItemRow";
import { PosterCard } from "@/components/items/PosterCard";
import { usePosterTilt } from "@/components/items/usePosterTilt";
import type { ItemQuickActions } from "@/components/items/QuickActions";
import { itemHref, type CategoryParams, type Item } from "@/lib/items";
import { rise } from "@/lib/motion";
import type { CategoryKind } from "@/lib/status";

type ShelfItemsProps = {
  category: { slug: string; kind: CategoryKind; color: string };
  params: CategoryParams;
  items: Item[];
  actions: ItemQuickActions;
  /** Titles showing their ADMIT ONE stamp right now. */
  stamps: ReadonlySet<string>;
  onStamped: (id: string) => void;
};

/** The titles on a shelf, as posters or dense rows (SPEC §8.5). */
function ShelfItemsView({ category, params, items, actions, stamps, onStamped }: ShelfItemsProps) {
  const hrefFor = (item: Item) => itemHref(category.slug, params, item.id);
  const tilt = usePosterTilt<HTMLUListElement>(params.view === "grid");

  if (params.view === "grid") {
    return (
      <ul ref={tilt} className="grid grid-cols-2 gap-x-4 gap-y-4.5 sm:grid-cols-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6">
        {items.map((item, index) => (
          <li key={item.id} {...rise(index, "skip-offscreen")}>
            {/* rise() plays on load; this rises in whatever comes into view as you scroll. */}
            <div className="reveal">
              <PosterCard
                item={item}
                href={hrefFor(item)}
                kind={category.kind}
                categoryColor={category.color}
                actions={actions}
                stamped={stamps.has(item.id)}
                onStamped={() => onStamped(item.id)}
                // Six is the first row at every width: two, three, four or six across.
                eager={index < 6}
              />
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div>
      <div
        aria-hidden
        className="hidden grid-cols-[40px_minmax(0,1fr)_140px_80px_72px_96px] gap-5 border-b border-border px-2 pb-2.5 md:grid"
      >
        <span />
        {["Title", "Status", "Progress", "Rating"].map((label) => (
          <span key={label} className="label-mono text-text-muted">
            {label}
          </span>
        ))}
        <span className="label-mono text-right text-text-muted">Updated</span>
      </div>
      <ul className="divide-y divide-border">
        {items.map((item, index) => (
          <li key={item.id} {...rise(index, "skip-offscreen-row")}>
            <div className="reveal">
              <ItemRow
                item={item}
                href={hrefFor(item)}
                kind={category.kind}
                categoryColor={category.color}
                onOpen={() => actions.onOpen(item)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Remembered between renders: opening a title changes the address, not the shelf, so the posters stay put. */
export const ShelfItems = memo(ShelfItemsView);
