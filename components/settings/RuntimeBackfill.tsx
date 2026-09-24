"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { fillRuntimes } from "@/lib/actions/backfill";

/** A stop, in case a cursor ever failed to advance. Far past any real shelf. */
const MAX_ROUNDS = 400;

/**
 * Settings → Data: looks up how long the titles you already have actually run,
 * so screen time in the year in review stops being an estimate. The card is
 * only rendered while there is something left to fill in.
 */
export function RuntimeBackfill({ pending }: { pending: number }) {
  const [busy, setBusy] = useState(false);
  const [filled, setFilled] = useState(0);

  async function run() {
    setBusy(true);
    setFilled(0);
    let cursor: string | null = null;
    let total = 0;

    try {
      for (let round = 0; round < MAX_ROUNDS; round += 1) {
        const result = await fillRuntimes(cursor);
        if (!result.ok) return void toast.error(result.message);
        total += result.filled;
        setFilled(total);
        if (result.done) break;
        cursor = result.cursor;
      }
      if (total === 0) {
        // Everything here was asked about and nothing came back: the provider
        // no longer has these, so saying "done" would be a lie.
        toast("Nothing came back for those. They keep the estimate.");
      } else {
        toast.success(`Filled in ${total} ${total === 1 ? "title" : "titles"}.`);
      }
    } catch {
      toast.error("That stopped partway. Run it again and it picks up where it left off.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="flex flex-col gap-3 rounded-[11px] border border-border bg-surface p-4.5 surface-highlight md:p-5">
      <p className="label-mono tracking-[.12em] text-text-muted">Screen time</p>
      <h2 className="font-display text-28 leading-[1.1]">Fill in the runtimes</h2>
      <p className="text-[12.5px] leading-[1.55] text-pretty text-text-muted">
        <span className="font-mono tabular-nums text-text">{pending.toLocaleString()}</span> of your titles arrived
        before Marquee started keeping how long things run, so the hours in your year in review are estimated for them.
        Looking them up again makes those hours real. Nothing else about your titles changes, not your progress, your
        ratings, or where they sit.
      </p>
      <div className="mt-auto flex flex-wrap items-center gap-2.5 pt-1.5">
        <Button onClick={run} disabled={busy}>
          {busy && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.8} />}
          {busy ? "Looking them up" : "Fill them in"}
        </Button>
        <p aria-live="polite" className="font-mono text-12 tabular-nums text-text-muted">
          {busy || filled > 0 ? `${filled.toLocaleString()} of ${pending.toLocaleString()} done` : "·"}
        </p>
      </div>
    </section>
  );
}
