"use client";

import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ImportList } from "@/lib/import/read-file";

type ListMenuProps = {
  lists: ImportList[];
  index: number;
  onPick: (index: number) => void;
};

/** "FROM watched.csv 412 ▾": which list to bring in when a file holds several (a backup's shelves, a zip, a workbook's sheets). */
export function ListMenu({ lists, index, onPick }: ListMenuProps) {
  const current = lists[index];
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <span className="font-mono text-[10px] tracking-[.12em] text-text-muted">FROM</span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={`List to import: ${current.name}, ${current.count} ${current.count === 1 ? "title" : "titles"}`}
          className="flex h-11 max-w-full min-w-0 items-center gap-2 rounded-[9px] border border-white/10 bg-elevated px-3.25 text-13 text-text transition-colors hover:border-accent/45 data-[state=open]:border-accent/45 md:h-9"
        >
          <span className="truncate">{current.name}</span>
          <span className="font-mono text-[11px] text-text-muted">{current.count}</span>
          <ChevronDown aria-hidden className="size-3.5 shrink-0 text-text-muted" strokeWidth={2} />
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="start"
            sideOffset={8}
            collisionPadding={16}
            className="z-50 max-h-(--radix-dropdown-menu-content-available-height) max-w-[calc(100vw-32px)] min-w-56 overflow-y-auto rounded-card border border-white/10 bg-menu p-1.5 shadow-menu"
          >
            <DropdownMenu.RadioGroup value={String(index)} onValueChange={(value) => onPick(Number(value))}>
              {lists.map((list, position) => (
                <DropdownMenu.RadioItem
                  key={`${position}-${list.name}`}
                  value={String(position)}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-nav px-2.5 text-13 outline-none select-none data-highlighted:bg-white/5 data-[state=checked]:text-accent md:min-h-9"
                >
                  <span className="min-w-0 flex-1 truncate">{list.name}</span>
                  <span className="font-mono text-[11px] text-text-muted">{list.count}</span>
                  <span className="grid size-3.5 place-items-center">
                    <DropdownMenu.ItemIndicator>
                      <Check aria-hidden className="size-3.5" strokeWidth={2.2} />
                    </DropdownMenu.ItemIndicator>
                  </span>
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      <span className="text-12 text-text-muted">{lists.length} lists in this file</span>
    </div>
  );
}
