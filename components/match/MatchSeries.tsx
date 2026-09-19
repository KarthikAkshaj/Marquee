"use client";

import { StatusStepper } from "@/components/add/StatusStepper";
import { Checkbox } from "@/components/ui/Checkbox";
import { resultMeta } from "@/lib/add";
import type { SearchResult, SeriesTitle } from "@/lib/search/types";
import type { CategoryKind } from "@/lib/status";
import { cn } from "@/lib/utils";
import { MatchCover } from "./MatchCover";
import type { ExtraPick } from "./useMatching";
import type { SeriesState } from "./useSeries";

type MatchSeriesProps = {
  pick: SearchResult;
  series: SeriesState | undefined;
  extras: ExtraPick[];
  kind: CategoryKind;
  categoryColor: string;
  /** Why a season can't be ticked: it's on the shelf, or picked for another title. */
  blockedBy: (key: string) => string | null;
  onRetry: () => void;
  onToggle: (title: SeriesTitle, add: boolean) => void;
  onStep: (externalId: string, direction: 1 | -1) => void;
};

/** The rest of the match's series, oldest first, to tick and add as titles of their own. */
export function MatchSeries({ pick, series, extras, kind, categoryColor, blockedBy, onRetry, onToggle, onStep }: MatchSeriesProps) {
  const titles = series?.state === "done" ? series.titles : [];
  const others = titles.filter((title) => title.externalId !== pick.externalId);

  return (
    <section aria-labelledby="match-series" aria-busy={series?.state === "loading"} className="flex flex-col gap-0.5">
      <h3 id="match-series" className="label-mono px-2.5 text-text-muted">
        More in this series
      </h3>
      <p className="mb-1.5 px-2.5 text-12 text-text-muted">Seen other seasons or films? Tick them to add them as their own titles.</p>

      {(!series || series.state === "loading") &&
        [0, 1, 2].map((index) => <span key={index} className="mx-2.5 my-0.5 h-14 animate-pulse rounded-nav bg-white/4 motion-reduce:animate-none" />)}

      {series?.state === "failed" && (
        <p className="flex flex-wrap items-center gap-x-3 px-2.5 text-13 text-text-muted">
          AniList didn&apos;t answer.
          <button type="button" onClick={onRetry} className="min-h-11 text-accent hover:text-accent-bright md:min-h-0">
            Try again
          </button>
        </p>
      )}

      {series?.state === "done" && others.length === 0 && (
        <p className="px-2.5 text-13 text-text-muted">AniList doesn&apos;t list any other seasons for this one.</p>
      )}

      {others.length > 0 && (
        <ul className="flex flex-col gap-0.5">
          {titles.map((title) => {
            const mine = title.externalId === pick.externalId;
            const extra = extras.find((entry) => entry.result.externalId === title.externalId);
            const blocked = mine || extra ? null : blockedBy(`${title.source}:${title.externalId}`);
            const note = mine ? "Your match" : blocked;
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
