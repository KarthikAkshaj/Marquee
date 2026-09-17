"use client";

import { useEffect, useEffectEvent, type RefObject } from "react";

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** `/` focuses the filter, `N` adds a title (SPEC §8.7b). Off while a sheet or dialog is up. */
export function useShelfShortcuts(filterRef: RefObject<HTMLInputElement | null>, onAdd: () => void, enabled: boolean) {
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
    if (event.key === "/") {
      event.preventDefault();
      filterRef.current?.focus();
    } else if (event.key === "n" || event.key === "N") {
      event.preventDefault();
      onAdd();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
