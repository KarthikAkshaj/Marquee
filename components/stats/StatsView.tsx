import type { ReactNode } from "react";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { rise } from "@/lib/motion";
import {
  crowdGap,
  finishedByMonth,
  genreTable,
  headline,
  ratingSpread,
  type StatsItem,
  type StatsShelf,
} from "@/lib/stats";
import { cn } from "@/lib/utils";
import { CrowdCard } from "./CrowdCard";
import { FinishedCard } from "./FinishedCard";
import { GenresCard } from "./GenresCard";
import { HeadlineTiles } from "./HeadlineTiles";
import { RatingsCard } from "./RatingsCard";
import { ShelfFilter } from "./ShelfFilter";
import { StatsEmpty } from "./StatsEmpty";
import { StatsHeader } from "./StatsHeader";

type StatsViewProps = {
  /** Every shelf, in sidebar order. */
  shelves: readonly StatsShelf[];
  /** The one in view, or null for everything. */
  shelf: StatsShelf | null;
  /** Every title in the library; the shelf filter is applied here. */
  items: readonly StatsItem[];
  today: Date;
  wrappedYear: number;
};

function Rise({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
  const motion = rise(index);
  return (
    <div className={cn(motion.className, className)} style={motion.style}>
      {children}
    </div>
  );
}

/** /stats (SPEC §10): the headline numbers, then one card per question, all scoped by the shelf chips. */
export function StatsView({ shelves, shelf, items, today, wrappedYear }: StatsViewProps) {
  if (items.length === 0) return <StatsEmpty />;

  const inView = shelf ? items.filter((item) => item.category_id === shelf.id) : items;
  const stocked = shelves.filter((entry) => items.some((item) => item.category_id === entry.id));
  const byId = new Map(shelves.map((entry) => [entry.id, entry]));
  const kinds = new Map(shelves.map((entry) => [entry.id, entry.kind]));

  return (
    <>
      <AmbientBackground {...(shelf ? { variant: "category", color: shelf.color } : { variant: "app" })} />
      <StatsHeader shelf={shelf} year={wrappedYear} />
      <div className="mt-5.5 md:mt-7">
        <ShelfFilter shelves={stocked} shelf={shelf} />
      </div>
      <div className="mt-4 md:mt-5">
        <HeadlineTiles numbers={headline(inView, kinds, today)} shelf={shelf} />
      </div>

      <div className="mt-3 grid gap-3 md:mt-4 md:gap-4 lg:grid-cols-2">
        <Rise index={0} className="lg:col-span-2">
          <FinishedCard finishes={finishedByMonth(inView, today)} shelves={shelf ? null : shelves} className="h-full" />
        </Rise>
        <Rise index={1}>
          <RatingsCard ratings={ratingSpread(inView)} className="h-full" />
        </Rise>
        <Rise index={2}>
          <GenresCard genres={genreTable(inView)} className="h-full" />
        </Rise>
        <Rise index={3} className="lg:col-span-2">
          <CrowdCard crowd={crowdGap(inView)} shelves={byId} className="h-full" />
        </Rise>
      </div>
    </>
  );
}
