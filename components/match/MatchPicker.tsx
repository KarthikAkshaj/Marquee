"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SeriesTitle } from "@/lib/search/types";
import type { CategoryKind } from "@/lib/status";
import { MatchCandidates } from "./MatchCandidates";
import { MatchSearchForm } from "./MatchSearchForm";
import { MatchSeries } from "./MatchSeries";
import { triggerId } from "./MatchRow";
import type { MatchRowState } from "./useMatching";
import type { SeriesState } from "./useSeries";

type MatchPickerProps = {
  /** The row being matched; null closes the picker. */
  row: MatchRowState | null;
  onClose: () => void;
  sourceName: string;
  kind: CategoryKind;
  categoryColor: string;
  conflict: string | null;
  /** Only anime have their seasons as separate titles to add. */
  withSeries: boolean;
  seriesFor: (externalId: string) => SeriesState | undefined;
  blockedBy: (key: string) => string | null;
  onLoadSeries: (externalId: string) => void;
  onChoose: (choice: number | null) => void;
  onSearch: (query: string) => void;
  onToggleExtra: (title: SeriesTitle, add: boolean) => void;
  onStepExtra: (externalId: string, direction: 1 | -1) => void;
};

/**
 * One title's match: the search results with covers, a new
 * search, and for anime the rest of the series to add alongside. A sheet from
 * the bottom on phones, a panel in the middle on desktop.
 */
export function MatchPicker({ row: open, onClose, sourceName, kind, categoryColor, conflict, withSeries, seriesFor, blockedBy, onLoadSeries, onChoose, onSearch, onToggleExtra, onStepExtra }: MatchPickerProps) {
  // Keep showing the last row while the picker closes, so Radix can hand focus back.
  const [last, setLast] = useState(open);
  if (open && open !== last) setLast(open);
  const row = open ?? last;
  const pick = row && row.choice !== null ? row.candidates[row.choice] : null;
  const pickId = withSeries && open ? pick?.externalId : undefined;

  useEffect(() => {
    if (pickId) onLoadSeries(pickId);
  }, [pickId, onLoadSeries]);

  const extras = row?.extras.length ?? 0;

  return (
    <Dialog.Root open={open !== null} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/62 backdrop-blur-[3px]" />
        {row && (
          <Dialog.Content
            onOpenAutoFocus={(event) => {
              event.preventDefault();
              (event.currentTarget as HTMLElement).focus();
            }}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              document.getElementById(triggerId(row.item.id))?.focus();
            }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88dvh] animate-sheet-up flex-col rounded-t-sheet border border-white/10 bg-menu/94 shadow-sheet-up outline-none backdrop-blur-[26px] motion-reduce:animate-none md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[min(760px,calc(100dvh-48px))] md:w-[calc(100%-48px)] md:max-w-140 md:-translate-1/2 md:animate-pop-in md:rounded-sheet md:shadow-dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-white/7 px-4 pt-4 pb-3.5 md:px-5">
              <div className="min-w-0">
                <p className="label-mono text-accent">Match</p>
                <Dialog.Title className="mt-1 truncate text-16 font-medium text-text">{row.item.title}</Dialog.Title>
                <Dialog.Description className="mt-0.5 text-12 text-text-muted">
                  Pick what this is on {sourceName}
                  {withSeries ? ", and add any other seasons you've seen." : "."}
                </Dialog.Description>
              </div>
              <Dialog.Close aria-label="Close" className="-mt-1.5 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-text-muted hover:text-text">
                <X aria-hidden className="size-4.5" strokeWidth={1.8} />
              </Dialog.Close>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-2 py-3.5 md:px-3">
              <MatchSearchForm key={row.item.id} initial={row.item.title} sourceName={sourceName} onSearch={onSearch} className="px-2.5" />
              <MatchCandidates row={row} sourceName={sourceName} categoryColor={categoryColor} conflict={conflict} onChoose={onChoose} />
              {withSeries && pick && row.state !== "waiting" && (
                <MatchSeries
                  pick={pick}
                  series={seriesFor(pick.externalId)}
                  extras={row.extras}
                  kind={kind}
                  categoryColor={categoryColor}
                  blockedBy={blockedBy}
                  onRetry={() => onLoadSeries(pick.externalId)}
                  onToggle={onToggleExtra}
                  onStep={onStepExtra}
                />
              )}
            </div>

            <div className="flex items-center justify-between gap-4 border-t border-white/7 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
              <p aria-live="polite" className="font-mono text-12 text-text-muted">
                {extras > 0 ? `+${extras} more to add` : ""}
              </p>
              <Dialog.Close asChild>
                <Button className="h-11 px-5 md:h-10">Done</Button>
              </Dialog.Close>
            </div>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}
