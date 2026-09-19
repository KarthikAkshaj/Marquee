"use client";

import { Check } from "lucide-react";
import type { ReactNode } from "react";
import { resultMeta } from "@/lib/add";
import { cn } from "@/lib/utils";
import { MatchCover } from "./MatchCover";
import type { MatchRowState } from "./useMatching";

type MatchCandidatesProps = {
  row: MatchRowState;
  sourceName: string;
  categoryColor: string;
  /** Why the chosen match can't be saved ("Picked for …"). */
  conflict: string | null;
  onChoose: (choice: number | null) => void;
};

const option =
  "flex min-h-14 cursor-pointer items-center gap-3 rounded-nav px-2.5 py-2 transition-colors hover:bg-white/4 has-checked:bg-accent/8 has-focus-visible:outline-2 has-focus-visible:outline-accent";

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
        on ? "border-accent bg-accent text-accent-ink" : "border-white/20",
      )}
    >
      {on && <Check className="size-3" strokeWidth={3} />}
    </span>
  );
}

function Option({ name, checked, onPick, children }: { name: string; checked: boolean; onPick: () => void; children: ReactNode }) {
  return (
    <label className={option}>
      <input type="radio" name={name} checked={checked} onChange={onPick} className="sr-only" />
      {children}
      <Tick on={checked} />
    </label>
  );
}

/** The search results for one title, as a pick-one list with covers; or no match at all. */
export function MatchCandidates({ row, sourceName, categoryColor, conflict, onChoose }: MatchCandidatesProps) {
  const name = `match-${row.item.id}`;

  if (row.state === "waiting") {
    return (
      <div aria-busy className="flex flex-col gap-1 px-2.5">
        {[0, 1, 2].map((index) => (
          <span key={index} className="h-14 animate-pulse rounded-nav bg-white/4 motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  return (
    <fieldset className="flex min-w-0 flex-col gap-0.5">
      <legend className="label-mono mb-1.5 px-2.5 text-text-muted">{sourceName} results</legend>
      {row.candidates.length === 0 && (
        <p className="px-2.5 pb-2 text-13 text-text-muted">
          {row.state === "failed" ? `${sourceName} didn't answer. Try searching again.` : `Nothing on ${sourceName} by that name.`}
        </p>
      )}
      {row.candidates.map((candidate, index) => (
        <Option key={`${candidate.externalId}-${index}`} name={name} checked={row.choice === index} onPick={() => onChoose(index)}>
          <MatchCover result={candidate} categoryColor={categoryColor} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-14 text-text">{candidate.title}</span>
            <span className="block truncate font-mono text-[11px] text-text-muted">
              {[resultMeta(candidate), candidate.communityScore && `${sourceName} ${candidate.communityScore}`].filter(Boolean).join(" · ")}
            </span>
            {row.choice === index && conflict && <span className="block text-[11.5px] text-dropped">{conflict}</span>}
          </span>
        </Option>
      ))}
      {row.candidates.length > 0 && (
        <Option name={name} checked={row.choice === null} onPick={() => onChoose(null)}>
          <span className="min-w-0 flex-1 text-13 text-text-muted">No match: leave it as it is</span>
        </Option>
      )}
    </fieldset>
  );
}
