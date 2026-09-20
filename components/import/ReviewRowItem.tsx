"use client";

import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/Checkbox";
import type { Duplicate, ReviewRow } from "@/lib/import/review";
import { ITEM_STATUSES, STATUS_STYLE, statusLabel, statusLabels, type CategoryKind } from "@/lib/status";
import { cn } from "@/lib/utils";

type ReviewRowItemProps = {
  row: ReviewRow;
  kind: CategoryKind;
  duplicate: Duplicate | null;
  /** Kind of the shelf the duplicate is on, for its status label. */
  duplicateKind: CategoryKind | null;
  showYear: boolean;
  onChange: (patch: Partial<ReviewRow>) => void;
};

export const reviewGrid = (showYear: boolean) =>
  showYear ? "md:grid-cols-[44px_minmax(0,1fr)_80px_180px_minmax(0,210px)]" : "md:grid-cols-[44px_minmax(0,1fr)_180px_minmax(0,210px)]";

/**
 * One title in the review (handoff §05): tick, editable title, year when the
 * list had years, status menu and a DUPLICATE badge. A stacked card on phones.
 */
export function ReviewRowItem({ row, kind, duplicate, duplicateKind, showYear, onChange }: ReviewRowItemProps) {
  const labels = statusLabels(kind);
  const note = duplicate && duplicateKind ? `Already in ${duplicate.shelf} · ${statusLabel(duplicateKind, duplicate.status)}` : null;

  return (
    <li
      className={cn(
        "grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-1 border-b border-white/5 px-2 py-2 [contain-intrinsic-size:auto_60px] [content-visibility:auto] md:gap-x-0 md:px-4.5 md:py-1.5",
        reviewGrid(showYear),
        duplicate && "bg-accent/[.035]",
      )}
    >
      <Checkbox checked={row.include} onChange={(include) => onChange({ include })} label={`Include ${row.title || "this line"}`} />

      <div className="flex min-w-0 flex-col gap-0.75 md:pr-5">
        <input
          value={row.title}
          onChange={(event) => onChange({ title: event.target.value })}
          spellCheck={false}
          maxLength={200}
          aria-label="Title"
          className={cn(
            "-ml-2 h-10 w-full min-w-0 rounded-[7px] border border-transparent bg-transparent px-2 text-14 outline-none transition-colors hover:border-white/12 hover:bg-white/3 focus-visible:border-accent/55 focus-visible:bg-sheet focus-visible:text-text md:h-9",
            row.include ? "text-text" : "text-text-muted",
          )}
        />
        {note && <p className="text-[11.5px] text-text-muted">{note}</p>}
      </div>

      {showYear && (
        <p className={cn("hidden font-mono text-[12.5px] md:block", row.year ? "text-text-muted" : "text-text-ghost")}>{row.year ?? "·"}</p>
      )}

      <div className="relative col-start-2 mt-1 w-fit md:col-auto md:mt-0">
        <span
          aria-hidden
          className={cn("pointer-events-none absolute top-1/2 left-3 size-1.5 -translate-y-1/2 rounded-full", row.include ? STATUS_STYLE[row.status].fill : "bg-text-ghost")}
        />
        <select
          value={row.status}
          onChange={(event) => onChange({ status: event.target.value as ReviewRow["status"] })}
          aria-label={`Status for ${row.title || "this line"}`}
          className={cn(
            "h-11 appearance-none rounded-nav border border-white/8 bg-elevated pr-8 pl-7 text-[12.5px] transition-colors hover:border-accent/45 md:h-8.5",
            row.include ? "text-text" : "text-text-muted",
          )}
        >
          {ITEM_STATUSES.map((status) => (
            <option key={status} value={status}>
              {labels[status]}
            </option>
          ))}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 size-3 -translate-y-1/2 text-text-faint" strokeWidth={2} />
      </div>

      <div className="col-start-2 mt-1 md:col-auto md:mt-0 md:flex md:justify-end">
        {duplicate && (
          <span className="inline-flex items-center gap-1.75 rounded-full border border-accent/32 bg-accent/12 px-2.75 py-1 font-mono text-[10.5px] tracking-[.06em] text-accent">
            <span aria-hidden className="size-1.25 rounded-full bg-accent shadow-bulb-low" />
            DUPLICATE
          </span>
        )}
      </div>
    </li>
  );
}
