"use client";

import { FilterChip } from "@/components/ui/FilterChip";
import { GlideGroup } from "@/components/ui/Glide";
import { MOODS, forYouHref, moodLabel } from "@/lib/moods";
import { MoodBox } from "./MoodBox";
import { showPicks, useMoodParam } from "./useShelfParam";

/**
 * "Mood": a row of chips that narrows both halves of For you to one feeling,
 * and a box for any other word (SPEC §20). Switches in place, like the shelf
 * chips, and keeps the shelf. A typed word gets a chip of its own while it's
 * the mood.
 */
export function MoodChips({ shelf }: { shelf: string | null }) {
  const choice = useMoodParam();

  return (
    <div className="mt-3 flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center md:gap-3">
      <span id="mood-label" className="label-mono text-text-muted">
        Mood
      </span>
      <nav aria-labelledby="mood-label" className="-mx-5 min-w-0 overflow-x-auto px-5 [scrollbar-width:none] md:mx-0 md:px-0">
        <GlideGroup id="for-you-moods">
          <ul className="flex w-max gap-2 md:w-auto md:flex-wrap">
            <li>
              <FilterChip href={forYouHref({ shelf })} current={choice === null} onPick={showPicks}>
                Any
              </FilterChip>
            </li>
            {choice?.word && (
              <li>
                <FilterChip href={forYouHref({ shelf, mood: choice.word })} current onPick={showPicks}>
                  {moodLabel(choice)}
                </FilterChip>
              </li>
            )}
            {MOODS.map((mood) => (
              <li key={mood.slug}>
                <FilterChip href={forYouHref({ shelf, mood: mood.slug })} current={choice?.mood?.slug === mood.slug} onPick={showPicks}>
                  {mood.label}
                </FilterChip>
              </li>
            ))}
          </ul>
        </GlideGroup>
      </nav>
      <MoodBox shelf={shelf} />
    </div>
  );
}
