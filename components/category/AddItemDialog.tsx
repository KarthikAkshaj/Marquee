"use client";

import { Loader2 } from "lucide-react";
import { Dialog } from "radix-ui";
import { useActionState, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createItem, type CreateItemState } from "@/lib/actions/items";
import { ITEM_STATUSES, STATUS_STYLE, statusLabels, type CategoryKind, type ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

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
  const labels = statusLabels(category.kind);
  const totalLabel =
    category.kind === "anime" || category.kind === "series" ? "Episodes" : category.kind === "custom" ? "Total" : null;

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
        <Dialog.Title className="font-display text-[24px] leading-[1.1]">Add a title</Dialog.Title>
        <Dialog.Description className="mt-1.25 text-12 text-text-muted">
          Straight onto your {category.name} shelf.
        </Dialog.Description>
      </div>

      <div className="flex flex-col gap-4 px-5 py-4.5">
        <div>
          <label htmlFor="add-title" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
            Title
          </label>
          <Input id="add-title" name="title" required maxLength={200} autoComplete="off" />
        </div>

        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="add-year" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
              Year
            </label>
            <Input id="add-year" name="year" inputMode="numeric" placeholder="2024" className="font-mono" />
          </div>
          {totalLabel && (
            <div className="flex-1">
              <label htmlFor="add-total" className="label-mono mb-2 block tracking-[.12em] text-text-muted">
                {totalLabel}
              </label>
              <Input id="add-total" name="progressTotal" inputMode="numeric" placeholder="24" className="font-mono" />
            </div>
          )}
        </div>

        <fieldset>
          <legend className="label-mono mb-2 tracking-[.12em] text-text-muted">Status</legend>
          <div role="radiogroup" className="flex gap-1 rounded-[9px] border border-border bg-surface p-1">
            {ITEM_STATUSES.map((option) => {
              const selected = option === status;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setStatus(option)}
                  className={cn(
                    "min-h-11 flex-1 rounded-pill px-1 text-[11.5px] leading-tight transition-colors md:min-h-9 md:text-12",
                    selected ? cn(STATUS_STYLE[option].fill, "font-semibold text-accent-ink") : "text-text-muted hover:text-text",
                  )}
                >
                  {labels[option]}
                </button>
              );
            })}
          </div>
        </fieldset>

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
