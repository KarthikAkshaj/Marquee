"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { newItemId } from "@/lib/add";
import { addFromSearch, setItemStatus } from "@/lib/actions/items";
import { titleHref, type PaletteCategory } from "@/lib/palette";
import type { ItemStatus } from "@/lib/status";
import type { NewSurprise, SurpriseTitle } from "@/lib/surprise";

/**
 * What the reel's landing can do (SPEC §10): start one of yours, or add a new
 * one and start it or keep it for later. Each closes the panel and says what
 * happened, with a way to open the title.
 */
export function useSurpriseActions(shelves: ReadonlyMap<string, PaletteCategory>, onClose: () => void) {
  const router = useRouter();
  // Which status is being saved, so only that button says so.
  const [busy, setBusy] = useState<ItemStatus | null>(null);

  function done(message: string, categoryId: string, itemId: string) {
    const shelf = shelves.get(categoryId);
    onClose();
    toast.success(message, { action: shelf ? { label: "Open", onClick: () => router.push(titleHref(shelf, itemId)) } : undefined });
  }

  return {
    busy,
    async start(pick: SurpriseTitle) {
      setBusy("in_progress");
      const result = await setItemStatus(pick.id, "in_progress");
      setBusy(null);
      if (!result.ok) return void toast.error(result.message);
      done(`Started ${pick.title}. Enjoy the show.`, pick.category_id, pick.id);
    },
    async add(pick: NewSurprise, status: ItemStatus) {
      const id = newItemId();
      setBusy(status);
      const result = await addFromSearch({ id, categoryId: pick.categoryId, status, result: pick.result });
      setBusy(null);
      if (!result.ok) return void toast.error(result.message);
      const shelf = shelves.get(pick.categoryId)?.name;
      const where = shelf ? ` to your ${shelf}` : "";
      done(
        status === "in_progress" ? `Added ${pick.result.title}${where}. Enjoy the show.` : `Added ${pick.result.title}${where} for later.`,
        pick.categoryId,
        id,
      );
    },
  };
}
