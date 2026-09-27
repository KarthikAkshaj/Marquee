"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { stepExtra, toggleExtra, type ExtraPick } from "@/lib/match";
import type { RelatedKind, SearchResult, SeriesTitle } from "@/lib/search/types";
import { statusLabel, type ItemStatus } from "@/lib/status";
import { SeriesPicker } from "./SeriesPicker";
import { useSeries } from "./useSeries";

const COPY: Record<RelatedKind, { looking: string; hint: string }> = {
  anime: { looking: "Looking for its other seasons…", hint: "Tick any other seasons or films you want on this shelf too." },
  movie: { looking: "Looking for the rest of its collection…", hint: "Tick any other films you want on this shelf too." },
};

type AddTheRestProps = {
  /** The title just added. */
  added: SearchResult;
  /** What it went on as. Ticked titles start from this. */
  status: ItemStatus;
  kind: RelatedKind;
  shelf: { name: string; color: string };
  /** Why a title can't be ticked: it's on the shelf already. */
  blockedBy: (title: SeriesTitle) => string | null;
  onAdd: (extras: ExtraPick[]) => void;
  /** Finished here, or there was nothing to offer: close the panel. */
  onDone: () => void;
};

/**
 * One more step after adding an anime or a film (SPEC §8.7): the rest of its
 * run, to tick and add in one go. A title with nothing else to add, or a
 * lookup that fails, closes the panel as if this step weren't here.
 */
export function AddTheRest({ added, status, kind, shelf, blockedBy, onAdd, onDone }: AddTheRestProps) {
  const { load, seriesFor } = useSeries(kind);
  const [extras, setExtras] = useState<ExtraPick[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const finish = useEffectEvent(onDone);

  useEffect(() => load(added.externalId), [load, added.externalId]);
  // The search box that had focus is gone: keep the keyboard inside the panel.
  useEffect(() => root.current?.focus({ preventScroll: true }), []);

  const series = seriesFor(added.externalId);
  const titles = series?.state === "done" ? series.titles : [];
  const addable = titles.filter((title) => title.externalId !== added.externalId && !blockedBy(title));
  const nothing = series?.state === "failed" || (series?.state === "done" && addable.length === 0);
  const ready = series?.state === "done" && addable.length > 0;
  // Added in release order, however they were ticked.
  const ticked = titles.flatMap((title) => extras.filter((extra) => extra.result.externalId === title.externalId));

  useEffect(() => {
    if (nothing) finish();
  }, [nothing]);

  return (
    <div ref={root} tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none">
      <div className="border-b border-white/7 px-4 pt-4 pb-3.5 md:px-5">
        <p className="label-mono text-accent">Added</p>
        <h2 className="mt-1 truncate text-16 font-medium text-text">{added.title}</h2>
        <p className="mt-0.5 text-12 text-text-muted">
          On {shelf.name} as {statusLabel(kind, status)}.
        </p>
      </div>

      <p aria-live="polite" className="sr-only">
        {ready ? `${addable.length} more you can add.` : COPY[kind].looking}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3.5 md:px-3">
        {ready ? (
          <SeriesPicker
            pick={added}
            pickNote="Just added"
            series={series}
            extras={extras}
            kind={kind}
            categoryColor={shelf.color}
            hint={COPY[kind].hint}
            blockedBy={blockedBy}
            onRetry={() => load(added.externalId)}
            onToggle={(title, add) => setExtras((current) => toggleExtra(current, title, add, status))}
            onStep={(externalId, direction) => setExtras((current) => stepExtra(current, externalId, direction))}
          />
        ) : (
          <p className="flex items-center gap-2 px-2.5 text-13 text-text-muted">
            <Loader2 aria-hidden className="size-3.5 animate-spin motion-reduce:animate-none" strokeWidth={1.8} />
            {COPY[kind].looking}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-white/7 px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))] md:px-5">
        <Button variant="ghost" className="h-11 md:h-10" onClick={onDone}>
          Not now
        </Button>
        {ready && (
          <Button
            className="h-11 px-5 md:h-10"
            disabled={ticked.length === 0}
            onClick={() => {
              onAdd(ticked);
              onDone();
            }}
          >
            {ticked.length > 0 ? `Add ${ticked.length}` : "Add"}
          </Button>
        )}
      </div>
    </div>
  );
}
