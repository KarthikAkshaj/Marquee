"use client";

import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { DeleteItemDialog } from "@/components/items/DeleteItemDialog";
import { useItemActions } from "@/components/items/useItemActions";
import { Button } from "@/components/ui/Button";
import { categoryStyle } from "@/lib/categories";
import { countByStatus, filterByTitle, selectItems, type CategoryParams, type Item } from "@/lib/items";
import type { CategoryKind } from "@/lib/status";
import { cn } from "@/lib/utils";
import { AddItemDialog } from "./AddItemDialog";
import { CategoryToolbar } from "./CategoryToolbar";
import { EmptyShelf, type EmptyReason } from "./EmptyShelf";
import { ShelfItems } from "./ShelfItems";
import { StatusTabs } from "./StatusTabs";

type CategoryBrowserProps = {
  category: { id: string; name: string; slug: string; kind: CategoryKind; color: string };
  params: CategoryParams;
  /** Every title on the shelf. Tabs, counts and sort are worked out here so quick actions update them at once. */
  items: Item[];
};

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** The category page's interactive body (SPEC §8.5). */
export function CategoryBrowser({ category, params, items }: CategoryBrowserProps) {
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Item | null>(null);
  const filterRef = useRef<HTMLInputElement>(null);
  const shelf = useItemActions(items);

  // `/` focuses the filter, `N` adds a title (SPEC §8.7b).
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.key === "/") {
        event.preventDefault();
        filterRef.current?.focus();
      } else if (event.key === "n" || event.key === "N") {
        event.preventDefault();
        setAdding(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const counts = countByStatus(shelf.items);
  const visible = filterByTitle(selectItems(shelf.items, params), query);
  const reason: EmptyReason | null =
    visible.length > 0
      ? null
      : query.trim()
        ? { type: "filter", query }
        : counts.all === 0
          ? { type: "empty" }
          : params.fav
            ? { type: "favourites" }
            : params.status !== "all"
              ? { type: "status", status: params.status }
              : { type: "empty" };

  return (
    <>
      <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-6">
        <div className="flex items-end justify-between gap-3">
          <div className="flex min-w-0 items-baseline gap-3 md:gap-4">
            <h1 className="font-display opsz-120 text-[42px] leading-none wrap-break-word md:text-[54px]">
              {category.name}
            </h1>
            <p className="flex shrink-0 items-center gap-2 pb-1.5 font-mono text-12 text-text-muted md:pb-2.25 md:text-13">
              <span aria-hidden className={cn("size-2 rounded-full", categoryStyle(category.color).dot, categoryStyle(category.color).glow)} />
              {counts.all} {counts.all === 1 ? "title" : "titles"}
            </p>
          </div>
          <Button onClick={() => setAdding(true)} className="h-11 shrink-0 gap-1.5 px-3.5 text-13 shadow-cta-sm md:hidden">
            <Plus aria-hidden className="size-4" strokeWidth={2.4} />
            Add
          </Button>
        </div>
        <CategoryToolbar
          slug={category.slug}
          params={params}
          query={query}
          onQueryChange={setQuery}
          filterRef={filterRef}
          onAdd={() => setAdding(true)}
        />
      </header>

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
      <DeleteItemDialog
        title={deleting?.title ?? null}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) shelf.remove(deleting);
          setDeleting(null);
        }}
      />
    </>
  );
}
