"use client";

import { Dialog } from "radix-ui";
import { useState } from "react";
import { toast } from "sonner";
import { StatusStepper } from "@/components/add/StatusStepper";
import { Button } from "@/components/ui/Button";
import { copySharedTitles, undoCopies, type Copied } from "@/lib/actions/shared";
import type { PublicTitle, ShelfAccess, ViewerCopy, ViewerShelf } from "@/lib/public-profile";
import { stepStatus, type CategoryKind, type ItemStatus } from "@/lib/status";
import { useCloseWatcher } from "@/lib/use-close-watcher";
import { useReturnFocus } from "@/lib/use-return-focus";
import { COPIES_PER_SAVE } from "@/lib/validators";
import { ShelfChoice } from "./ShelfChoice";

type AddAllDialogProps = {
  open: boolean;
  onClose: () => void;
  access: ShelfAccess;
  kind: CategoryKind;
  /** The titles to copy: what's on the tab, less what's yours already. */
  titles: PublicTitle[];
  /** How many on the tab are yours already. */
  yours: number;
  /** Your shelves of that kind. */
  shelves: ViewerShelf[];
  /** "Flux's Anime": where they come from. */
  from: string;
  onAdded: (copies: Record<string, ViewerCopy>) => void;
  onUndone: (sharedIds: string[]) => void;
};

const count = (n: number) => `${n.toLocaleString("en")} ${n === 1 ? "title" : "titles"}`;

function batches<T>(list: T[]): T[][] {
  return Array.from({ length: Math.ceil(list.length / COPIES_PER_SAVE) }, (_, index) =>
    list.slice(index * COPIES_PER_SAVE, (index + 1) * COPIES_PER_SAVE),
  );
}

/**
 * Add all (SPEC §19): a whole shared shelf, or the tab you're on, onto one of
 * yours in one go, 500 at a time, with an Undo for the lot.
 */
export function AddAllDialog({ open, onClose, access, kind, titles, yours, shelves, from, onAdded, onUndone }: AddAllDialogProps) {
  useCloseWatcher(open, onClose);
  const returnFocus = useReturnFocus();
  const [shelfId, setShelfId] = useState(shelves[0]?.id ?? "");
  const [status, setStatus] = useState<ItemStatus>("planned");
  const [done, setDone] = useState<number | null>(null);
  const shelf = shelves.find((candidate) => candidate.id === shelfId) ?? shelves[0];
  const busy = done !== null;
  // The numbers as they stood while open, so they don't drop to nothing as the added titles leave during the exit.
  const [shown, setShown] = useState({ titles: titles.length, yours });
  if (open && (shown.titles !== titles.length || shown.yours !== yours)) setShown({ titles: titles.length, yours });

  async function addAll() {
    if (!shelf) return;
    const made: Copied[] = [];
    let already = 0;
    let problem: string | null = null;
    setDone(0);
    for (const batch of batches(titles)) {
      const result = await copySharedTitles({ access, itemIds: batch.map((title) => title.id), categoryId: shelf.id, status });
      if (!result.ok) {
        problem = result.message;
        break;
      }
      made.push(...result.added);
      already += result.already;
      setDone(made.length + already);
    }
    setDone(null);
    onClose();

    if (made.length > 0) {
      onAdded(Object.fromEntries(made.map((copy) => [copy.shared, { item: copy.item, shelf: shelf.id }])));
      const extra = problem ? ` The rest didn't go in: ${problem}` : already > 0 ? ` ${count(already)} were yours already.` : "";
      toast.success(`Added ${count(made.length)} to your ${shelf.name}.${extra}`, {
        action: { label: "Undo", onClick: () => void undo(made, shelf.name) },
      });
    } else {
      toast.error(problem ?? "They're all on your shelves already.");
    }
  }

  async function undo(made: Copied[], shelfName: string) {
    for (const batch of batches(made)) {
      const result = await undoCopies(batch.map((copy) => copy.item));
      if (!result.ok) return void toast.error("Couldn't take them all back. Remove the rest from your shelf.");
      onUndone(batch.map((copy) => copy.shared));
    }
    toast.success(`Taken back off your ${shelfName}.`);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && !busy && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim-motion fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[3px]" />
        <Dialog.Content
          onOpenAutoFocus={returnFocus.remember}
          onCloseAutoFocus={returnFocus.restore}
          className="panel-motion fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-109 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-tile border border-white/10 bg-sheet shadow-modal"
        >
          <div className="flex flex-col gap-4 px-5.5 pt-5 pb-5">
            <div>
              <Dialog.Title className="font-display text-28 leading-[1.1] text-balance">Add {count(shown.titles)} to your shelves?</Dialog.Title>
              <Dialog.Description className="mt-3 text-13 leading-[1.6] text-text-muted">
                From {from}. Their ratings, notes and progress stay theirs.
                {shown.yours > 0 && ` ${count(shown.yours)} you have already ${shown.yours === 1 ? "is" : "are"} skipped.`}
              </Dialog.Description>
            </div>
            {shelves.length > 1 && <ShelfChoice shelves={shelves} value={shelf?.id ?? ""} onChange={setShelfId} name="add-all-shelf" />}
            <div className="self-start">
              <StatusStepper kind={kind} value={status} onStep={(direction) => setStatus(stepStatus(status, direction))} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/40 px-5.5 py-3.5">
            {busy && titles.length > COPIES_PER_SAVE && (
              <p aria-live="polite" className="mr-auto font-mono text-12 text-text-muted">
                {done.toLocaleString("en")} / {shown.titles.toLocaleString("en")}
              </p>
            )}
            <Dialog.Close asChild>
              <Button variant="ghost" disabled={busy} className="h-11 px-4 text-13 md:h-9.5">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={() => void addAll()} disabled={busy || !shelf} aria-busy={busy} className="h-11 px-4.5 text-13 shadow-cta-sm md:h-9.5">
              {busy ? "Adding" : shelf ? `Add to ${shelf.name}` : "Add"}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
