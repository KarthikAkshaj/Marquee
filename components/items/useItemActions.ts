"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteItem,
  incrementItemProgress,
  setItemFavorite,
  setItemStatus,
  type ItemActionResult,
} from "@/lib/actions/items";
import { applyItemChange, type Item, type ItemChange } from "@/lib/items";
import type { ItemStatus } from "@/lib/status";

type PendingChange = { id: string; change: ItemChange };

/**
 * Status, +1, favourite and delete show up at once and save in the background
 * (SPEC §4). If a save fails, the transition ends with the server's rows
 * unchanged, so the optimistic change rolls itself back.
 */
export function useItemActions(items: Item[]) {
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
    toggleFavorite(item: Item) {
      const favorite = !item.is_favorite;
      run(item.id, { type: "favorite", favorite }, () => setItemFavorite(item.id, favorite));
    },
    remove(item: Item) {
      run(item.id, { type: "delete" }, () => deleteItem(item.id), () => toast.success(`Removed ${item.title}.`));
    },
  };
}
