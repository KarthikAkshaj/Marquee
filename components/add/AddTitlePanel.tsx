"use client";

import { Dialog } from "radix-ui";
import { useState } from "react";
import { findDuplicate } from "@/lib/add";
import type { Item } from "@/lib/items";
import type { ExtraPick } from "@/lib/match";
import { isRelatedKind, type SearchKind, type SearchResult } from "@/lib/search/types";
import type { ItemStatus } from "@/lib/status";
import { useReturnFocus } from "@/lib/use-return-focus";
import { AddSearch } from "./AddSearch";
import { AddTheRest } from "./AddTheRest";

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
  /** Other titles from the same run, ticked after an add: an anime's seasons, a film's collection. */
  onAddMore: (extras: ExtraPick[]) => void;
  onOpenExisting: (id: string) => void;
  onManual: (title: string) => void;
};

type FlowProps = Omit<AddTitlePanelProps, "open" | "onOpenChange"> & { onClose: () => void };

/**
 * Search, then for anime and films one more step with the rest of the run.
 * Mounted with the panel, so every opening starts back at search.
 */
function AddFlow({ onAdd, onAddMore, onClose, ...search }: FlowProps) {
  const [added, setAdded] = useState<{ result: SearchResult; status: ItemStatus } | null>(null);
  const kind = search.category.kind;

  if (added && isRelatedKind(kind)) {
    return (
      <AddTheRest
        added={added.result}
        status={added.status}
        kind={kind}
        shelf={search.category}
        blockedBy={(title) => (findDuplicate(title, search.items) ? "On your shelf" : null)}
        onAdd={onAddMore}
        onDone={onClose}
      />
    );
  }

  return (
    <AddSearch
      {...search}
      onAdd={(result, status, openAfter) => {
        onAdd(result, status, openAfter);
        // Alt+Enter asked to open the title, so that's where to go next.
        if (openAfter || !isRelatedKind(kind)) onClose();
        else setAdded({ result, status });
      }}
    />
  );
}

/** Search-as-you-add (SPEC §8.7, handoff §04): a glass panel floating over the shelf. */
export function AddTitlePanel({ open, onOpenChange, ...flow }: AddTitlePanelProps) {
  const returnFocus = useReturnFocus();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/66 backdrop-blur-[4px]" />
        <Dialog.Content
          onOpenAutoFocus={returnFocus.remember}
          onCloseAutoFocus={returnFocus.restore}
          aria-describedby={undefined}
          className="fixed top-4 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-165 -translate-x-1/2 flex-col overflow-hidden rounded-sheet border border-white/10 bg-menu/82 shadow-dialog backdrop-blur-[26px] backdrop-saturate-130 md:top-29.5 md:max-h-[calc(100dvh-150px)]"
        >
          <Dialog.Title className="sr-only">Add to {flow.category.name}</Dialog.Title>
          <AddFlow {...flow} onClose={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
