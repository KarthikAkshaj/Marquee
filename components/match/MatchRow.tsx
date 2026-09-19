"use client";

import { ArrowRight, ChevronDown, Search } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { GeneratedCover } from "@/components/items/GeneratedCover";
import { Checkbox } from "@/components/ui/Checkbox";
import { SOURCE_NAMES, resultMeta } from "@/lib/add";
import type { SearchSource } from "@/lib/search/types";
import { cn } from "@/lib/utils";
import type { MatchRowState } from "./useMatching";

type MatchRowProps = {
  row: MatchRowState;
  source: SearchSource;
  categoryColor: string;
  /** Why this pick can't be saved ("Already on this shelf as …"). */
  conflict: string | null;
  onChoose: (choice: number | null) => void;
  onToggle: (include: boolean) => void;
  onSearch: (query: string) => void;
};

/** Your title → the match we found, with other candidates and a new search when it's wrong. */
export function MatchRow({ row, source, categoryColor, conflict, onChoose, onToggle, onSearch }: MatchRowProps) {
  const [query, setQuery] = useState(row.item.title);
  const [searching, setSearching] = useState(false);
  const pick = row.choice !== null ? row.candidates[row.choice] : null;
  const showSearch = searching || (row.state !== "waiting" && row.candidates.length === 0);

  return (
    <li
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] gap-x-1 gap-y-2 border-b border-white/5 px-2 py-3 [contain-intrinsic-size:auto_180px] [content-visibility:auto] md:grid-cols-[44px_minmax(0,0.9fr)_20px_minmax(0,1.3fr)_minmax(0,220px)] md:items-center md:gap-x-3 md:px-4 md:[contain-intrinsic-size:auto_85px]",
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
            <span className="relative h-12.5 w-8.5 shrink-0 overflow-hidden rounded-[5px] border border-white/8">
              {pick.coverUrl ? (
                <Image src={pick.coverUrl} alt="" fill sizes="34px" className="object-cover" />
              ) : (
                <GeneratedCover itemId={pick.externalId} categoryColor={categoryColor} />
              )}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-14 font-medium text-text">{pick.title}</span>
              <span className="block truncate font-mono text-[11px] text-text-muted">
                {[resultMeta(pick), pick.communityScore && `${SOURCE_NAMES[source]} ${pick.communityScore}`].filter(Boolean).join(" · ")}
              </span>
            </span>
          </>
        ) : (
          <span className="text-13 text-text-muted">
            {row.state === "failed" ? `${SOURCE_NAMES[source]} didn't answer.` : row.candidates.length ? "Left as it is." : `Nothing on ${SOURCE_NAMES[source]} by that name.`}
          </span>
        )}
      </div>

      <div className="col-start-2 flex min-w-0 flex-wrap items-center gap-2 md:col-auto md:justify-end">
        {row.candidates.length > 0 && (
          <span className="relative">
            <select
              value={row.choice ?? -1}
              onChange={(event) => onChoose(Number(event.target.value) < 0 ? null : Number(event.target.value))}
              aria-label={`Match for ${row.item.title}`}
              className="h-11 max-w-40 appearance-none truncate rounded-nav border border-white/8 bg-elevated pr-7 pl-2.5 text-12 text-text transition-colors hover:border-accent/45 md:h-8.5 md:max-w-52"
            >
              {row.candidates.map((candidate, index) => (
                <option key={`${candidate.externalId}-${index}`} value={index}>
                  {candidate.title}
                  {candidate.year ? ` (${candidate.year})` : ""}
                </option>
              ))}
              <option value={-1}>No match: leave it as it is</option>
            </select>
            <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 text-text-faint" strokeWidth={2} />
          </span>
        )}
        {conflict ? (
          <span className="text-[11.5px] text-dropped">{conflict}</span>
        ) : (
          pick && !row.sure && <span className="rounded-full border border-accent/32 bg-accent/12 px-2.25 py-0.5 font-mono text-[10px] tracking-[.06em] text-accent">CHECK THIS</span>
        )}
        {row.state !== "waiting" && !showSearch && (
          <button type="button" onClick={() => setSearching(true)} className="min-h-11 text-12 text-text-muted hover:text-text md:min-h-0">
            Search again
          </button>
        )}
      </div>

      {showSearch && row.state !== "waiting" && (
        <form
          className="col-start-2 flex gap-2 md:col-span-3 md:col-start-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (query.trim().length < 2) return;
            setSearching(false);
            onSearch(query.trim());
          }}
        >
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-nav border border-white/8 bg-sheet px-3 focus-within:border-accent/45 md:h-9">
            <Search aria-hidden className="size-3.5 shrink-0 text-text-muted" strokeWidth={2} />
            <span className="sr-only">Search {SOURCE_NAMES[source]} for</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-13 text-text outline-none" />
          </label>
          <button type="submit" className="h-11 rounded-nav border border-white/12 bg-elevated px-3.5 text-13 text-text hover:border-accent/50 hover:text-accent md:h-9">
            Search
          </button>
        </form>
      )}
    </li>
  );
}
