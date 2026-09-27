"use client";

import { toast } from "sonner";
import { setItemAccent } from "@/lib/actions/items";
import { accentFromCover } from "@/lib/image/accent-color";
import type { Item } from "@/lib/items";

type Added = Pick<Item, "id" | "title" | "cover_url" | "accent_color">;

/** "Dune", "Dune and Dune: Part Two", "Dune and 2 more": short enough for a toast. */
export function listTitles(titles: readonly string[]): string {
  if (titles.length <= 2) return titles.join(" and ");
  return `${titles[0]} and ${titles.length - 1} more`;
}

/** A cover colour worked out in the background when the provider didn't give one. */
function fillAccent(item: Added) {
  if (item.cover_url && !item.accent_color) {
    void accentFromCover(item.cover_url).then((color) => {
      if (color) void setItemAccent(item.id, color);
    });
  }
}

/**
 * After a search add has saved (SPEC §8.7): the toast with Undo, and a cover
 * colour worked out in the background when the provider didn't give one.
 */
export function announceAdded(item: Added, shelfName: string, onUndo: () => void, toastId?: string | number) {
  announceAddedMany([item], shelfName, onUndo, toastId);
}

/** The same for several titles saved together: one toast, one Undo for the lot. */
export function announceAddedMany(items: readonly Added[], shelfName: string, onUndo: () => void, toastId?: string | number) {
  toast.success(`Added ${listTitles(items.map((item) => item.title))} to ${shelfName}.`, {
    id: toastId,
    action: { label: "Undo", onClick: onUndo },
  });
  items.forEach(fillAccent);
}
