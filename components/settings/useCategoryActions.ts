"use client";

import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteCategory,
  reorderCategories,
  updateCategory,
  type CategoryActionResult,
} from "@/lib/actions/categories";
import { applyCategoryChange, type CategoryChange } from "@/lib/categories";
import type { CategoryWithCount } from "@/lib/queries";
import type { CategoryInput } from "@/lib/validators";

/**
 * Rename, retype, recolour, reorder and delete show at once and save behind
 * the scenes; a failed save rolls back and says why. Creating waits for the
 * server, since the new category needs its id and URL.
 */
export function useCategoryActions(categories: CategoryWithCount[]) {
  const [optimistic, addOptimistic] = useOptimistic(
    categories,
    (state: CategoryWithCount[], change: CategoryChange<CategoryWithCount>) => applyCategoryChange(state, change),
  );
  const [, startTransition] = useTransition();

  function run(change: CategoryChange<CategoryWithCount>, save: () => Promise<CategoryActionResult>, onSaved?: () => void) {
    startTransition(async () => {
      addOptimistic(change);
      const result = await save();
      if (result.ok) onSaved?.();
      else toast.error(result.message);
    });
  }

  return {
    categories: optimistic,
    update(category: CategoryWithCount, patch: Partial<CategoryInput>) {
      run({ type: "update", id: category.id, patch }, () => updateCategory(category.id, patch));
    },
    reorder(ids: string[]) {
      run({ type: "reorder", ids }, () => reorderCategories(ids));
    },
    remove(category: CategoryWithCount) {
      run({ type: "remove", id: category.id }, () => deleteCategory(category.id), () =>
        toast.success(`Deleted ${category.name}.`),
      );
    },
  };
}
