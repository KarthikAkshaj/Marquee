"use client";

import { useEffect, useState } from "react";
import type { SearchKind, SearchResponse, SearchType } from "@/lib/search/types";

const DEBOUNCE_MS = 250;
export const MIN_QUERY = 2;

/** Good answers for this tab's lifetime, so reopening the panel or backspacing is instant. */
const answered = new Map<string, SearchResponse>();

const keyFor = (kind: SearchKind, type: SearchType, query: string) => `${kind}:${type}:${query.trim().replace(/\s+/g, " ").toLowerCase()}`;

export type MetadataSearch = {
  /** Results for the query, or the last ones shown while the next arrive. */
  response: SearchResponse | undefined;
  loading: boolean;
  /** Nothing to search: no provider, or the query is too short. */
  idle: boolean;
};

/**
 * Live results from /api/search (SPEC §7): debounced, cancelled when the query
 * moves on, and cached per tab. Failures aren't cached, so reopening retries.
 * On an anime shelf, `type` switches between the anime and its comics (U5).
 */
export function useMetadataSearch(kind: SearchKind | null, query: string, type: SearchType = "anime"): MetadataSearch {
  const idle = !kind || query.trim().length < MIN_QUERY;
  const key = idle ? null : keyFor(kind, type, query);
  const [answers, setAnswers] = useState<ReadonlyMap<string, SearchResponse>>(() => new Map(answered));
  const [lastShown, setLastShown] = useState<{ source: string; response: SearchResponse } | null>(null);
  const source = `${kind}:${type}`;

  useEffect(() => {
    if (!key || !kind || answers.has(key)) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      let body: SearchResponse;
      try {
        const params = new URLSearchParams({ kind, q: query.trim(), ...(type === "manga" ? { type } : {}) });
        const response = await fetch(`/api/search?${params}`, { signal: controller.signal });
        body = (await response.json()) as SearchResponse;
      } catch {
        if (controller.signal.aborted) return;
        body = { results: [], error: "unavailable" };
      }
      if (controller.signal.aborted) return;
      if (!body.error) answered.set(key, body);
      setAnswers((previous) => new Map(previous).set(key, body));
      setLastShown({ source, response: body });
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [key, kind, type, source, query, answers]);

  const current = key ? answers.get(key) : undefined;
  return {
    // Stale results only stand in for the same search; switching shelves, or anime and manga, starts clean.
    response: key ? (current ?? (lastShown?.source === source ? lastShown.response : undefined)) : undefined,
    loading: key !== null && current === undefined,
    idle,
  };
}
