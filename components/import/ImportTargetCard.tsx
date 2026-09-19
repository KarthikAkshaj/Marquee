"use client";

import Link from "next/link";
import { useId } from "react";
import { StatusSegmented } from "@/components/items/StatusSegmented";
import { categoryStyle } from "@/lib/categories";
import type { CategoryKind, ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

export type ImportShelf = { id: string; name: string; slug: string; color: string; kind: CategoryKind; itemCount: number };

type ImportTargetCardProps = {
  shelves: ImportShelf[];
  shelfId: string | null;
  onShelf: (id: string) => void;
  kind: CategoryKind;
  status: ItemStatus;
  onStatus: (status: ItemStatus) => void;
};

/** STEP 01 (handoff §05): which shelf the whole import lands on, and the status every row starts in. */
export function ImportTargetCard({ shelves, shelfId, onShelf, kind, status, onStatus }: ImportTargetCardProps) {
  const statusLabel = useId();
  return (
    <section aria-labelledby="import-step-1" className="flex flex-col gap-4.5 rounded-[12px] border border-border bg-surface px-4 py-4.5 surface-highlight md:px-5.5 md:py-5">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-mono text-[10px] tracking-[.12em] text-accent">STEP 01</span>
        <h2 id="import-step-1" className="text-[14.5px] font-medium">
          Where does this land?
        </h2>
        <span className="text-[12.5px] text-text-muted">Everything in this import goes to one category.</span>
      </div>

      <div role="group" aria-labelledby="import-step-1" className="flex flex-wrap gap-2.25">
        {shelves.map((shelf) => {
          const on = shelf.id === shelfId;
          const style = categoryStyle(shelf.color);
          return (
            <button
              key={shelf.id}
              type="button"
              aria-pressed={on}
              onClick={() => onShelf(shelf.id)}
              className={cn(
                "flex h-11 items-center gap-2.25 rounded-card border px-4 text-[13.5px] transition-colors",
                on ? "border-accent/45 bg-accent/10 font-semibold text-text" : "border-white/8 bg-sheet text-text-muted hover:text-text",
              )}
            >
              <span aria-hidden className={cn("size-2 rounded-full", style.dot, on && style.glow)} />
              {shelf.name}
              <span className="font-mono text-[11px] text-text-muted">{shelf.itemCount}</span>
            </button>
          );
        })}
        <Link
          href="/settings/categories?new=1"
          className="flex h-11 items-center rounded-card border border-dashed border-white/18 px-4 text-[13.5px] text-text-muted transition-colors hover:border-white/30 hover:text-text"
        >
          + New category
        </Link>
      </div>

      <div className="h-px bg-white/6" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-5">
        <div className="shrink-0">
          <p id={statusLabel} className="font-mono text-[10px] tracking-[.12em] text-text-muted">
            DEFAULT STATUS
          </p>
          <p className="mt-1.25 text-[12.5px] text-text-muted">Every row starts here. Change any of them next.</p>
        </div>
        <div className="md:ml-auto md:w-126">
          <StatusSegmented kind={kind} value={status} onChange={onStatus} labelledBy={statusLabel} />
        </div>
      </div>
    </section>
  );
}
