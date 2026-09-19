"use client";

import { useRef } from "react";

/**
 * Radix dialogs hand focus back to their own `Dialog.Trigger` when they close.
 * Ours open from cards, shortcuts and plain buttons, so focus used to drop to
 * the page. This remembers what had focus when a dialog opened and goes back
 * there when it closes; wire `remember` to `onOpenAutoFocus` and `restore` to
 * `onCloseAutoFocus`.
 */
export function useReturnFocus() {
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    remember: () => {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
    },
    restore: (event: Event) => {
      const target = returnTo.current;
      returnTo.current = null;
      // Gone (a deleted title's card, say): leave it to Radix.
      if (!target?.isConnected) return;
      event.preventDefault();
      target.focus({ preventScroll: true });
    },
  };
}
