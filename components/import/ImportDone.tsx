"use client";

import Link from "next/link";
import { useState } from "react";
import { BulbRing } from "@/components/fun/BulbRing";
import { Button } from "@/components/ui/Button";
import { CountValue } from "@/components/ui/CountValue";

type ImportDoneProps = {
  added: number;
  skippedDuplicates: number;
  leftOut: number;
  shelf: { name: string; slug: string };
  /** The shelf has a search provider, so Find covers can match what was imported. */
  canMatch: boolean;
  onAgain: () => void;
};

/** The bulbs round the card chase for a moment, then go out and leave the page. */
function CurtainBulbs() {
  const [on, setOn] = useState(true);
  if (!on) return null;
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0 animate-bulbs-once"
      // Its own fade, not the ring's, which ends first and bubbles up.
      onAnimationEnd={(event) => event.target === event.currentTarget && setOn(false)}
    >
      <BulbRing lit radius="16" count={64} />
    </span>
  );
}

/**
 * "Imported 143 · skipped 6 duplicates" (SPEC §8.9), then off to the shelf.
 * The curtain call (U40): IMPORTED and the count stamped on the card, and the
 * bulbs round it chasing once.
 */
export function ImportDone({ added, skippedDuplicates, leftOut, shelf, canMatch, onAgain }: ImportDoneProps) {
  const notes = [
    `Imported ${added}`,
    skippedDuplicates > 0 && `skipped ${skippedDuplicates} ${skippedDuplicates === 1 ? "duplicate" : "duplicates"}`,
    leftOut > 0 && `left out ${leftOut}`,
  ].filter(Boolean);

  return (
    <div className="relative flex flex-col items-start gap-5 rounded-[12px] border border-border bg-surface px-5 py-7 surface-highlight md:px-8 md:py-9">
      <div
        aria-hidden
        className="flex rotate-[-8deg] animate-stamp-slam flex-col items-center rounded-[6px] border-2 border-completed bg-bg/60 px-4 py-2.25 text-completed shadow-[0_0_28px_color-mix(in_oklab,var(--color-completed)_35%,transparent)] outline-1 outline-offset-[-6px] outline-completed/50 outline-dashed lite:animate-none md:absolute md:top-7 md:right-8"
      >
        <span className="font-mono text-[10px] font-semibold tracking-[.3em]">IMPORTED</span>
        <span className="mt-0.5 font-mono text-[28px] leading-none font-bold tracking-[-.02em]">
          <CountValue value={added} delayMs={320} />
        </span>
        <span className="mt-1 font-mono text-[8.5px] tracking-[.3em] text-completed/80">NOW SHOWING</span>
      </div>

      <p role="status" className="font-mono text-[13px] text-completed">
        {notes.join(" · ")}
      </p>
      <p className="max-w-120 text-14 leading-[1.6] text-text-muted">
        They&apos;re on your {shelf.name} shelf with the statuses you picked, in the order they were in your list.
        {canMatch && " Next, find their covers: we'll look each one up and you confirm the matches."}
      </p>
      <div className="flex flex-wrap gap-2.5">
        {canMatch && (
          <Button asChild className="h-11 px-5 shadow-cta-sm">
            <Link href={`/c/${encodeURIComponent(shelf.slug)}/match`}>Find covers</Link>
          </Button>
        )}
        <Button asChild variant={canMatch ? "secondary" : "primary"} className={canMatch ? "h-11 px-4.5" : "h-11 px-5 shadow-cta-sm"}>
          <Link href={`/c/${encodeURIComponent(shelf.slug)}`}>Open {shelf.name}</Link>
        </Button>
        <Button variant="secondary" onClick={onAgain} className="h-11 px-4.5">
          Import another list
        </Button>
      </div>
      <CurtainBulbs />
    </div>
  );
}
