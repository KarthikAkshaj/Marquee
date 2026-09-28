import Link from "next/link";
import { categoryStyle } from "@/lib/categories";
import type { StatsShelf } from "@/lib/stats";
import { cn } from "@/lib/utils";

const chip = cn(
  "flex h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-[12.5px] transition-colors md:h-8.5",
  "border-white/8 bg-elevated text-text-muted hover:text-text",
  "aria-[current=true]:border-accent/45 aria-[current=true]:bg-accent/10 aria-[current=true]:font-semibold aria-[current=true]:text-text",
);

/**
 * One row of shelf chips above everything they scope (the URL keeps the
 * choice, SPEC §8). Only shelves with something on them are offered.
 */
export function ShelfFilter({ shelves, shelf }: { shelves: readonly StatsShelf[]; shelf: StatsShelf | null }) {
  if (shelves.length < 2) return null;

  return (
    <nav aria-label="Count one shelf" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
      <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
        <li>
          <Link href="/stats" scroll={false} aria-current={shelf === null ? "true" : undefined} className={chip}>
            Everything
          </Link>
        </li>
        {shelves.map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/stats?shelf=${encodeURIComponent(entry.slug)}`}
              scroll={false}
              aria-current={shelf?.id === entry.id ? "true" : undefined}
              className={chip}
            >
              <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(entry.color).dot)} />
              {entry.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
