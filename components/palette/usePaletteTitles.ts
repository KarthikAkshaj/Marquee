"use client";

import { useCallback, useRef, useState } from "react";
import type { PaletteTitle } from "@/lib/palette";

/**
 * The viewer's titles for "Your titles", reloaded each time the palette opens
 * so adds and edits elsewhere show up. The last list stays while it reloads.
 */
export function usePaletteTitles() {
  const [titles, setTitles] = useState<PaletteTitle[] | null>(null);
  const pending = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    try {
      const response = await fetch("/api/titles", { signal: controller.signal, cache: "no-store" });
      if (!response.ok) return;
      const body = (await response.json()) as { titles: PaletteTitle[] };
      if (!controller.signal.aborted) setTitles(body.titles);
    } catch {
      // Offline or cancelled: keep whatever was there.
    }
  }, []);

  return { titles, refresh };
}
