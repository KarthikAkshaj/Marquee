"use client";

import { Command } from "cmdk";
import { useState, type KeyboardEvent } from "react";
import { SOURCE_FOR_KIND, SOURCE_NAMES, findDuplicate, searchNotice } from "@/lib/add";
import { ITEM_STATUSES } from "@/lib/status";
import { cn } from "@/lib/utils";
import { AddPanelFooter } from "./AddPanelFooter";
import { AddSearchHeader } from "./AddSearchHeader";
import type { AddTitlePanelProps } from "./AddTitlePanel";
import { ResultSkeleton } from "./ResultSkeleton";
import { SearchResultRow, paletteRow } from "./SearchResultRow";
import { useMetadataSearch } from "./useMetadataSearch";

const MANUAL = "manual";

type AddSearchProps = Omit<AddTitlePanelProps, "open" | "onOpenChange">;

/**
 * Type, pick, Enter (SPEC §8.7). ↑↓ move through results; once you're moving
 * through them, ←→ change the status; Alt+Enter adds and opens the title.
 * The last row always adds whatever was typed by hand.
 */
export function AddSearch({ category, items, defaultStatus, onAdd, onOpenExisting, onManual }: AddSearchProps) {
  const [query, setQuery] = useState("");
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
        category={category}
        status={status}
        onStepStatus={stepStatus}
      />

      <Command.List aria-busy={search.loading} className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        <p aria-live="polite" className="sr-only">
          {search.idle ? "" : search.loading ? "Searching" : `${rows.length} results`}
        </p>
        {notice && <p className="px-3 py-3 text-13 text-text-muted">{notice}</p>}
        {search.loading && rows.length === 0 && <ResultSkeleton />}

        {rows.length > 0 && (
          <Command.Group
            heading={<span className="block px-3 pt-2 pb-1.5 font-mono text-[10px] tracking-[.12em] text-text-muted">RESULTS</span>}
          >
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
          // Pinned to the bottom of the list, so a long page of results never hides it.
          <div className="sticky -bottom-2 -mx-2 -mb-2 bg-menu px-2 pb-2">
            {(rows.length > 0 || notice || search.loading) && <Command.Separator className="mx-3 mb-2 h-px bg-white/7" />}
            <Command.Item value={MANUAL} onSelect={() => choose(MANUAL, false)} className={cn(paletteRow, "py-2.75")}>
              <span
                aria-hidden
                className="grid h-12.5 w-8.5 shrink-0 place-items-center rounded-[5px] border border-dashed border-white/18 text-[15px] text-text-muted"
              >
                +
              </span>
              <span className="min-w-0 flex-1 text-14 text-text">
                Add “{typed}” manually <span className="text-text-muted">— nobody&apos;s heard of it, that&apos;s fine</span>
              </span>
            </Command.Item>
          </div>
        )}
      </Command.List>

      <AddPanelFooter source={source} />
    </Command>
  );
}
