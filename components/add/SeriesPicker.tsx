"use client";

import { useId } from "react";
import { MatchCover } from "@/components/match/MatchCover";
import { Checkbox } from "@/components/ui/Checkbox";
import { resultMeta } from "@/lib/add";
import type { ExtraPick } from "@/lib/match";
import type { RelatedKind, SearchResult, SeriesTitle } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { StatusStepper } from "./StatusStepper";
import type { SeriesState } from "./useSeries";

const COPY: Record<RelatedKind, { heading: string; provider: string; none: string }> = {
  anime: { heading: "More in this series", provider: "AniList", none: "AniList doesn't list any other seasons for this one." },
  movie: { heading: "More in this collection", provider: "TMDB", none: "TMDB doesn't list this film in a collection." },
};

type SeriesPickerProps = {
  /** The title the run was looked up from. */
  pick: SearchResult;
  /** What that title is called in the list: "Your match", "Just added". */
  pickNote: string;
  series: SeriesState | undefined;
  extras: ExtraPick[];
  kind: RelatedKind;
  categoryColor: string;
  /** One line under the heading: what ticking does here. */
  hint: string;
  /** Why a title can't be ticked: it's on the shelf, or picked for another title. */
  blockedBy: (title: SeriesTitle) => string | null;
  onRetry: () => void;
  onToggle: (title: SeriesTitle, add: boolean) => void;
  onStep: (externalId: string, direction: 1 | -1) => void;
};

/**
 * The rest of a title's run, oldest first: an anime's seasons and films, or
 * the other films in a collection. Tick one to add it as its own title, with
 * its own status.
 */
export function SeriesPicker({ pick, pickNote, series, extras, kind, categoryColor, hint, blockedBy, onRetry, onToggle, onStep }: SeriesPickerProps) {
  const headingId = useId();
  const copy = COPY[kind];
  const titles = series?.state === "done" ? series.titles : [];
  const others = titles.filter((title) => title.externalId !== pick.externalId);
  const heading = series?.state === "done" && series.name ? series.name : copy.heading;

  return (
    <section aria-labelledby={headingId} aria-busy={series?.state === "loading"} className="flex flex-col gap-0.5">
      <h3 id={headingId} className="label-mono px-2.5 text-text-muted">
        {heading}
      </h3>
      <p className="mb-1.5 px-2.5 text-12 text-text-muted">{hint}</p>

      {(!series || series.state === "loading") &&
        [0, 1, 2].map((index) => <span key={index} className="projector mx-2.5 my-0.5 h-14 rounded-nav bg-white/4" />)}

      {series?.state === "failed" && (
        <p className="flex flex-wrap items-center gap-x-3 px-2.5 text-13 text-text-muted">
          {copy.provider} didn&apos;t answer.
          <button type="button" onClick={onRetry} className="min-h-11 text-accent hover:text-accent-bright md:min-h-0">
            Try again
          </button>
        </p>
      )}

      {series?.state === "done" && others.length === 0 && <p className="px-2.5 text-13 text-text-muted">{copy.none}</p>}

      {others.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {titles.map((title) => {
            const mine = title.externalId === pick.externalId;
            const extra = extras.find((entry) => entry.result.externalId === title.externalId);
            const blocked = mine || extra ? null : blockedBy(title);
            const note = mine ? pickNote : blocked;
            return (
              <li
                key={title.externalId}
                className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 rounded-nav py-1.5 pr-2.5 pl-0 md:flex-nowrap", extra && "bg-accent/6")}
              >
                <Checkbox
                  checked={Boolean(extra)}
                  onChange={(add) => onToggle(title, add)}
                  label={`Add ${title.title}`}
                  className={cn((mine || blocked) && "invisible")}
                />
                <MatchCover result={title} categoryColor={categoryColor} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-[13.5px] text-text", blocked && "text-text-muted")}>{title.title}</span>
                  <span className="block truncate font-mono text-[11px] text-text-muted">{resultMeta(title)}</span>
                  {note && <span className={cn("block text-[11.5px]", mine ? "text-accent" : "text-text-muted")}>{note}</span>}
                </span>
                {extra && (
                  <span className="flex basis-full pl-14 md:basis-auto md:pl-0">
                    <StatusStepper kind={kind} value={extra.status} name={title.title} onStep={(direction) => onStep(title.externalId, direction)} />
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
