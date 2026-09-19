"use client";

import { useEffect, useState } from "react";
import { bestMatch } from "@/lib/match";
import type { ManualTitle } from "@/lib/queries";
import type { SearchKind, SearchResponse, SearchResult } from "@/lib/search/types";

export type MatchRowState = {
  item: ManualTitle;
  state: "waiting" | "done" | "failed";
  candidates: SearchResult[];
  /** Index into candidates, or null for "leave it as it is". */
  choice: number | null;
  /** The pick was close enough to tick without asking. */
  sure: boolean;
  include: boolean;
};

type MatchReply = { results: SearchResult[][]; error?: SearchResponse["error"] };

const BATCH = 10;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function post(kind: SearchKind, queries: string[]): Promise<MatchReply> {
  try {
    const response = await fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, queries }),
    });
    return (await response.json()) as MatchReply;
  } catch {
    return { results: [], error: "unavailable" };
  }
}

function resolved(row: MatchRowState, candidates: SearchResult[], failed: boolean): MatchRowState {
  const match = bestMatch(row.item.title, row.item.year, candidates);
  return {
    ...row,
    state: failed ? "failed" : "done",
    candidates,
    choice: match?.index ?? null,
    sure: match?.confident ?? false,
    include: match?.confident ?? false,
  };
}

/**
 * Looks every hand-added title up, ten at a time, and fills rows in as the
 * answers arrive. Waits and retries when the search limit is hit. Rows can be
 * re-searched with different words, re-picked and ticked.
 */
export function useMatching(kind: SearchKind, items: ManualTitle[]) {
  // The first list is the one being matched; saves refresh `items` underneath.
  const [initial] = useState(items);
  const [rows, setRows] = useState<MatchRowState[]>(() =>
    initial.map((item) => ({ item, state: "waiting", candidates: [], choice: null, sure: false, include: false })),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      for (let start = 0; start < initial.length && !cancelled; start += BATCH) {
        const batch = initial.slice(start, start + BATCH);
        let reply = await post(kind, batch.map((item) => item.title));
        for (let tries = 0; reply.error === "rate_limited" && tries < 5 && !cancelled; tries += 1) {
          await wait(4000);
          reply = await post(kind, batch.map((item) => item.title));
        }
        if (cancelled) return;
        const byId = new Map(batch.map((item, index) => [item.id, reply.results[index] ?? []]));
        setRows((current) =>
          current.map((row) => (byId.has(row.item.id) ? resolved(row, byId.get(row.item.id) ?? [], Boolean(reply.error)) : row)),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [kind, initial]);

  const update = (id: string, change: (row: MatchRowState) => MatchRowState) =>
    setRows((current) => current.map((row) => (row.item.id === id ? change(row) : row)));

  return {
    rows,
    remaining: rows.filter((row) => row.state === "waiting").length,
    choose: (id: string, choice: number | null) => update(id, (row) => ({ ...row, choice, include: choice !== null })),
    toggle: (id: string, include: boolean) => update(id, (row) => ({ ...row, include: include && row.choice !== null })),
    /** Try other words for one title, e.g. its full or original name. */
    async research(id: string, query: string) {
      update(id, (row) => ({ ...row, state: "waiting" }));
      const params = new URLSearchParams({ kind, q: query });
      const body = (await fetch(`/api/search?${params}`)
        .then((response) => response.json())
        .catch(() => ({ results: [], error: "unavailable" }))) as SearchResponse;
      update(id, (row) => {
        const next = resolved({ ...row, item: { ...row.item, title: query } }, body.results, Boolean(body.error));
        // Matching was scored against the new words, but the row keeps the name you had.
        return { ...next, item: row.item };
      });
    },
    forget: (ids: string[]) => setRows((current) => current.filter((row) => !ids.includes(row.item.id))),
  };
}
