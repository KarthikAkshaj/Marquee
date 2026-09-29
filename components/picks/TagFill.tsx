"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { fillTags } from "@/lib/actions/backfill";

/** Batches per visit: 500 titles. A bigger library carries on next time. */
const MAX_ROUNDS = 10;

/**
 * Fills in tags for anime and games added before Marquee kept them (SPEC §20),
 * once, in the background, the first time For you is opened: a request per
 * 50 titles. When it's found some, the page redraws with the finer taste.
 * Leaving part way is fine; the rest is picked up next time.
 */
export function TagFill({ gaps }: { gaps: number }) {
  const router = useRouter();
  // Showing from the start while there are gaps: the fill begins as soon as the page is up.
  const [working, setWorking] = useState(gaps > 0);

  useEffect(() => {
    // Safe to start twice (React does, in development): the same tags are written either way.
    if (gaps === 0) return;
    let left = false;

    void (async () => {
      let cursor: string | null = null;
      let filled = 0;
      for (let round = 0; round < MAX_ROUNDS && !left; round += 1) {
        const result = await fillTags(cursor);
        if (!result.ok) break;
        filled += result.filled;
        cursor = result.cursor;
        if (result.done) break;
      }
      if (left) return;
      setWorking(false);
      if (filled > 0) router.refresh();
    })();

    return () => {
      left = true;
    };
  }, [gaps, router]);

  if (!working) return null;
  return (
    <p role="status" className="mt-2 flex items-center gap-2 text-12 text-text-muted">
      <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-accent motion-reduce:animate-none" />
      Reading the finer details of your shelves. Your picks sharpen in a moment.
    </p>
  );
}
