"use client";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

type DeleteItemDialogProps = {
  /** The title being removed; null keeps the dialog closed. */
  title: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

/** "Remove *Title* from your marquee?" (SPEC §9.7). */
export function DeleteItemDialog({ title, onCancel, onConfirm }: DeleteItemDialogProps) {
  return (
    <ConfirmDialog
      open={title !== null}
      title={
        <>
          Remove <em className="text-dropped">{title}</em> from your marquee?
        </>
      }
      description="Its progress, rating and notes go with it. There's no undo."
      cancelLabel="Keep it"
      confirmLabel="Remove"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
