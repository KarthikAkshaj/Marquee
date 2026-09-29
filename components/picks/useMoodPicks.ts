"use client";

import { useEffect, useState } from "react";
import type { PicksPayload } from "@/lib/recommend";

export type MoodPicks =
  | { status: "loading" }
  | { status: "ready"; payload: PicksPayload }
  | { status: "failed"; message: string };

type Settled = Exclude<MoodPicks, { status: "loading" }>;

function failure(status: number): string {
  if (status === 401) return "Your session ended. Sign in again to see picks.";
  if (status === 429) return "That's a lot of switching. Give it a few seconds.";
  return "Couldn't find picks for that just now.";
}

/**
 * "New to you" for the mood in the address (SPEC §20). The one the page
 * opened with comes from the server; any other is asked of /api/picks the
 * first time it's picked. Each is kept as it first arrived, so going back to
 * a mood is instant, and a title you plan stays put (now "On Anime") instead
 * of vanishing when the page refreshes around it.
 */
export function useMoodPicks(mood: string, initial: PicksPayload & { mood: string }) {
  const [settled, setSettled] = useState<ReadonlyMap<string, Settled>>(
    () => new Map([[initial.mood, { status: "ready", payload: { picks: initial.picks, notices: initial.notices } }]]),
  );
  const current = settled.get(mood);

  useEffect(() => {
    if (current) return;
    const controller = new AbortController();
    const settle = (entry: Settled) => setSettled((previous) => new Map(previous).set(mood, entry));
    fetch(`/api/picks?mood=${encodeURIComponent(mood)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return settle({ status: "failed", message: failure(response.status) });
        settle({ status: "ready", payload: (await response.json()) as PicksPayload });
      })
      .catch(() => {
        if (!controller.signal.aborted) settle({ status: "failed", message: failure(0) });
      });
    return () => controller.abort();
  }, [mood, current]);

  const retry = () =>
    setSettled((previous) => {
      const next = new Map(previous);
      next.delete(mood);
      return next;
    });

  return { picks: current ?? ({ status: "loading" } as MoodPicks), retry };
}
