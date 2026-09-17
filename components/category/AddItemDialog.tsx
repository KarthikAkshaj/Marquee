"use client";

import { Loader2 } from "lucide-react";
import { Dialog } from "radix-ui";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createItem, type CreateItemState } from "@/lib/actions/items";
import { progressUnit } from "@/lib/items";
import type { CategoryKind, ItemStatus } from "@/lib/status";
import { StatusSegmented } from "@/components/items/StatusSegmented";

type AddItemDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: { id: string; name: string; kind: CategoryKind };
  defaultStatus: ItemStatus;
};

/** Manual add (SPEC §8.7 "Add manually"). Search-as-you-add arrives with the palette in Phase 3. */
export function AddItemDialog({ open, onOpenChange, category, defaultStatus }: AddItemDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[3px]" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-110 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-tile border border-white/10 bg-sheet shadow-modal">
          <AddItemForm category={category} defaultStatus={defaultStatus} onDone={() => onOpenChange(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

const initialState: CreateItemState = { status: "idle" };

function AddItemForm({
  category,
  defaultStatus,
  onDone,
}: Omit<AddItemDialogProps, "open" | "onOpenChange"> & { onDone: () => void }) {
  const [state, formAction, pending] = useActionState(createItem, initialState);
  const [status, setStatus] = useState<ItemStatus>(defaultStatus);
  const totalLabel = progressUnit(category.kind);
  // Partway through: say where you're up to instead of pressing +1 eight hundred times.
  const showCurrent = totalLabel !== null && (status === "in_progress" || status === "dropped");
  const typed = state.status === "error" ? state.values : undefined;

  const finish = useEffectEvent((title: string) => {
    toast.success(`Added ${title}.`);
    onDone();
  });

  useEffect(() => {
    if (state.status === "created") finish(state.title);
  }, [state]);

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="categoryId" value={category.id} />
      <input type="hidden" name="status" value={status} />

      <div className="border-b border-border px-5 pt-4.5 pb-3.5">
        <Dialog.Title className="font-display text-28 leading-[1.1]">Add a title</Dialog.Title>
        <Dialog.Description className="mt-1.25 text-12 text-text-muted">
          Straight onto your {category.name} shelf.
        </Dialog.Description>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4.5">
        <div>
          <label htmlFor="add-title" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
            Title
          </label>
          <Input id="add-title" name="title" required maxLength={200} autoComplete="off" defaultValue={typed?.title} />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            {/* The year it came out; when you started watching is tracked on its own. */}
            <label htmlFor="add-year" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
              Released
            </label>
            <Input
              id="add-year"
              name="year"
              inputMode="numeric"
              placeholder="2024"
              className="font-mono"
              defaultValue={typed?.year}
            />
          </div>
          {totalLabel && (
            <div className="flex-1">
              <label htmlFor="add-total" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
                {totalLabel}
              </label>
              <Input
                id="add-total"
                name="progressTotal"
                inputMode="numeric"
                placeholder="24"
                className="font-mono"
                defaultValue={typed?.progressTotal}
                aria-describedby="add-total-hint"
              />
              <p id="add-total-hint" className="mt-1.5 text-12 text-text-muted">
                {totalLabel === "Episodes" ? "Blank if it's still airing." : "Blank if you don't know."}
              </p>
            </div>
          )}
        </div>

        <div>
          <p id="add-status" className="label-mono mb-2 tracking-[.12em] text-text-muted">
            Status
          </p>
          <StatusSegmented kind={category.kind} value={status} onChange={setStatus} labelledBy="add-status" />
        </div>

        {showCurrent && (
          <div className="w-[calc(50%-6px)]">
            <label htmlFor="add-current" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
              {totalLabel === "Episodes" ? "On episode" : "Done so far"}
            </label>
            <Input
              id="add-current"
              name="progressCurrent"
              inputMode="numeric"
              placeholder="0"
              className="font-mono"
              defaultValue={typed?.progressCurrent}
            />
          </div>
        )}

        {state.status === "error" && (
          <p role="alert" className="text-13 text-dropped">
            {state.message}
          </p>
        )}
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/40 px-5 py-3.5">
        <Dialog.Close asChild>
          <Button type="button" variant="ghost" className="h-11 px-4 md:h-9.5">
            Cancel
          </Button>
        </Dialog.Close>
        <Button type="submit" disabled={pending} aria-busy={pending} className="h-11 px-4.5 shadow-cta-sm md:h-9.5">
          {pending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
          {pending ? "Adding…" : "Add title"}
        </Button>
      </div>
    </form>
  );
}
