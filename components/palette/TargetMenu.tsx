"use client";

import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { categoryStyle } from "@/lib/categories";
import type { PaletteCategory } from "@/lib/palette";
import { cn } from "@/lib/utils";

type TargetMenuProps = {
  categories: readonly PaletteCategory[];
  target: PaletteCategory;
  onChange: (category: PaletteCategory) => void;
  /** Put the caret back in the search box once a shelf is picked. */
  onDone: () => void;
};

/** "● Add to Anime ▾": which shelf an add lands on. Neutral chip with the shelf's dot (SPEC §8.8). */
export function TargetMenu({ categories, target, onChange, onDone }: TargetMenuProps) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label={`Add to ${target.name}. Change shelf`}
        className="relative flex h-7.5 items-center gap-1.75 rounded-full border border-white/8 bg-elevated px-2.75 whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:-inset-y-1.75 hover:border-border-strong md:after:hidden"
      >
        <span aria-hidden className={cn("size-1.25 rounded-full", categoryStyle(target.color).dot)} />
        <span className="text-[11.5px] text-text">Add to {target.name}</span>
        <ChevronDown aria-hidden className="size-3 text-text-muted" strokeWidth={2} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onDone();
          }}
          className="z-60 min-w-44 rounded-card border border-white/10 bg-menu p-1.5 shadow-menu"
        >
          <DropdownMenu.RadioGroup
            value={target.id}
            onValueChange={(id) => {
              const next = categories.find((category) => category.id === id);
              if (next) onChange(next);
            }}
          >
            {categories.map((category) => (
              <DropdownMenu.RadioItem
                key={category.id}
                value={category.id}
                className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-nav px-2.5 text-13 outline-none select-none data-highlighted:bg-white/5 md:min-h-9"
              >
                <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(category.color).dot)} />
                <span className="flex-1">{category.name}</span>
                <DropdownMenu.ItemIndicator>
                  <Check aria-hidden className="size-3.5 text-accent" strokeWidth={2.2} />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
