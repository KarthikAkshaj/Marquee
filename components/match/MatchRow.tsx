"use client";

import { ArrowRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import { SOURCE_NAMES, resultMeta } from "@/lib/add";
import type { SearchSource } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import { MatchCover } from "./MatchCover";
import { MatchSearchForm } from "./MatchSearchForm";
import type { MatchRowState } from "./useMatching";

type MatchRowProps = {
  row: MatchRowState;
  source: SearchSource;
  categoryColor: string;
  /** Why this pick can't be saved ("Already on this shelf as …"). */
  conflict: string | null;
  onToggle: (include: boolean) => void;
  /** Opens the picker: other results, a new search, and the rest of the series. */
  onOpen: () => void;
  onSearch: (query: string) => void;
};

/** The row's "change the match" button, where focus goes back to when the picker closes. */
export const triggerId = (itemId: string) => `match-open-${itemId}`;

/** Your title → the match we found, with a picker for other results and seasons when it's wrong. */
export function MatchRow({ row, source, categoryColor, conflict, onToggle, onOpen, onSearch }: MatchRowProps) {
  const sourceName = SOURCE_NAMES[source];
  const pick = row.choice !== null ? row.candidates[row.choice] : null;
  const nothing = row.state !== "waiting" && row.candidates.length === 0;

  return (
    <li
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] gap-x-1 gap-y-2 border-b border-white/5 px-2 py-3 [contain-intrinsic-size:auto_180px] [content-visibility:auto] md:grid-cols-[44px_minmax(0,0.9fr)_20px_minmax(0,1.3fr)_minmax(0,220px)] md:items-center md:gap-x-3 md:px-4 md:[contain-intrinsic-size:auto_76px]",
        !row.include && "opacity-75",
      )}
    >
      <Checkbox checked={row.include} onChange={onToggle} label={`Update ${row.item.title}`} className={cn(!pick && "invisible")} />

      <div className="min-w-0 self-center">
        <p className="truncate text-14 text-text">{row.item.title}</p>
        <p className="font-mono text-[11px] text-text-muted">{row.item.year ?? "as typed"}</p>
      </div>

      <ArrowRight aria-hidden className="hidden size-3.5 text-text-faint md:block" strokeWidth={2} />

      <div className="col-start-2 flex min-w-0 items-center gap-3 md:col-auto">
        {row.state === "waiting" ? (
          <>
            <span className="h-12.5 w-8.5 shrink-0 animate-pulse rounded-[5px] bg-white/6 motion-reduce:animate-none" />
            <span className="h-3 w-2/5 animate-pulse rounded-xs bg-white/6 motion-reduce:animate-none" />
          </>
        ) : pick ? (
          <>
            <MatchCover result={pick} categoryColor={categoryColor} />
            <span className="min-w-0">
              <span className="block truncate text-14 font-medium text-text">{pick.title}</span>
              <span className="block truncate font-mono text-[11px] text-text-muted">
                {[resultMeta(pick), pick.communityScore && `${sourceName} ${pick.communityScore}`].filter(Boolean).join(" · ")}
              </span>
              {row.extras.length > 0 && (
                <span className="block font-mono text-[11px] text-accent">+{row.extras.length} more from the series</span>
              )}
            </span>
          </>
        ) : (
          <span className="text-13 text-text-muted">
            {row.state === "failed" ? `${sourceName} didn't answer.` : row.candidates.length ? "Left as it is." : `Nothing on ${sourceName} by that name.`}
          </span>
        )}
      </div>

      <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-2 md:col-auto md:justify-end">
        {row.state !== "waiting" && !nothing && (
          <button
            type="button"
            id={triggerId(row.item.id)}
            onClick={onOpen}
            aria-haspopup="dialog"
            className="relative h-11 max-w-52 truncate rounded-nav border border-white/8 bg-elevated pr-7 pl-2.5 text-left text-12 text-text transition-colors hover:border-accent/45 md:h-8.5"
          >
            <span className="sr-only">Change the match for {row.item.title}: </span>
            {pick ? `${pick.title}${pick.year ? ` (${pick.year})` : ""}` : "No match"}
            <ChevronDown aria-hidden className="absolute top-1/2 right-2 size-3 -translate-y-1/2 text-text-faint" strokeWidth={2} />
          </button>
        )}
        {conflict ? (
          <span className="text-[11.5px] text-dropped">{conflict}</span>
        ) : (
          pick && !row.sure && <span className="rounded-full border border-accent/32 bg-accent/12 px-2.25 py-0.5 font-mono text-[10px] tracking-[.06em] text-accent">CHECK THIS</span>
        )}
      </div>

      {nothing && <MatchSearchForm initial={row.item.title} sourceName={sourceName} onSearch={onSearch} className="col-start-2 md:col-span-3 md:col-start-2" />}
    </li>
  );
}
