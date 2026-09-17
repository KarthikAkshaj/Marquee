"use client";

import { useRef, useState } from "react";
import { AddTitlePanel } from "@/components/add/AddTitlePanel";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { ItemSheet } from "@/components/items/ItemSheet";
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
type Adding = { mode: "search" } | { mode: "manual"; title: string } | null;

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
  // Looked up across the whole shelf, so a status change that moves it out of the tab keeps it open.
  const openItem = shelf.items.find((item) => item.id === sheet.itemId) ?? null;

  useShelfShortcuts(filterRef, startAdding, !openItem && !adding && !deleting);

  const counts = countByStatus(shelf.items);
  const visible = filterByTitle(selectItems(shelf.items, params), query);
  const reason = emptyReason(visible.length, query, counts.all, params);

  return (
    <>
      <CategoryHeader
        category={category}
        count={counts.all}
        params={params}
        query={query}
        onQueryChange={setQuery}
        filterRef={filterRef}
        onAdd={startAdding}
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
            onClearFilter={() => setQuery("")}
          />
        ) : (
          <ShelfItems
            category={category}
            params={params}
            items={visible}
            actions={{
              onOpen: (item) => sheet.open(item.id),
              onStatusChange: shelf.setStatus,
              onIncrement: shelf.increment,
              onToggleFavorite: shelf.toggleFavorite,
              onDelete: setDeleting,
            }}
          />
        )}
      </section>

      {searchKind && (
        <AddTitlePanel
          open={adding?.mode === "search"}
          onOpenChange={(open) => setAdding(open ? { mode: "search" } : null)}
          category={{ ...category, kind: searchKind }}
          items={shelf.items}
          defaultStatus={defaultStatus}
          onAdd={(result, status, openAfter) => {
            setAdding(null);
            const item = shelf.addFromSearch(category, result, status);
            if (openAfter) sheet.open(item.id);
          }}
          onOpenExisting={(id) => {
            setAdding(null);
            sheet.open(id);
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
        onClose={sheet.close}
        onDelete={setDeleting}
      />
      <DeleteItemDialog
        title={deleting?.title ?? null}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) {
            if (deleting.id === openItem?.id) sheet.close();
            shelf.remove(deleting);
          }
          setDeleting(null);
        }}
      />
    </>
  );
}
