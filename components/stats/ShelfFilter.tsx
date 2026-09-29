"use client";

import { FilterChip } from "@/components/ui/FilterChip";
import { GlideGroup } from "@/components/ui/Glide";
import { categoryStyle } from "@/lib/categories";
import type { StatsShelf } from "@/lib/stats";
import { cn } from "@/lib/utils";

const statsHref = (slug: string | null) => (slug ? `/stats?shelf=${encodeURIComponent(slug)}` : "/stats");

/**
 * One row of shelf chips above everything they scope (the URL keeps the
 * choice, SPEC §8): Stats, and For you. Only shelves with something on them
 * are offered. The chosen chip's amber glides to the next one you pick (U20).
 */
export function ShelfFilter({
  shelves,
  shelf,
  onPick,
  hrefFor = statsHref,
  glideId = "stats-shelves",
  label = "Count one shelf",
}: {
  shelves: readonly StatsShelf[];
  shelf: StatsShelf | null;
  /** Switch in the browser instead of navigating (StatsBrowser); a plain link otherwise. */
  onPick?: (href: string) => void;
  /** Where a chip goes: a shelf's slug, or null for everything. */
  hrefFor?: (slug: string | null) => string;
  glideId?: string;
  label?: string;
}) {
  if (shelves.length < 2) return null;

  return (
    <nav aria-label={label} className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
      <GlideGroup id={glideId}>
        <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
          <li>
            <FilterChip href={hrefFor(null)} current={shelf === null} onPick={onPick}>
              Everything
            </FilterChip>
          </li>
          {shelves.map((entry) => (
            <li key={entry.id}>
              <FilterChip href={hrefFor(entry.slug)} current={shelf?.id === entry.id} onPick={onPick}>
                <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(entry.color).dot)} />
                {entry.name}
              </FilterChip>
            </li>
          ))}
        </ul>
      </GlideGroup>
    </nav>
  );
}
