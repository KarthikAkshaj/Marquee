"use client";

import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { categoryStyle } from "@/lib/categories";
import { cn } from "@/lib/utils";

export type MenuShelf = { id: string; name: string; color: string; itemCount: number };

type ShelfMenuProps = {
  shelves: MenuShelf[];
  value: string;
  onChange: (id: string) => void;
  label: string;
};

/** "● Anime ▾": pick one of your shelves, each with its colour and count. */
export function ShelfMenu({ shelves, value, onChange, label }: ShelfMenuProps) {
  const current = shelves.find((shelf) => shelf.id === value) ?? shelves[0];
  const style = categoryStyle(current.color);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`${label}: ${current.name}`}
        className="flex h-11 min-w-0 items-center gap-2 rounded-[9px] border border-white/10 bg-elevated px-3.25 text-13 text-text transition-colors hover:border-accent/45 data-[state=open]:border-accent/45 md:h-10"
      >
        <span aria-hidden className={cn("size-1.75 shrink-0 rounded-full", style.dot)} />
        <span className="truncate">{current.name}</span>
        <ChevronDown aria-hidden className="size-3.5 shrink-0 text-text-muted" strokeWidth={2} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-52 overflow-y-auto rounded-card border border-white/10 bg-menu p-1.5 shadow-menu"
        >
          <DropdownMenu.RadioGroup value={current.id} onValueChange={onChange}>
            {shelves.map((shelf) => (
              <DropdownMenu.RadioItem
                key={shelf.id}
                value={shelf.id}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-nav px-2.5 text-13 outline-none select-none data-highlighted:bg-white/5 data-[state=checked]:text-accent md:min-h-9"
              >
                <span aria-hidden className={cn("size-1.75 shrink-0 rounded-full", categoryStyle(shelf.color).dot)} />
                <span className="min-w-0 flex-1 truncate">{shelf.name}</span>
                <span className="font-mono text-[11px] text-text-muted">{shelf.itemCount}</span>
                <DropdownMenu.ItemIndicator>
                  <Check aria-hidden className="size-3.5" strokeWidth={2.2} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
