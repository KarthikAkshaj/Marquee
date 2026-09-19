"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

type MatchBarProps = {
  ready: number;
  toCheck: number;
  notFound: number;
  remaining: number;
  total: number;
  keepTitles: boolean;
  onKeepTitles: (keep: boolean) => void;
  onSave: () => void;
  progress: { done: number; total: number } | null;
};

/** Find covers' sticky bar: how the lookups are going, what'll be saved, and Save. */
export function MatchBar({ ready, toCheck, notFound, remaining, total, keepTitles, onKeepTitles, onSave, progress }: MatchBarProps) {
  const busy = progress !== null;
  return (
    <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[12px] border border-white/9 bg-menu/92 px-3.5 py-2.5 shadow-menu backdrop-blur-[18px] md:bottom-4 md:gap-x-5 md:px-4.5 md:py-3">
      <p aria-live="polite" className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[13.5px] md:w-auto">
        {remaining > 0 ? (
          <span className="flex items-center gap-2 text-text">
            <Loader2 aria-hidden className="size-3.5 animate-spin text-accent motion-reduce:animate-none" strokeWidth={2} />
            Looking up {total - remaining} of {total}…
          </span>
        ) : (
          <>
            <span className="text-text">{ready} to update</span>
            {toCheck > 0 && <span className="text-accent">{toCheck} to check</span>}
            {notFound > 0 && <span className="text-text-muted">{notFound} not found</span>}
          </>
        )}
      </p>

      <div className="flex items-center gap-1">
        <Checkbox checked={keepTitles} onChange={onKeepTitles} label="Keep my titles" className="-ml-3 md:-ml-1.5" />
        <span aria-hidden className="text-13 text-text">
          Keep my titles
        </span>
      </div>

      <Button onClick={onSave} disabled={busy || ready === 0} aria-busy={busy} className="ml-auto h-11 gap-2 px-5.5 text-[13.5px] font-semibold shadow-cta-sm">
        {busy && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.8} />}
        {busy ? `Saving ${progress.done} of ${progress.total}…` : `Update ${ready} ${ready === 1 ? "title" : "titles"}`}
      </Button>
    </div>
  );
}
