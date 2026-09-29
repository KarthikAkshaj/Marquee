"use client";

import { useCallback, useRef, useState } from "react";
import type { SurprisePool } from "@/lib/surprise";

/**
 * Surprise me's titles, fetched fresh each time it opens so adds and starts
 * elsewhere count (SPEC §10). The last pool stays while it reloads. `failed`
 * when the latest load didn't come back, so the panel can offer a retry
 * rather than wait forever.
 */
export function useSurprisePool() {
  const [pool, setPool] = useState<SurprisePool | null>(null);
  const [failed, setFailed] = useState(false);
  const pending = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setFailed(false);
    try {
      const response = await fetch("/api/surprise", { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error(String(response.status));
      const body = (await response.json()) as SurprisePool;
      if (!controller.signal.aborted) setPool({ titles: body.titles, personal: body.personal });
    } catch {
      // Cancelled for a newer load: that one reports. Otherwise say so.
      if (!controller.signal.aborted) setFailed(true);
    }
  }, []);

  return { pool, failed, refresh };
}
