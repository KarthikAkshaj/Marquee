"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { decrementPatch, incrementPatch, progressPercent, type Item, type ProgressUnit } from "@/lib/items";
import { cn } from "@/lib/utils";

type ProgressStepperProps = {
  item: Pick<Item, "status" | "progress_current" | "progress_total">;
  unit: ProgressUnit;
  /** +: you watched one more (may start, resume or finish the title). */
  onIncrement: () => void;
  /** −, a typed count, or a new total (null while it's still airing). */
  onChange: (current: number, total: number | null) => void;
};

const pad = (n: number) => String(n).padStart(2, "0");

const WORDS: Record<ProgressUnit, { heading: string; noun: string; current: string; total: string; open: string }> = {
  Episodes: {
    heading: "Episodes",
    noun: "episode",
    current: "Episode you're on",
    total: "Total episodes (blank while it's airing)",
    open: "Still airing? Leave the total as ? and count as you go.",
  },
  Chapters: {
    heading: "Chapters",
    noun: "chapter",
    current: "Chapter you're on",
    total: "Total chapters (blank while it's coming out)",
    open: "Still coming out? Leave the total as ? and count as you go.",
  },
  Total: {
    heading: "Progress",
    noun: "count",
    current: "Done so far",
    total: "Total (blank if unknown)",
    open: "Don't know the total? Leave it as ? and count as you go.",
  },
};
const stepButton =
  "flex size-11 shrink-0 items-center justify-center rounded-[11px] border transition-[color,background-color,border-color,scale] duration-150 ease-cinematic active:scale-90 md:size-7 md:rounded-[7px] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100";

/** `−  07 / 24  +` (SPEC §9.5). Either number can be typed, so 800 episodes in isn't 800 taps. */
export function ProgressStepper({ item, unit, onIncrement, onChange }: ProgressStepperProps) {
  const [error, setError] = useState<string | null>(null);
  const current = item.progress_current;
  const total = item.progress_total;
  const percent = progressPercent(item);
  const words = WORDS[unit];
  const noun = words.noun;

  function save(nextCurrent: number, nextTotal: number | null) {
    setError(null);
    onChange(nextCurrent, nextTotal);
  }

  function commitCurrent(text: string) {
    if (text === "") return;
    const next = Number(text);
    if (!Number.isInteger(next) || next < 0) return setError("Use a whole number, 0 or more.");
    if (total !== null && next > total) return setError(`That's past ${total}. Raise the total first.`);
    save(next, total);
  }

  /** Blank means it's still airing. */
  function commitTotal(text: string) {
    const next = text === "" ? null : Number(text);
    if (next !== null && (!Number.isInteger(next) || next < 1)) return setError("Use a whole number, 1 or more.");
    if (next !== null && next < current) return setError(`You're on ${current}, so the total can't be lower.`);
    save(current, next);
  }

  return (
    <div className="flex-1 rounded-card border border-border bg-surface px-4 py-3.5 surface-highlight">
      <p className="label-mono tracking-[.12em] text-text-muted">{words.heading}</p>
      <div className="mt-2.5 flex items-center gap-3.5">
        <button
          type="button"
          aria-label={`One ${noun} back`}
          disabled={decrementPatch(item) === null}
          onClick={() => onChange(current - 1, total)}
          className={cn(stepButton, "border-white/8 bg-elevated text-text hover:border-accent/50")}
        >
          <Minus aria-hidden className="size-4 md:size-3.5" strokeWidth={2} />
        </button>

        <div className="flex flex-1 items-center justify-center gap-1 font-mono text-[24px] tracking-[.02em] md:text-[22px]">
          <InlineEdit
            label={words.current}
            value={String(current)}
            inputMode="numeric"
            maxLength={6}
            className="flex min-h-11 items-center px-1 md:min-h-0"
            inputClassName="w-[5ch] text-center"
            onCommit={commitCurrent}
          >
            {pad(current)}
          </InlineEdit>
          <span aria-hidden className="text-text-faint">/</span>
          <InlineEdit
            label={words.total}
            value={total === null ? "" : String(total)}
            inputMode="numeric"
            maxLength={6}
            placeholder="?"
            className="flex min-h-11 items-center px-1 md:min-h-0"
            inputClassName="w-[5ch] text-center"
            onCommit={commitTotal}
          >
            {total === null ? <span className="text-text-muted">?</span> : pad(total)}
          </InlineEdit>
        </div>

        <button
          type="button"
          aria-label={`One more ${noun}`}
          disabled={incrementPatch(item) === null}
          onClick={onIncrement}
          className={cn(
            stepButton,
            "border-accent/35 bg-accent/14 text-accent hover:bg-accent hover:text-accent-ink disabled:hover:bg-accent/14 disabled:hover:text-accent",
          )}
        >
          <Plus aria-hidden className="size-4 md:size-3.5" strokeWidth={2} />
        </button>
      </div>

      {percent === null ? (
        <p className="mt-3 text-12 text-text-muted">{words.open}</p>
      ) : (
        <div aria-hidden className="mt-3 h-0.75 overflow-hidden rounded-xs bg-white/9">
          <div
            className="h-full bg-accent shadow-progress transition-[width] duration-300 ease-cinematic"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="mt-2 text-12 text-dropped">
          {error}
        </p>
      )}
    </div>
  );
}
