"use client";

import { toast } from "sonner";
import { setItemAccent } from "@/lib/actions/items";
import { accentFromCover } from "@/lib/image/accent-color";
import type { Item } from "@/lib/items";

type Added = Pick<Item, "id" | "title" | "cover_url" | "accent_color">;

/**
 * After a search add has saved (SPEC §8.7): the toast with Undo, and a cover
 * colour worked out in the background when the provider didn't give one.
 */
export function announceAdded(item: Added, shelfName: string, onUndo: () => void, toastId?: string | number) {
  toast.success(`Added ${item.title} to ${shelfName}.`, {
    id: toastId,
    action: { label: "Undo", onClick: onUndo },
  });
  if (item.cover_url && !item.accent_color) {
    void accentFromCover(item.cover_url).then((color) => {
      if (color) void setItemAccent(item.id, color);
    });
  }
}
