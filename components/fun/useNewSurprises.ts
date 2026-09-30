"use client";

import { useCallback, useRef } from "react";
import type { NewSurprisePayload, SurpriseFilter } from "@/lib/surprise";

/** What a load came back with. `stale` when a newer choice was made meanwhile, so it should be dropped. */
export type NewSurprisesLoad = { payload: NewSurprisePayload | null; busy: boolean; stale: boolean };

function keyOf(filter: SurpriseFilter): string {
  const params = new URLSearchParams();
  if (filter.shelf) params.set("shelf", filter.shelf);
  if (filter.length) params.set("length", filter.length);
  if (filter.mood) params.set("mood", filter.mood);
  return params.toString();
}

/**
 * Surprise me's "Something new" (SPEC §10), asked for by the choices. Each
 * combination is fetched once per open panel, so going back to one is
 * instant (`peek`). `busy` when the server said slow down.
 */
export function useNewSurprises() {
  const cache = useRef(new Map<string, NewSurprisePayload>());
  const latest = useRef(0);

  const peek = useCallback((filter: SurpriseFilter) => cache.current.get(keyOf(filter)), []);

  const load = useCallback(async (filter: SurpriseFilter): Promise<NewSurprisesLoad> => {
    const key = keyOf(filter);
    const ticket = ++latest.current;
    try {
      const response = await fetch(`/api/surprise/new?${key}`, { cache: "no-store" });
      if (!response.ok) return { payload: null, busy: response.status === 429, stale: ticket !== latest.current };
      const body = (await response.json()) as NewSurprisePayload;
      const payload = { titles: body.titles, notices: body.notices };
      cache.current.set(key, payload);
      return { payload, busy: false, stale: ticket !== latest.current };
    } catch {
      return { payload: null, busy: false, stale: ticket !== latest.current };
    }
  }, []);

  return { peek, load };
}
