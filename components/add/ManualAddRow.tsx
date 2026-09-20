"use client";

import { Command } from "cmdk";
import { cn } from "@/lib/utils";
import { paletteRow } from "./SearchResultRow";

type ManualAddRowProps = {
  value: string;
  title: string;
  /** "to Books", when the palette might be pointed at another shelf. */
  shelfName?: string;
  /** Draw the divider above it (when something is listed above). */
  divided: boolean;
  onSelect: () => void;
};

/**
 * "Add “verm” manually — nobody's heard of it, that's fine" (handoff §04).
 * Pinned to the bottom of the list, so a long page of results never hides it.
 */
export function ManualAddRow({ value, title, shelfName, divided, onSelect }: ManualAddRowProps) {
  return (
    <div className="sticky -bottom-2 -mx-2 -mb-2 bg-menu px-2 pb-2">
      {divided && <Command.Separator className="mx-3 mb-2 h-px bg-white/7" />}
      <Command.Item value={value} onSelect={onSelect} className={cn(paletteRow, "py-2.75")}>
        <span
          aria-hidden
          className="grid h-12.5 w-8.5 shrink-0 place-items-center rounded-[5px] border border-dashed border-white/18 text-[15px] text-text-muted"
        >
          +
        </span>
        <span className="min-w-0 flex-1 text-14 text-text">
          Add “{title}” {shelfName ? `to ${shelfName} ` : ""}manually{" "}
          <span className="text-text-muted">nobody&apos;s heard of it, that&apos;s fine</span>
        </span>
      </Command.Item>
    </div>
  );
}
