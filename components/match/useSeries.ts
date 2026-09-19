"use client";

import { useCallback, useRef, useState } from "react";
import type { SeriesResponse, SeriesTitle } from "@/lib/search/types";

export type SeriesState = { state: "loading" } | { state: "failed" } | { state: "done"; titles: SeriesTitle[] };

type Store = {
  /** Keyed by the AniList id each lookup was made for. */
  series: Record<string, SeriesState>;
  /** Every title in a loaded series → the id its series is stored under. */
  home: Record<string, string>;
};

/**
 * The rest of an anime's series (seasons, films, specials), looked up when a
 * row's picker opens and kept for the visit. Any title in a loaded series finds
 * it, so switching the match to another season doesn't ask AniList again. A
 * failed lookup can be asked for again.
 */
export function useSeries() {
  const [store, setStore] = useState<Store>({ series: {}, home: {} });
  // Ids already asked for or covered by a loaded series.
  const covered = useRef(new Set<string>());

  const load = useCallback((externalId: string) => {
    if (covered.current.has(externalId)) return;
    covered.current.add(externalId);
    setStore((current) => ({ ...current, series: { ...current.series, [externalId]: { state: "loading" } } }));
    void fetch(`/api/search?${new URLSearchParams({ kind: "anime", related: externalId })}`)
      .then((response) => response.json() as Promise<SeriesResponse>)
      .catch((): SeriesResponse => ({ results: [], error: "unavailable" }))
      .then((body) => {
        if (body.error) covered.current.delete(externalId);
        else body.results.forEach((title) => covered.current.add(title.externalId));
        setStore((current) => ({
          series: { ...current.series, [externalId]: body.error ? { state: "failed" } : { state: "done", titles: body.results } },
          home: body.error ? current.home : { ...Object.fromEntries(body.results.map((title) => [title.externalId, externalId])), ...current.home },
        }));
      });
  }, []);

  const seriesFor = (externalId: string): SeriesState | undefined =>
    store.series[externalId] ?? (store.home[externalId] ? store.series[store.home[externalId]] : undefined);

  /** Whether two titles belong to the same loaded series. */
  const related = (externalId: string, other: string) => {
    const entry = seriesFor(externalId) ?? seriesFor(other);
    return entry?.state === "done" && [externalId, other].every((id) => entry.titles.some((title) => title.externalId === id));
  };

  return { seriesFor, load, related };
}
