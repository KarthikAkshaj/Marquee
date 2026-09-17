"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * Apple keyboards say ⌘/⌥ where everyone else says Ctrl/Alt (SPEC §8.8).
 * The server can't know, so it renders the Ctrl/Alt version and the browser
 * swaps it after hydrating.
 */
export function useIsMac(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.userAgent),
    () => false,
  );
}

export function shortcutKeys(isMac: boolean) {
  return { mod: isMac ? "⌘" : "Ctrl", alt: isMac ? "⌥" : "Alt" };
}
