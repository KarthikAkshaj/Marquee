import { ChevronRight, Ticket } from "lucide-react";
import Link from "next/link";
import type { StatsShelf } from "@/lib/stats";

/** "Your numbers.", what's in view, and the way on to the year in review. */
export function StatsHeader({ shelf, year }: { shelf: StatsShelf | null; year: number }) {
  return (
    <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6">
      <div className="min-w-0">
        <h1 className="font-display opsz-120 text-[42px] leading-none md:text-[54px]">
          Your <em className="text-accent">numbers.</em>
        </h1>
        <p className="mt-3 text-14 text-pretty text-text-muted md:text-[15px]">
          {shelf ? `Just ${shelf.name}, counted up.` : "Everything you've tracked, counted up. No judgement. Mostly."}
        </p>
      </div>
      <Link
        href="/wrapped"
        className="group flex min-h-11 w-fit shrink-0 items-center gap-2 rounded-full border border-white/10 bg-elevated py-1.5 pr-3 pl-3.5 text-13 text-text transition-colors hover:border-accent/40 md:min-h-0"
      >
        <Ticket aria-hidden className="size-3.75 text-accent" strokeWidth={1.6} />
        Your <span className="font-mono">{year}</span> in review
        <ChevronRight aria-hidden className="size-3.5 text-text-muted transition-colors group-hover:text-accent" strokeWidth={1.8} />
      </Link>
    </header>
  );
}
