"use client";

import { useEffect, useEffectEvent } from "react";

/** The browser's close-request hook (Chrome and Edge, 120+). TypeScript's DOM types don't carry it yet. */
type CloseWatcherLike = { addEventListener: (type: "close", listener: () => void) => void; destroy: () => void };
type CloseWatcherConstructor = new () => CloseWatcherLike;

/**
 * Android's back button (and gesture) closes whatever is open on top, a
 * palette, a panel, a sheet, instead of leaving the page. CloseWatcher asks
 * the browser for the next back press without adding history entries, so it
 * can never race a navigation. Where it's missing (Safari, Firefox) nothing
 * changes: there's no back button on an iPhone to catch.
 */
export function useCloseWatcher(open: boolean, onClose: () => void) {
  const close = useEffectEvent(onClose);

  useEffect(() => {
    const Watcher = (window as Window & { CloseWatcher?: CloseWatcherConstructor }).CloseWatcher;
    if (!open || typeof Watcher !== "function") return;
    let watcher: CloseWatcherLike;
    try {
      watcher = new Watcher();
    } catch {
      return;
    }
    watcher.addEventListener("close", () => close());
    return () => watcher.destroy();
  }, [open]);
}
