"use client";

import { useRef, useState } from "react";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { ItemSheet } from "@/components/items/ItemSheet";
import { useItemActions, type ShelfCategory } from "@/components/items/useItemActions";
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

/** The category page's interactive body (SPEC §8.5) and its item sheet (§8.6). */
export function CategoryBrowser({ category, categories, params, items }: CategoryBrowserProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const shelf = useItemActions(items);
  const sheet = useOpenItem(category.slug, params);
  // Looked up across the whole shelf, so a status change that moves it out of the tab keeps it open.
  const openItem = shelf.items.find((item) => item.id === sheet.itemId) ?? null;

  useShelfShortcuts(filterRef, () => setAdding(true), !openItem && !adding && !deleting);

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
        onAdd={() => setAdding(true)}
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
            onAdd={() => setAdding(true)}
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

      <AddItemDialog
        open={adding}
        onOpenChange={setAdding}
        category={category}
        defaultStatus={params.status === "all" ? "planned" : params.status}
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
