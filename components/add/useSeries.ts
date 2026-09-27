"use client";

import { useCallback, useRef, useState } from "react";
import type { RelatedKind, SeriesResponse, SeriesTitle } from "@/lib/search/types";

export type SeriesState =
  | { state: "loading" }
  | { state: "failed" }
  /** `name` when the provider names the run ("Dune Collection"). */
  | { state: "done"; titles: SeriesTitle[]; name?: string };

type Store = {
  /** Keyed by the provider id each lookup was made for. */
  series: Record<string, SeriesState>;
  /** Every title in a loaded series → the id its series is stored under. */
  home: Record<string, string>;
};

/**
 * The rest of a title's run, an anime's seasons, films and specials or a
 * film's collection, looked up once and kept for the visit. Any title in a
 * loaded run finds it, so switching to another season doesn't ask again. A
 * failed lookup can be asked for again.
 */
export function useSeries(kind: RelatedKind | null) {
  const [store, setStore] = useState<Store>({ series: {}, home: {} });
  // Ids already asked for or covered by a loaded series.
  const covered = useRef(new Set<string>());

  const load = useCallback(
    (externalId: string) => {
      if (!kind || covered.current.has(externalId)) return;
      covered.current.add(externalId);
      setStore((current) => ({ ...current, series: { ...current.series, [externalId]: { state: "loading" } } }));
      void fetch(`/api/search?${new URLSearchParams({ kind, related: externalId })}`)
        .then((response) => response.json() as Promise<SeriesResponse>)
        .catch((): SeriesResponse => ({ results: [], error: "unavailable" }))
        .then((body) => {
          if (body.error) covered.current.delete(externalId);
          else body.results.forEach((title) => covered.current.add(title.externalId));
          const entry: SeriesState = body.error ? { state: "failed" } : { state: "done", titles: body.results, name: body.name };
          setStore((current) => ({
            series: { ...current.series, [externalId]: entry },
            home: body.error ? current.home : { ...Object.fromEntries(body.results.map((title) => [title.externalId, externalId])), ...current.home },
          }));
        });
    },
    [kind],
  );

  const seriesFor = (externalId: string): SeriesState | undefined =>
    store.series[externalId] ?? (store.home[externalId] ? store.series[store.home[externalId]] : undefined);

  /** Whether two titles belong to the same loaded series. */
  const related = (externalId: string, other: string) => {
    const entry = seriesFor(externalId) ?? seriesFor(other);
    return entry?.state === "done" && [externalId, other].every((id) => entry.titles.some((title) => title.externalId === id));
  };

  return { seriesFor, load, related };
}
