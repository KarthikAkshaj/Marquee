"use client";

import Link, { useLinkStatus } from "next/link";
import { CategoryIcon } from "@/components/category/CategoryIcon";
import { categoryStyle } from "@/lib/categories";
import { publicHref, type PublicShelf } from "@/lib/public-profile";
import { cn } from "@/lib/utils";

type ShelfTabsProps = {
  username: string;
  shelves: PublicShelf[];
  active: string;
};

/** The count, or a bulb warming up while that shelf's titles are on their way. */
function ChipCount({ count, on }: { count: number; on: boolean }) {
  const { pending } = useLinkStatus();
  if (pending) {
    return (
      <span className="grid size-3.5 place-items-center">
        <span aria-hidden className="size-1.75 animate-pulse rounded-full bg-accent shadow-bulb-low" />
        <span className="sr-only">Loading</span>
      </span>
    );
  }
  return <span className={cn("font-mono text-[11px]", on ? "text-accent" : "text-text-faint")}>{count}</span>;
}

/**
 * One chip per shared shelf, in its own colour, with how many titles are on
 * it. A shelf's titles come from the server, so the tapped chip shows that
 * it heard you straight away.
 */
export function ShelfTabs({ username, shelves, active }: ShelfTabsProps) {
  const first = shelves[0]?.slug;

  return (
    <nav aria-label="Shelves" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-2 py-1">
        {shelves.map((shelf) => {
          const on = shelf.slug === active;
          const style = categoryStyle(shelf.color);
          return (
            <li key={shelf.slug}>
              <Link
                href={publicHref(username, first, { shelf: shelf.slug })}
                scroll={false}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "press flex min-h-11 items-center gap-2.25 rounded-full border px-4 text-[13.5px] transition-[background-color,border-color,color] duration-200 ease-cinematic md:min-h-10",
                  on ? cn("border-white/16 text-text", style.pill) : "border-white/8 text-text-muted hover:border-white/14 hover:text-text",
                )}
              >
                <CategoryIcon name={shelf.icon} className={cn("size-4", on ? style.text : "text-text-muted")} />
                {shelf.name}
                <ChipCount count={shelf.count} on={on} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
