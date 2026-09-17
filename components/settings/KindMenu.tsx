"use client";

import { Check, ChevronDown } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { CATEGORY_KINDS, KIND_NAMES } from "@/lib/categories";
import { statusLabels, type CategoryKind } from "@/lib/status";

type KindMenuProps = {
  kind: CategoryKind;
  /** For the trigger's label, e.g. "Type of Anime". */
  categoryName: string;
  onChange: (kind: CategoryKind) => void;
};

/** A category's type sets its status words and whether it counts episodes. */
export function KindMenu({ kind, categoryName, onChange }: KindMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={`Type of ${categoryName}: ${KIND_NAMES[kind]}`}
        className="flex h-11 shrink-0 items-center gap-2 rounded-nav border border-white/8 bg-elevated px-2.75 text-12 text-text transition-colors hover:border-accent/45 data-[state=open]:border-accent/45 md:h-8"
      >
        {KIND_NAMES[kind]}
        <ChevronDown aria-hidden className="size-3.5 text-text-muted" strokeWidth={2} />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 w-64 rounded-card border border-white/10 bg-menu p-1.5 shadow-menu"
        >
          <DropdownMenu.RadioGroup value={kind} onValueChange={(value) => value !== kind && onChange(value as CategoryKind)}>
            {CATEGORY_KINDS.map((option) => {
              const words = statusLabels(option);
              return (
                <DropdownMenu.RadioItem
                  key={option}
                  value={option}
                  className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-nav px-2.5 py-1.5 outline-none select-none data-highlighted:bg-white/5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-13">{KIND_NAMES[option]}</span>
                    <span className="block truncate text-[11.5px] text-text-muted">
                      {words.planned} · {words.in_progress} · {words.completed}
                    </span>
                  </span>
                  <DropdownMenu.ItemIndicator>
                    <Check aria-hidden className="size-3.5 text-accent" strokeWidth={2.2} />
                  </DropdownMenu.ItemIndicator>
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
