"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteItem,
  incrementItemProgress,
  moveItem,
  setItemFavorite,
  setItemProgress,
  setItemStatus,
  updateItemDetails,
  type ItemActionResult,
} from "@/lib/actions/items";
import { applyItemChange, type Item, type ItemChange, type ItemDetails } from "@/lib/items";
import type { ItemStatus } from "@/lib/status";

type PendingChange = { id: string; change: ItemChange };

export type ShelfCategory = { id: string; name: string; slug: string; color: string };

/**
 * Every edit to a title shows up at once and saves in the background (SPEC §4).
 * If a save fails, the transition ends with the server's rows unchanged, so the
 * optimistic change rolls itself back and a toast says why.
 */
export function useItemActions(items: Item[]) {
  const router = useRouter();
  const [optimisticItems, addOptimistic] = useOptimistic(
    items,
    (state: Item[], { id, change }: PendingChange) => applyItemChange(state, id, change),
  );
  const [, startTransition] = useTransition();

  function run(id: string, change: ItemChange, save: () => Promise<ItemActionResult>, onSaved?: () => void) {
    startTransition(async () => {
      addOptimistic({ id, change });
      const result = await save();
      if (result.ok) onSaved?.();
      else toast.error(result.message);
    });
  }

  return {
    items: optimisticItems,
    setStatus(item: Item, status: ItemStatus) {
      if (status === item.status) return;
      run(item.id, { type: "status", status }, () => setItemStatus(item.id, status));
    },
    increment(item: Item) {
      run(item.id, { type: "increment" }, () => incrementItemProgress(item.id));
    },
    setProgress(item: Item, current: number, total: number | null) {
      if (current === item.progress_current && total === item.progress_total) return;
      run(item.id, { type: "progress", current, total }, () => setItemProgress(item.id, current, total));
    },
    toggleFavorite(item: Item) {
      const favorite = !item.is_favorite;
      run(item.id, { type: "favorite", favorite }, () => setItemFavorite(item.id, favorite));
    },
    updateDetails(item: Item, details: ItemDetails) {
      run(item.id, { type: "details", details }, () => updateItemDetails(item.id, details));
    },
    move(item: Item, to: ShelfCategory) {
      run(item.id, { type: "remove" }, () => moveItem(item.id, to.id), () =>
        toast.success(`Moved ${item.title} to ${to.name}.`, {
          action: { label: "Open", onClick: () => router.push(`/c/${encodeURIComponent(to.slug)}?item=${item.id}`) },
        }),
      );
    },
    remove(item: Item) {
      run(item.id, { type: "remove" }, () => deleteItem(item.id), () => toast.success(`Removed ${item.title}.`));
    },
  };
}

export type ItemActions = ReturnType<typeof useItemActions>;
