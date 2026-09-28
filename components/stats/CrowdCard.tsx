import { titleHref } from "@/lib/palette";
import { CROWD_MIN, DISAGREEMENT_MIN, formatCount, type Crowd, type StatsShelf } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { CrowdRow } from "./CrowdRow";
import { StatsCard } from "./StatsCard";

type CrowdCardProps = {
  crowd: Crowd;
  /** Shelf id → shelf, to link each title to its sheet. */
  shelves: ReadonlyMap<string, StatsShelf>;
  className?: string;
};

function insight(gap: number): string {
  if (gap >= 3) return `You're ${gap} points kinder than the crowd.`;
  if (gap <= -3) return `You're ${-gap} points tougher than the crowd.`;
  return "You and the crowd mostly agree.";
}

function Key({ className, children }: { className: string; children: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={cn("size-2 rounded-full", className)} />
      {children}
    </span>
  );
}

/** Your scores against AniList's, TMDB's and IGDB's, and the titles you argue with them about. */
export function CrowdCard({ crowd, shelves, className }: CrowdCardProps) {
  if (crowd.gap === null) {
    return (
      <StatsCard
        id="crowd-heading"
        label="You vs the crowd"
        insight="Not enough to compare yet."
        detail={`Score ${CROWD_MIN} or more titles you added from search and you'll see how you stack up against AniList, TMDB and IGDB.`}
        className={className}
      />
    );
  }

  return (
    <StatsCard
      id="crowd-heading"
      label="You vs the crowd"
      insight={insight(crowd.gap)}
      detail={`Across ${formatCount(crowd.pairs)} titles scored by both. Your 8 counts as 80.`}
      className={className}
    >
      {crowd.disagreements.length === 0 ? (
        <p className="mt-4 text-13 text-text-muted">No big arguments: you&apos;re within {DISAGREEMENT_MIN} points of the crowd on everything.</p>
      ) : (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            <h3 className="label-mono text-text-muted">Where you part ways</h3>
            <p className="flex items-center gap-3.5 text-12 text-text-muted">
              <Key className="bg-accent">You</Key>
              <Key className="bg-text-muted">The crowd</Key>
            </p>
          </div>
          <ul className="mt-1.5 divide-y divide-white/5">
            {crowd.disagreements.map((entry) => {
              const shelf = shelves.get(entry.categoryId);
              return (
                <CrowdRow
                  key={entry.id}
                  entry={entry}
                  href={shelf ? titleHref(shelf, entry.id) : "/home"}
                  categoryColor={shelf?.color ?? "amber"}
                />
              );
            })}
          </ul>
        </>
      )}
    </StatsCard>
  );
}
