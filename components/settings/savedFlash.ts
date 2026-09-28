"use client";

import { useSyncExternalStore } from "react";

/**
 * "Saved" on the save bar for a moment after a save lands (U33). Kept outside
 * React because the profile form remounts with the saved values a beat after
 * saving, and the moment has to outlast it.
 */
const listeners = new Set<() => void>();
let flashing = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Show "Saved" on the bar for a moment. */
export function flashSaved(ms = 1500) {
  flashing = true;
  notify();
  clearTimeout(timer);
  timer = setTimeout(() => {
    flashing = false;
    notify();
  }, ms);
}

export function useSavedFlash() {
  return useSyncExternalStore(
    subscribe,
    () => flashing,
    () => false,
  );
}
