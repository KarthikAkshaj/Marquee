"use client";

import { Command } from "cmdk";
import { GeneratedCover } from "@/components/items/GeneratedCover";
import Image from "next/image";
import { paletteRow } from "@/components/add/SearchResultRow";
import { categoryStyle } from "@/lib/categories";
import type { PaletteCategory, PaletteTitle } from "@/lib/palette";
import { STATUS_STYLE, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

type TitleRowProps = {
  value: string;
  title: PaletteTitle;
  category: PaletteCategory;
  selected: boolean;
  onSelect: () => void;
};

/** One of your titles: small cover, name, and "● Anime · Watching · 2023". Enter opens its sheet. */
export function TitleRow({ value, title, category, selected, onSelect }: TitleRowProps) {
  return (
    <Command.Item value={value} onSelect={onSelect} className={paletteRow}>
      <div className="relative h-9 w-6 shrink-0 overflow-hidden rounded-[4px] border border-white/7">
        {title.cover_url ? (
          <Image src={title.cover_url} alt="" fill sizes="24px" className="object-cover" />
        ) : (
          <GeneratedCover itemId={title.id} categoryColor={category.color} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-14 text-text">{title.title}</p>
        <p className="mt-0.5 flex items-center gap-1.5 truncate font-mono text-[11px] text-text-muted">
          <span aria-hidden className={cn("size-1.25 shrink-0 rounded-full", categoryStyle(category.color).dot)} />
          {category.name}
          <span aria-hidden>·</span>
          <span className={STATUS_STYLE[title.status].text}>{statusLabel(category.kind, title.status)}</span>
          {title.year && (
            <>
              <span aria-hidden>·</span>
              {title.year}
            </>
          )}
        </p>
      </div>
      {selected && <span className="hidden shrink-0 font-mono text-[10.5px] text-accent md:inline">↵ open</span>}
    </Command.Item>
  );
}
