"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { categoryStyle } from "@/lib/categories";
import { findSaved, type ReviewRow, type SavedTitle, type ShelfName } from "@/lib/import/review";
import { statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { ImportShelf } from "./ImportTargetCard";
import { ReviewRowItem, reviewGrid } from "./ReviewRowItem";

type ImportReviewProps = {
  shelf: ImportShelf;
  shelves: ImportShelf[];
  sourceName: string;
  rows: ReviewRow[];
  index: ReadonlyMap<string, SavedTitle>;
  defaultStatus: ReviewRow["status"];
  onRows: (rows: ReviewRow[]) => void;
  onChangeSource: () => void;
};

/** STEP 03 (handoff §05): every title, editable, before anything is saved. */
export function ImportReview({ shelf, shelves, sourceName, rows, index, defaultStatus, onRows, onChangeSource }: ImportReviewProps) {
  const [duplicatesOnly, setDuplicatesOnly] = useState(false);
  const names: ShelfName[] = shelves;
  const kinds = new Map(shelves.map((candidate) => [candidate.id, candidate.kind]));
  const withDuplicates = rows.map((row) => ({ row, duplicate: findSaved(row.title, index, names) }));
  const shown = duplicatesOnly ? withDuplicates.filter(({ duplicate }) => duplicate) : withDuplicates;
  const showYear = rows.some((row) => row.year !== null);
  const allOn = rows.length > 0 && rows.every((row) => row.include);

  const patch = (key: number, change: Partial<ReviewRow>) => onRows(rows.map((row) => (row.key === key ? { ...row, ...change } : row)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="flex items-center gap-2.25 rounded-full border border-border bg-surface px-3.5 py-1.75">
          <span aria-hidden className="size-1.5 rounded-full bg-accent" />
          <span className="max-w-50 truncate font-mono text-[11.5px] text-text">{sourceName}</span>
          <span className="text-12 text-text-muted">{rows.length} lines</span>
        </span>
        <span className="flex items-center gap-2.25 rounded-full border border-border bg-surface px-3.5 py-1.75">
          <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(shelf.color).dot)} />
          <span className="text-[12.5px] text-text">{shelf.name}</span>
          <span aria-hidden className="text-12 text-text-muted">·</span>
          <span className="text-[12.5px] text-text-muted">{statusLabel(shelf.kind, defaultStatus)}</span>
        </span>
        <button type="button" onClick={onChangeSource} className="min-h-11 px-1 text-[12.5px] text-accent hover:text-accent-bright">
          Change
        </button>
        <button
          type="button"
          aria-pressed={duplicatesOnly}
          onClick={() => setDuplicatesOnly((only) => !only)}
          className="ml-auto min-h-11 text-[12.5px] text-text-muted transition-colors hover:text-text aria-pressed:text-accent"
        >
          Show duplicates only
        </button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-border bg-surface">
        <div
          className={cn(
            "hidden h-11 items-center border-b border-border bg-white/[.015] px-4.5 font-mono text-[10px] tracking-[.12em] text-text-muted md:grid",
            reviewGrid(showYear),
          )}
        >
          <Checkbox
            checked={allOn}
            onChange={(include) => onRows(rows.map((row) => ({ ...row, include })))}
            label={allOn ? "Untick every title" : "Tick every title"}
            className="-ml-1.5"
          />
          <span>TITLE</span>
          {showYear && <span>YEAR</span>}
          <span>STATUS</span>
          <span className="text-right">FLAGS</span>
        </div>
        {shown.length === 0 ? (
          <p className="px-4.5 py-6 text-13 text-text-muted">{duplicatesOnly ? "No duplicates. Everything here is new." : "Nothing to import."}</p>
        ) : (
          <ul aria-label="Titles to import">
            {shown.map(({ row, duplicate }) => (
              <ReviewRowItem
                key={row.key}
                row={row}
                kind={shelf.kind}
                duplicate={duplicate}
                duplicateKind={duplicate ? (kinds.get(duplicate.shelfId) ?? null) : null}
                showYear={showYear}
                onChange={(change) => patch(row.key, change)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
