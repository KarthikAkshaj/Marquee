"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MoveCategoryMenu } from "./MoveCategoryMenu";
import type { ShelfCategory } from "./useItemActions";

type ItemSheetActionsProps = {
  /** `footer` ends the scroll on desktop; `bar` is pinned to the bottom on phones. */
  variant: "footer" | "bar";
  currentId: string;
  categories: ShelfCategory[];
  onMove: (to: ShelfCategory) => void;
  onDelete: () => void;
};

/**
 * Move and delete. On phones delete is a trash icon plus "Delete" in muted red,
 * never a bare ✕, which reads as "close" (SPEC §8.3).
 */
export function ItemSheetActions({ variant, currentId, categories, onMove, onDelete }: ItemSheetActionsProps) {
  const bar = variant === "bar";
  return (
    <div
      className={cn(
        bar
          ? "flex shrink-0 items-center gap-2.5 border-t border-border bg-sheet/94 px-5 pt-3 pb-[max(1.5rem,env(safe-area-inset-bottom))] backdrop-blur-[18px] md:hidden"
          : "mx-7 hidden items-center justify-between border-t border-border pt-4 pb-7 md:flex",
      )}
    >
      <MoveCategoryMenu
        compact={bar}
        currentId={currentId}
        categories={categories}
        onMove={onMove}
        className={bar ? "h-11 flex-1 rounded-[11px]" : "rounded-nav px-3.25 py-2.25"}
      />
      <button
        type="button"
        onClick={onDelete}
        className={cn(
          "text-[12.5px] transition-colors",
          bar
            ? "flex h-11 items-center gap-2 rounded-[11px] border border-dropped-muted/28 bg-dropped-muted/10 px-3.75 text-dropped-muted hover:bg-dropped-muted/18 hover:text-dropped"
            : "rounded-[6px] px-1 text-text-muted hover:text-dropped",
        )}
      >
        {bar && <Trash2 aria-hidden className="size-3.75" strokeWidth={1.8} />}
        {bar ? "Delete" : "Delete title"}
      </button>
    </div>
  );
}
