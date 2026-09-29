"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AddTitlePanel } from "@/components/add/AddTitlePanel";
import { useAddHandler } from "@/components/palette/PaletteProvider";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { ItemSheet } from "@/components/items/ItemSheet";
import type { ItemQuickActions } from "@/components/items/QuickActions";
import { RoomLight } from "@/components/shell/RoomLight";
import { useItemActions, type ShelfCategory } from "@/components/items/useItemActions";
import { searchKindOf } from "@/lib/add";
import { countByStatus, filterByTitle, selectItems, type CategoryParams, type Item } from "@/lib/items";
import type { CategoryKind } from "@/lib/status";
import { AddItemDialog } from "./AddItemDialog";
import { CategoryHeader } from "./CategoryHeader";
import { EmptyShelf, emptyReason } from "./EmptyShelf";
import { ShelfItems } from "./ShelfItems";
import { StatusTabs } from "./StatusTabs";
import { useOpenItem } from "./useOpenItem";
import { useShelfShortcuts } from "./useShelfShortcuts";

type CategoryBrowserProps = {
  category: ShelfCategory & { kind: CategoryKind };
  /** Every shelf the viewer has, for "Move to category". */
  categories: ShelfCategory[];
  params: CategoryParams;
  /** Every title on the shelf. Tabs, counts and sort are worked out here so edits update them at once. */
  items: Item[];
};

/** Search first where the shelf has a provider (SPEC §8.7); by hand for custom shelves or from the search's last row. */
type Adding = { mode: "search"; query?: string } | { mode: "manual"; title: string } | null;

/** The category page's interactive body (SPEC §8.5) and its item sheet (§8.6). */
export function CategoryBrowser({ category, categories, params, items }: CategoryBrowserProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState<Adding>(null);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const shelf = useItemActions(items);
  const searchKind = searchKindOf(category.kind);
  const defaultStatus = params.status === "all" ? "planned" : params.status;
  const startAdding = () => setAdding(searchKind ? { mode: "search" } : { mode: "manual", title: "" });
  const sheet = useOpenItem(category.slug, params);
  // Closing starts at once: the sheet leaves on the tap or the drag's release, not when the address
  // catches up a moment later. Forgotten as soon as the address moves on.
  const [closing, setClosing] = useState<string | null>(null);
  if (closing !== null && sheet.itemId !== closing) setClosing(null);
  const openId = sheet.itemId !== closing ? sheet.itemId : null;
  // Looked up across the whole shelf, so a status change that moves it out of the tab keeps it open.
  const openItem = shelf.items.find((item) => item.id === openId) ?? null;
  const openTitle = (id: string) => {
    setClosing(null);
    sheet.open(id);
  };
  const closeTitle = () => {
    setClosing(sheet.itemId);
    sheet.close();
  };

  // The grid is remembered (ShelfItems is memo'd), so opening or closing a title doesn't redraw
  // every poster, which froze phones for a second on a big shelf. Its handlers stay the same
  // object for good and reach the latest shelf through this ref when they're used.
  const latest = useRef({ shelf, openTitle });
  useLayoutEffect(() => {
    latest.current = { shelf, openTitle };
  });
  const gridActions = useMemo<ItemQuickActions>(
    () => ({
      onOpen: (item) => latest.current.openTitle(item.id),
      onStatusChange: (item, status) => latest.current.shelf.setStatus(item, status),
      onIncrement: (item) => latest.current.shelf.increment(item),
      onToggleFavorite: (item) => latest.current.shelf.toggleFavorite(item),
      onDelete: (item) => setDeleting(item),
    }),
    [],
  );
  const endStamp = useCallback((id: string) => latest.current.shelf.endStamp(id), []);

  useShelfShortcuts(filterRef, startAdding, !openItem && !adding && !deleting);
  useAddHandler(startAdding);

  const counts = countByStatus(shelf.items);
  const visible = useMemo(() => filterByTitle(selectItems(shelf.items, params), query), [shelf.items, params, query]);
  const reason = emptyReason(visible.length, query, counts.all, params);

  return (
    <>
      {/* The shelf keeps its own colour; hovering a poster lends the room that title's (U14). */}
      <RoomLight base={null} />
      <CategoryHeader
        category={category}
        count={counts.all}
        params={params}
        query={query}
        onQueryChange={setQuery}
        filterRef={filterRef}
        onAdd={startAdding}
        unmatched={searchKind ? shelf.items.filter((item) => item.source === "manual").length : 0}
      />

      <div className="mt-6.5">
        <StatusTabs slug={category.slug} kind={category.kind} params={params} counts={counts} />
      </div>

      <section aria-label={`${category.name} titles`} className="pt-6 pb-10">
        {reason ? (
          <EmptyShelf
            kind={category.kind}
            slug={category.slug}
            params={params}
            reason={reason}
            onAdd={startAdding}
            onSearch={searchKind ? (text) => setAdding({ mode: "search", query: text }) : undefined}
            onClearFilter={() => setQuery("")}
          />
        ) : (
          <ShelfItems
            category={category}
            params={params}
            items={visible}
            actions={gridActions}
            stamps={shelf.stamps}
            onStamped={endStamp}
          />
        )}
      </section>

      {searchKind && (
        <AddTitlePanel
          open={adding?.mode === "search"}
          onOpenChange={(open) => !open && setAdding(null)}
          initialQuery={adding?.mode === "search" ? adding.query : undefined}
          category={{ ...category, kind: searchKind }}
          items={shelf.items}
          defaultStatus={defaultStatus}
          // The panel closes itself: for anime and films it first offers the rest of the run.
          onAdd={(result, status, openAfter) => {
            const item = shelf.addFromSearch(category, result, status);
            if (openAfter) openTitle(item.id);
          }}
          onAddMore={(extras) => shelf.addAllFromSearch(category, extras)}
          onOpenExisting={(id) => {
            setAdding(null);
            openTitle(id);
          }}
          onManual={(title) => setAdding({ mode: "manual", title })}
        />
      )}
      <AddItemDialog
        open={adding?.mode === "manual"}
        onOpenChange={(open) => !open && setAdding(null)}
        category={category}
        defaultStatus={defaultStatus}
        initialTitle={adding?.mode === "manual" ? adding.title : ""}
      />
      <ItemSheet
        item={openItem}
        category={category}
        categories={categories}
        actions={shelf}
        onClose={closeTitle}
        onDelete={setDeleting}
      />
      <DeleteItemDialog
        title={deleting?.title ?? null}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            if (deleting.id === openItem?.id) closeTitle();
            shelf.remove(deleting);
          }
          setDeleting(null);
        }}
      />
    </>
  );
}
