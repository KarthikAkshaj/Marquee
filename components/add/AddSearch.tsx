"use client";

import { Command } from "cmdk";
import { useState, type KeyboardEvent } from "react";
import { SOURCE_FOR_KIND, SOURCE_NAMES, findDuplicate, searchNotice } from "@/lib/add";
import { ITEM_STATUSES } from "@/lib/status";
import { AddPanelFooter } from "./AddPanelFooter";
import { AddSearchHeader } from "./AddSearchHeader";
import type { AddTitlePanelProps } from "./AddTitlePanel";
import { GroupHeading } from "./GroupHeading";
import { ManualAddRow } from "./ManualAddRow";
import { ResultSkeleton } from "./ResultSkeleton";
import { SearchResultRow } from "./SearchResultRow";
import { ShelfChip } from "./ShelfChip";
import { useMetadataSearch } from "./useMetadataSearch";

const MANUAL = "manual";

type AddSearchProps = Omit<AddTitlePanelProps, "open" | "onOpenChange">;

/**
 * Type, pick, Enter (SPEC §8.7). ↑↓ move through results; once you're moving
 * through them, ←→ change the status; Alt+Enter adds and opens the title.
 * The last row always adds whatever was typed by hand.
 */
export function AddSearch({ category, items, defaultStatus, initialQuery = "", onAdd, onOpenExisting, onManual }: AddSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(defaultStatus);
  const [navigating, setNavigating] = useState(false);
  const [selected, setSelected] = useState("");
  const search = useMetadataSearch(category.kind, query);
  const source = SOURCE_FOR_KIND[category.kind];
  const typed = query.trim();

  const rows = (search.response?.results ?? []).map((result) => ({
    value: `${result.source}:${result.externalId}`,
    result,
    duplicate: findDuplicate(result, items),
  }));
  const values = [...rows.map((row) => row.value), ...(typed ? [MANUAL] : [])];
  // Keep the highlight where it was while results refresh; otherwise start at the top.
  const active = values.includes(selected) ? selected : (values[0] ?? "");
  const notice = searchNotice({
    source,
    query,
    idle: search.idle,
    loading: search.loading,
    resultCount: rows.length,
    error: search.response?.error,
  });

  function choose(value: string, openAfter: boolean) {
    if (value === MANUAL) return onManual(typed);
    const row = rows.find((candidate) => candidate.value === value);
    if (!row) return;
    if (row.duplicate) onOpenExisting(row.duplicate.id);
    else onAdd(row.result, status, openAfter);
  }

  function stepStatus(direction: 1 | -1) {
    setStatus((current) => {
      const index = ITEM_STATUSES.indexOf(current);
      return ITEM_STATUSES[(index + direction + ITEM_STATUSES.length) % ITEM_STATUSES.length];
    });
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      setNavigating(true);
    } else if ((event.key === "ArrowLeft" || event.key === "ArrowRight") && navigating) {
      // While typing, ←→ still move the caret.
      event.preventDefault();
      stepStatus(event.key === "ArrowRight" ? 1 : -1);
    } else if (event.key === "Enter" && event.altKey) {
      event.preventDefault();
      if (active) choose(active, true);
    }
  }

  return (
    <Command
      label={`Search ${SOURCE_NAMES[source]}`}
      shouldFilter={false}
      loop
      vimBindings={false}
      value={active}
      onValueChange={setSelected}
      onKeyDown={onKeyDown}
      className="flex min-h-0 flex-1 flex-col"
    >
      <AddSearchHeader
        query={query}
        onQueryChange={(next) => {
          setQuery(next);
          setNavigating(false);
        }}
        placeholder={`Search ${SOURCE_NAMES[source]}…`}
        loading={search.loading}
        target={<ShelfChip name={category.name} color={category.color} />}
        status={{ kind: category.kind, value: status, onStep: stepStatus }}
      />

      <Command.List aria-busy={search.loading} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        <p aria-live="polite" className="sr-only">
          {search.idle ? "" : search.loading ? "Searching" : `${rows.length} results`}
        </p>
        {notice && <p className="px-3 py-3 text-13 text-text-muted">{notice}</p>}
        {search.loading && rows.length === 0 && <ResultSkeleton />}

        {rows.length > 0 && (
          <Command.Group heading={<GroupHeading>Results</GroupHeading>}>
            {rows.map((row) => (
              <SearchResultRow
                key={row.value}
                value={row.value}
                result={row.result}
                kind={category.kind}
                categoryColor={category.color}
                onShelf={row.duplicate?.status ?? null}
                selected={row.value === active}
                onSelect={() => choose(row.value, false)}
              />
            ))}
          </Command.Group>
        )}

        {typed && (
          <ManualAddRow
            value={MANUAL}
            title={typed}
            divided={rows.length > 0 || Boolean(notice) || search.loading}
            onSelect={() => choose(MANUAL, false)}
          />
        )}
      </Command.List>

      <AddPanelFooter source={source} />
    </Command>
  );
}
