"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";

type ImportBarProps = {
  ready: number;
  duplicates: number;
  skipDuplicates: boolean;
  onSkipDuplicates: (skip: boolean) => void;
  onBack: () => void;
  onImport: () => void;
  /** "Importing 200 of 450…" while batches are saving. */
  progress: { done: number; total: number } | null;
};

/** The review's sticky bar (handoff §05): what's ready, the duplicate switch, and Import. */
export function ImportBar({ ready, duplicates, skipDuplicates, onSkipDuplicates, onBack, onImport, progress }: ImportBarProps) {
  const busy = progress !== null;
  return (
    <div className="sticky bottom-3 z-10 flex flex-wrap items-center gap-x-5.5 gap-y-2 rounded-[12px] border border-white/9 bg-menu/92 px-3.5 py-3 shadow-menu backdrop-blur-[18px] md:bottom-4 md:px-4.5 md:py-3.5">
      <p className="flex items-center gap-3 font-mono text-[15px] tracking-[-.01em]">
        <span className="text-text">{ready} ready</span>
        {duplicates > 0 && (
          <>
            <span aria-hidden className="size-1 rounded-full bg-text-faint" />
            <span className="text-accent">
              {duplicates} {duplicates === 1 ? "duplicate" : "duplicates"}
            </span>
          </>
        )}
      </p>

      {duplicates > 0 && (
        <div className="flex items-center gap-1">
          <Checkbox checked={skipDuplicates} onChange={onSkipDuplicates} label="Skip duplicates" className="-ml-3 md:-ml-1.5" />
          <span aria-hidden className="text-13 text-text">
            Skip duplicates
          </span>
          <span className="ml-2 hidden text-[12.5px] text-text-muted 2xl:inline">They&apos;re already on your marquee — nothing gets overwritten.</span>
        </div>
      )}

      <div className="ml-auto flex items-center gap-2">
        <Button variant="ghost" onClick={onBack} disabled={busy} className="h-11 px-4 text-13">
          Back
        </Button>
        <Button onClick={onImport} disabled={busy || ready === 0} aria-busy={busy} className="h-11 gap-2 px-5.5 text-[13.5px] font-semibold shadow-cta-sm">
          {busy && <Loader2 aria-hidden className="size-4 animate-spin motion-reduce:animate-none" strokeWidth={1.8} />}
          {busy ? `Importing ${progress.done} of ${progress.total}…` : `Import ${ready} ${ready === 1 ? "title" : "titles"}`}
        </Button>
      </div>
    </div>
  );
}
