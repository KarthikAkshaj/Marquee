"use client";

import { AlertDialog } from "radix-ui";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";

type ConfirmDialogProps = {
  open: boolean;
  /** Serif, 28px: e.g. "Remove <em>Title</em> from your marquee?" */
  title: ReactNode;
  description: ReactNode;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
};

/** The red-edged confirm every destructive action goes through. */
export function ConfirmDialog({ open, title, description, cancelLabel, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(next) => !next && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[3px]" />
        <AlertDialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-32px)] max-w-109 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-tile border border-dropped-muted/30 bg-sheet shadow-modal">
          <div className="px-5.5 pt-5 pb-5">
            <AlertDialog.Title className="font-display text-28 leading-[1.1] text-balance wrap-break-word">
              {title}
            </AlertDialog.Title>
            <AlertDialog.Description className="mt-3 text-13 leading-[1.6] text-text-muted">
              {description}
            </AlertDialog.Description>
          </div>
          <div className="flex items-center justify-end gap-2.5 border-t border-border bg-bg/40 px-5.5 py-3.5">
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" className="h-11 px-4 text-13 md:h-9.5">
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button variant="danger" onClick={onConfirm} className="h-11 px-4.5 text-13 md:h-9.5">
                {confirmLabel}
              </Button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
