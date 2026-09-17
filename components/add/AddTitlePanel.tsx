"use client";

import { Dialog } from "radix-ui";
import type { Item } from "@/lib/items";
import type { SearchKind, SearchResult } from "@/lib/search/types";
import type { ItemStatus } from "@/lib/status";
import { AddSearch } from "./AddSearch";

export type AddTitlePanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { id: string; name: string; color: string; kind: SearchKind };
  /** The shelf's titles, to spot duplicates. */
  items: Item[];
  defaultStatus: ItemStatus;
  /** Start with this already typed (the filter hand-off). */
  initialQuery?: string;
  onAdd: (result: SearchResult, status: ItemStatus, openAfter: boolean) => void;
  onOpenExisting: (id: string) => void;
  onManual: (title: string) => void;
};

/** Search-as-you-add (SPEC §8.7, handoff §04): a glass panel floating over the shelf. */
export function AddTitlePanel({ open, onOpenChange, ...search }: AddTitlePanelProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/66 backdrop-blur-[4px]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed top-4 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-165 -translate-x-1/2 flex-col overflow-hidden rounded-sheet border border-white/10 bg-menu/82 shadow-dialog backdrop-blur-[26px] backdrop-saturate-130 md:top-29.5 md:max-h-[calc(100dvh-150px)]"
        >
          <Dialog.Title className="sr-only">Add to {search.category.name}</Dialog.Title>
          <AddSearch {...search} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
