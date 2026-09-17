"use client";

import { Command } from "cmdk";
import Image from "next/image";
import type { CSSProperties } from "react";
import { resultMeta } from "@/lib/add";
import { generatedCover } from "@/lib/poster-art";
import type { SearchResult } from "@/lib/search/types";
import { STATUS_STYLE, statusLabel, type CategoryKind, type ItemStatus } from "@/lib/status";
import { cn } from "@/lib/utils";

type SearchResultRowProps = {
  value: string;
  result: SearchResult;
  kind: CategoryKind;
  categoryColor: string;
  /** Status of the copy already on the shelf, if there is one. */
  onShelf: ItemStatus | null;
  selected: boolean;
  onSelect: () => void;
};

export const paletteRow =
  "flex cursor-pointer items-center gap-3.25 rounded-[9px] border border-transparent px-3 py-2.25 outline-none select-none data-[selected=true]:border-white/8 data-[selected=true]:bg-white/5";

/** One search hit (handoff §04): small cover with its glow, title, "2023 · TV · 28 eps". */
export function SearchResultRow({ value, result, kind, categoryColor, onShelf, selected, onSelect }: SearchResultRowProps) {
  const fallback = generatedCover(`${result.source}:${result.externalId}`, categoryColor);
  const glow = result.accentColor ? `color-mix(in oklab, ${result.accentColor} 40%, transparent)` : fallback.glow;
  const meta = resultMeta(result);
  const shelved = onShelf ? `Already on your list (${statusLabel(kind, onShelf)})` : null;
  const shelvedTone = onShelf ? STATUS_STYLE[onShelf].text : undefined;

  return (
    <Command.Item value={value} onSelect={onSelect} className={paletteRow}>
      <div
        className="relative h-12.5 w-8.5 shrink-0 overflow-hidden rounded-[5px] shadow-[0_5px_14px_var(--glow)]"
        style={{ "--glow": glow, background: result.coverUrl ? undefined : fallback.background } as CSSProperties}
      >
        {result.coverUrl && <Image src={result.coverUrl} alt="" fill sizes="34px" className="object-cover" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-14 font-medium", onShelf ? "text-text-muted" : "text-text")}>{result.title}</p>
        {meta && <p className="mt-0.75 truncate font-mono text-[11px] text-text-muted">{meta}</p>}
        {shelved && (
          <p className={cn("mt-0.75 truncate font-mono text-[10.5px] md:hidden", shelvedTone)}>{shelved}</p>
        )}
      </div>

      {shelved ? (
        <span className={cn("hidden shrink-0 font-mono text-[10.5px] md:inline", shelvedTone)}>
          {selected ? "↵ open" : shelved}
        </span>
      ) : (
        selected && <span className="hidden shrink-0 font-mono text-[10.5px] text-accent md:inline">↵ add</span>
      )}
    </Command.Item>
  );
}
