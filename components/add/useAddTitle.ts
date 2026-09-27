"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { newItemId } from "@/lib/add";
import { addFromSearch, addManyFromSearch, deleteItem, deleteItems } from "@/lib/actions/items";
import type { ExtraPick } from "@/lib/match";
import { titleHref, type PaletteCategory } from "@/lib/palette";
import type { SearchResult } from "@/lib/search/types";
import type { ItemStatus } from "@/lib/status";
import { announceAdded, announceAddedMany, listTitles } from "./announceAdded";

/**
 * Adds a search result from anywhere (the palette), where there's no shelf on
 * screen to show it early: a "Adding…" toast that turns into "Added" with
 * Undo, then optionally opens the new title.
 */
export function useAddTitle() {
  const router = useRouter();

  return useCallback(
    async (category: PaletteCategory, result: SearchResult, status: ItemStatus, openAfter: boolean) => {
      const id = newItemId();
      const toastId = toast.loading(`Adding ${result.title}…`);
      const saved = await addFromSearch({ id, categoryId: category.id, status, result });
      if (!saved.ok) {
        toast.error(saved.message, { id: toastId });
        return;
      }

      const item = { id, title: result.title, cover_url: result.coverUrl ?? null, accent_color: result.accentColor ?? null };
      const undo = async () => {
        const removed = await deleteItem(id);
        if (removed.ok) toast.success(`Removed ${result.title}.`);
        else toast.error(removed.message);
      };
      announceAdded(item, category.name, () => void undo(), toastId);
      if (openAfter) router.push(titleHref(category, id));
    },
    [router],
  );
}

/** The rest of a run from the palette, saved together: one toast, one Undo for the lot. */
export function useAddTitles() {
  return useCallback(async (category: PaletteCategory, picks: readonly ExtraPick[]) => {
    if (picks.length === 0) return;
    const entries = picks.map(({ result, status }) => ({ id: newItemId(), status, result }));
    const toastId = toast.loading(`Adding ${listTitles(entries.map((entry) => entry.result.title))}…`);
    const saved = await addManyFromSearch({ categoryId: category.id, entries });
    if (!saved.ok) {
      toast.error(saved.message, { id: toastId });
      return;
    }

    const items = entries
      .filter((entry) => saved.added.includes(entry.id))
      .map(({ id, result }) => ({ id, title: result.title, cover_url: result.coverUrl ?? null, accent_color: result.accentColor ?? null }));
    if (items.length === 0) {
      toast.success(`Those are already on ${category.name}.`, { id: toastId });
      return;
    }
    const undo = async () => {
      const removed = await deleteItems(items.map((item) => item.id));
      if (removed.ok) toast.success(`Removed ${listTitles(items.map((item) => item.title))}.`);
      else toast.error(removed.message);
    };
    announceAddedMany(items, category.name, () => void undo(), toastId);
  }, []);
}
