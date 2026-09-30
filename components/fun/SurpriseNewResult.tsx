"use client";

import { Button } from "@/components/ui/Button";
import { categoryStyle } from "@/lib/categories";
import type { PaletteCategory } from "@/lib/palette";
import type { ItemStatus } from "@/lib/status";
import { lengthLine, type NewSurprise } from "@/lib/surprise";
import { cn } from "@/lib/utils";

type SurpriseNewResultProps = {
  pick: NewSurprise;
  /** The shelf of yours it would go on. */
  shelf: PaletteCategory | undefined;
  /** Which add is saving, if one is. */
  adding: ItemStatus | null;
  onAdd: (status: ItemStatus) => void;
  onAgain: () => void;
};

/**
 * Where the reel stopped on something you don't have (SPEC §10): what it is,
 * why it might suit you and how long it runs, then add it and start, or keep
 * it for later.
 */
export function SurpriseNewResult({ pick, shelf, adding, onAdd, onAgain }: SurpriseNewResultProps) {
  const { result } = pick;
  const length = shelf
    ? lengthLine({ format: result.format ?? null, progress_total: result.progressTotal ?? null, runtime_minutes: result.runtimeMinutes ?? null }, shelf.kind)
    : null;
  const about = [pick.reason, length].filter(Boolean).join(" · ");
  const busy = adding !== null;

  return (
    <>
      <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.14em] text-text-muted uppercase">
        {shelf && <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(shelf.color).dot)} />}
        {[shelf?.name, result.year, "New to you"].filter(Boolean).join(" · ")}
      </p>
      <p className="font-display text-[30px] leading-[1.08] text-balance md:text-[38px]">
        Tonight: <em className="text-accent">{result.title}</em>
      </p>
      {about && <p className="text-13 text-text-muted">{about}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Button onClick={() => onAdd("in_progress")} disabled={busy} aria-busy={adding === "in_progress"} className="h-11 px-5 shadow-cta-sm">
          {adding === "in_progress" ? "Adding" : "Add and start"}
        </Button>
        <Button variant="secondary" onClick={() => onAdd("planned")} disabled={busy} aria-busy={adding === "planned"} className="h-11 px-4.5">
          {/* Not "Planned": that's Watchlist or Backlog on some shelves, and the words live in lib/status. */}
          {adding === "planned" ? "Saving" : "Save for later"}
        </Button>
        <Button variant="ghost" onClick={onAgain} disabled={busy} className="h-11 px-4">
          Spin again
        </Button>
      </div>
    </>
  );
}
