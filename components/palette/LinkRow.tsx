"use client";

import { Command } from "cmdk";
import type { ReactNode } from "react";
import { paletteRow } from "@/components/add/SearchResultRow";

type LinkRowProps = {
  value: string;
  icon: ReactNode;
  label: string;
  /** Right-hand detail, e.g. a shelf's title count. */
  detail?: string;
  hint: string;
  selected: boolean;
  onSelect: () => void;
};

/** A place to go or a thing to do: icon tile, label, and "↵ go" while highlighted. */
export function LinkRow({ value, icon, label, detail, hint, selected, onSelect }: LinkRowProps) {
  return (
    <Command.Item value={value} onSelect={onSelect} className={paletteRow}>
      <span className="grid size-9 shrink-0 place-items-center rounded-nav border border-white/7 bg-tile text-text-muted md:size-7.5">
        {icon}
      </span>
      <span className="min-w-0 flex-1 truncate text-14 text-text">{label}</span>
      {selected ? (
        <span className="hidden shrink-0 font-mono text-[10.5px] text-accent md:inline">↵ {hint}</span>
      ) : (
        detail && <span className="shrink-0 font-mono text-[11px] text-text-muted">{detail}</span>
      )}
    </Command.Item>
  );
}
