import { categoryStyle } from "@/lib/categories";
import type { StatTile } from "@/lib/home";
import { cn } from "@/lib/utils";

/**
 * One tile per shelf plus the year's finishes (SPEC §8.4). A single joined
 * strip on wide screens; on phones separate tiles in a sideways scroll with
 * "This year" first and a fade hinting there's more (SPEC §8.3).
 */
export function StatsStrip({ tiles, className }: { tiles: StatTile[]; className?: string }) {
  return (
    <section aria-label="Your numbers" className={cn("relative -mx-5 md:mx-0", className)}>
      <ul className="flex gap-2.25 overflow-x-auto px-5 [scrollbar-width:none] md:gap-0 md:rounded-card md:border md:border-border md:bg-surface md:px-0">
        {tiles.map((tile) => (
          <li
            key={tile.key}
            className={cn(
              "flex w-37.5 shrink-0 flex-col gap-1 rounded-card border border-border bg-surface px-3 py-2.5 surface-highlight",
              "md:w-auto md:min-w-40 md:flex-1 md:gap-1.75 md:rounded-none md:border-0 md:border-r md:border-white/5 md:bg-transparent md:px-4.5 md:py-4 md:last:border-r-0",
              tile.color === null && "order-first md:order-none",
            )}
          >
            <p className="flex items-center gap-1.5 md:gap-1.75">
              <span
                aria-hidden
                className={cn("size-1.25 shrink-0 rounded-full md:size-1.5", tile.color ? categoryStyle(tile.color).dot : "bg-completed")}
              />
              <span className="truncate font-mono text-[9.5px] tracking-[.12em] text-text-muted uppercase md:text-[10px]">{tile.label}</span>
            </p>
            <p className="font-mono text-[21px] leading-none tracking-[-.02em] md:text-[26px]">{tile.value}</p>
            <p className="truncate text-[10.5px] text-text-muted md:text-[11.5px]">{tile.detail}</p>
          </li>
        ))}
      </ul>
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-11 bg-linear-to-r from-transparent to-bg md:hidden" />
    </section>
  );
}
