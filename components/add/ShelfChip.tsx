import { categoryStyle } from "@/lib/categories";
import { cn } from "@/lib/utils";

/** "● Add to Anime": the fixed target when adding from a shelf's own panel. */
export function ShelfChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="flex h-7.5 items-center gap-1.75 rounded-full border border-white/8 bg-elevated px-2.75 whitespace-nowrap">
      <span aria-hidden className={cn("size-1.25 rounded-full", categoryStyle(color).dot)} />
      <span className="text-[11.5px] text-text">Add to {name}</span>
    </span>
  );
}
