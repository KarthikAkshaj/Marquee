"use client";

import { Command } from "cmdk";
import { GroupHeading } from "@/components/add/GroupHeading";
import { ResultSkeleton } from "@/components/add/ResultSkeleton";
import { SearchResultRow } from "@/components/add/SearchResultRow";
import type { PaletteCategory } from "@/lib/palette";
import type { SearchResult } from "@/lib/search/types";
import type { ItemStatus } from "@/lib/status";

type AddResultsGroupProps = {
  target: PaletteCategory;
  rows: { value: string; result: SearchResult; duplicate: { status: ItemStatus } | null }[];
  notice: string | null;
  loading: boolean;
  active: string;
  onChoose: (value: string) => void;
};

/** "Add to Anime": provider results for the target shelf, or why there aren't any. */
export function AddResultsGroup({ target, rows, notice, loading, active, onChoose }: AddResultsGroupProps) {
  const heading = <GroupHeading>Add to {target.name}</GroupHeading>;

  if (rows.length === 0) {
    return (
      <>
        {heading}
        {notice && <p className="px-3 pb-3 text-13 text-text-muted">{notice}</p>}
        {loading && <ResultSkeleton />}
      </>
    );
  }

  return (
    <Command.Group heading={heading}>
      {notice && <p className="px-3 pb-3 text-13 text-text-muted">{notice}</p>}
      {rows.map((row) => (
        <SearchResultRow
          key={row.value}
          value={row.value}
          result={row.result}
          kind={target.kind}
          categoryColor={target.color}
          onShelf={row.duplicate?.status ?? null}
          selected={row.value === active}
          onSelect={() => onChoose(row.value)}
        />
      ))}
    </Command.Group>
  );
}
