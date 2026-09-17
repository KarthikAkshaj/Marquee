"use client";

import { ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ShelfCategory } from "@/components/items/useItemActions";
import { categoryStyle } from "@/lib/categories";
import { cn } from "@/lib/utils";

type MoveCategoryMenuProps = {
  currentId: string;
  categories: ShelfCategory[];
  onMove: (to: ShelfCategory) => void;
  className?: string;
  /** Shorter wording where space is tight (the phone's action bar). */
  compact?: boolean;
};

/** "Move to category ▾" (SPEC §8.6): every other shelf, each with its colour. */
export function MoveCategoryMenu({ currentId, categories, onMove, className, compact = false }: MoveCategoryMenuProps) {
  const others = categories.filter((category) => category.id !== currentId);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        disabled={others.length === 0}
        className={cn(
          "flex items-center justify-center gap-2 border border-white/8 bg-elevated text-[12.5px] text-text transition-colors hover:border-white/18 disabled:cursor-not-allowed disabled:text-text-faint data-[state=open]:border-white/18",
          className,
        )}
      >
        {compact ? "Move category" : "Move to category"}
        <ChevronDown aria-hidden className="size-3.5 text-text-muted" strokeWidth={2} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          align="start"
          sideOffset={8}
          className="z-60 max-h-(--radix-dropdown-menu-content-available-height) min-w-(--radix-dropdown-menu-trigger-width) overflow-y-auto rounded-card border border-white/10 bg-menu p-1.5 shadow-menu md:min-w-52"
        >
          <DropdownMenu.Label className="label-mono px-2.5 pt-1.5 pb-1.5 text-text-muted">Move to</DropdownMenu.Label>
          {others.map((category) => {
            const style = categoryStyle(category.color);
            return (
              <DropdownMenu.Item
                key={category.id}
                onSelect={() => onMove(category)}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-nav px-2.5 text-13 outline-none select-none data-highlighted:bg-white/5 md:min-h-9"
              >
                <span aria-hidden className={cn("size-1.75 shrink-0 rounded-full", style.dot, style.glow)} />
                <span className="truncate">{category.name}</span>
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
