"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { SectionHeader } from "@/components/home/SectionHeader";
import { Button } from "@/components/ui/Button";
import { TMDB_NOTICE } from "@/lib/add";
import { forYouHref, moodLabel, moodParam } from "@/lib/moods";
import { rise } from "@/lib/motion";
import type { PickShelf, PicksPayload } from "@/lib/recommend";
import { isPlainClick } from "@/lib/utils";
import { NewPickCard } from "./NewPickCard";
import { NewPicksSkeleton } from "./NewPicksSkeleton";
import { useMoodPicks } from "./useMoodPicks";
import { usePickActions } from "./usePickActions";
import { showPicks, useMoodParam, useShelfParam } from "./useShelfParam";

/** Per shelf when looking at everything: one row on a laptop, three on a phone. */
const SHOWN_PER_SHELF = 6;

type NewPicksProps = {
  /** What the page was opened with: its mood, as `?mood=` spells it ("" for none), and its picks. */
  initial: PicksPayload & { mood: string };
  shelves: readonly PickShelf[];
};

/**
 * "New to you" (SPEC §20): titles from outside your shelves, grouped by shelf
 * when looking at everything, for the mood you're in if you've picked one.
 * "Plan it" puts one on its shelf; ✕ takes one away. Both have Undo.
 */
export function NewPicks({ initial, shelves }: NewPicksProps) {
  const shelf = useShelfParam(shelves);
  const choice = useMoodParam();
  const mood = moodParam(choice) ?? "";
  const { picks: loaded, retry } = useMoodPicks(mood, initial);
  const { hidden, stateOf, plan, dismiss } = usePickActions();

  if (loaded.status === "loading") {
    return <NewPicksSkeleton note={choice ? `Finding the best ${moodLabel(choice)} for you…` : undefined} />;
  }

  const heading = (
    <SectionHeader
      id="new-heading"
      title="New to you"
      aside={
        <span className="text-12 text-text-muted md:text-[12.5px]">
          {choice ? `${moodLabel(choice)}, best fit first` : "Loved by fans of your favourites"}
        </span>
      }
    />
  );

  if (loaded.status === "failed") {
    return (
      <section aria-labelledby="new-heading" className="mt-9 md:mt-12">
        {heading}
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-13 text-text-muted">{loaded.message}</p>
          <Button variant="secondary" size="sm" className="h-11 md:h-8.5" onClick={retry}>
            Try again
          </Button>
        </div>
      </section>
    );
  }

  const { picks, notices } = loaded.payload;
  const visible = picks.filter((pick) => !hidden.has(pick.key));
  const groups = (shelf ? [shelf] : shelves)
    .map((entry) => {
      const all = visible.filter((pick) => pick.categoryId === entry.id);
      return { shelf: entry, all, cards: shelf ? all : all.slice(0, SHOWN_PER_SHELF) };
    })
    .filter((group) => group.all.length > 0 || notices[group.shelf.id]);
  // TMDB's credit goes wherever its data is on screen.
  const fromTmdb = groups.some((group) => group.cards.some((pick) => pick.result.source === "tmdb"));

  return (
    <section aria-labelledby="new-heading" className="mt-9 md:mt-12">
      {heading}
      {groups.length === 0 && (
        <p className="text-13 text-text-muted">
          {picks.length > 0
            ? "That's everything we had for now. Rate a few more and there'll be more."
            : "Rate a few titles 8 or more, or star your favourites, and new picks show up here."}
        </p>
      )}
      {/* Keyed by shelf and mood, so switching deals the cards in again rather than reshuffling them. */}
      <div key={`${shelf?.id ?? "everything"}:${mood}`} className="flex flex-col gap-7 md:gap-9">
        {groups.map((group, groupIndex) => (
          <div key={group.shelf.id} className="flex flex-col gap-3">
            {!shelf && (
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-14 font-medium text-text">{group.shelf.name}</h3>
                {group.all.length > group.cards.length && (
                  <Link
                    href={forYouHref({ shelf: group.shelf.slug, mood })}
                    scroll={false}
                    onClick={(event) => {
                      if (!isPlainClick(event)) return;
                      event.preventDefault();
                      showPicks(event.currentTarget.getAttribute("href")!);
                    }}
                    aria-label={`All ${group.all.length} ${group.shelf.name} picks`}
                    className="flex min-h-11 items-center gap-1 text-12 text-text-muted transition-colors hover:text-text md:min-h-0"
                  >
                    All {group.all.length}
                    <ChevronRight aria-hidden className="size-3.5" strokeWidth={1.8} />
                  </Link>
                )}
              </div>
            )}
            {group.all.length === 0 && <p className="text-13 text-text-muted">{notices[group.shelf.id]}</p>}
            {group.cards.length > 0 && (
              <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 lg:grid-cols-6">
                {group.cards.map((pick, index) => (
                  <li key={pick.key} {...rise(index)}>
                    <NewPickCard
                      pick={pick}
                      shelf={group.shelf}
                      state={stateOf(pick.key)}
                      onPlan={() => void plan(pick, group.shelf)}
                      onDismiss={() => void dismiss(pick)}
                      // The first row can be in the first screenful on a laptop.
                      eager={groupIndex === 0 && index < SHOWN_PER_SHELF}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
      {fromTmdb && <p className="mt-8 text-[11px] text-text-faint">{TMDB_NOTICE}</p>}
    </section>
  );
}
