"use client";

import Link from "next/link";
import type { CSSProperties } from "react";
import { TicketStamp } from "@/components/fun/TicketStamp";
import { ItemCover } from "@/components/items/ItemCover";
import { categoryStyle } from "@/lib/categories";
import { continueSubtitle } from "@/lib/home";
import { progressLabel, progressPercent, progressShort, progressUnit, type Item } from "@/lib/items";
import { titleHref, type PaletteCategory } from "@/lib/palette";
import { generatedCover } from "@/lib/poster-art";
import { statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

type ContinueCardProps = {
  item: Item;
  shelf: PaletteCategory;
  onIncrement: () => void;
  stamped: boolean;
  onStamped: () => void;
};

/**
 * A wide Continue card (handoff §01/§08): cover in its own glow, shelf, title,
 * where you're up to and a +1. Finishing the last episode completes it, and it
 * leaves the row.
 */
export function ContinueCard({ item, shelf, onIncrement, stamped, onStamped }: ContinueCardProps) {
  const cover = generatedCover(item.id, shelf.color);
  const glow = item.accent_color ? `color-mix(in oklab, ${item.accent_color} 34%, transparent)` : cover.glow;
  const unit = progressUnit(shelf.kind);
  const percent = progressPercent(item);
  const label = !unit ? statusLabel(shelf.kind, item.status) : item.progress_total ? progressLabel(item) : (progressShort(item, shelf.kind) ?? "Not started");
  const subtitle = continueSubtitle(item, shelf.kind);
  const href = titleHref(shelf, item.id);

  return (
    <article
      className="relative flex h-full gap-3 overflow-hidden rounded-[11px] border border-border bg-surface p-2.5 transition-colors hover:border-border-strong md:gap-3.5 md:rounded-card md:p-3"
      style={{ "--glow": glow } as CSSProperties}
    >
      <div aria-hidden className="pointer-events-none absolute -top-5 -left-7.5 size-45 bg-[radial-gradient(closest-side,var(--glow),transparent)] blur-[28px]" />
      {/* The whole card opens the title for pointers and thumbs; the title link below is the one keyboards reach. */}
      <Link href={href} tabIndex={-1} aria-hidden className="absolute inset-0 z-1" />

      <div className="pointer-events-none relative z-2 h-20 w-13.5 shrink-0 overflow-hidden rounded-[6px] shadow-[0_10px_26px_var(--glow)] md:h-31 md:w-21.5 md:rounded-[7px]">
        <ItemCover item={item} categoryColor={shelf.color} sizes="86px" />
      </div>

      <div className="pointer-events-none relative z-2 flex min-w-0 flex-1 flex-col">
        <p className="flex items-center gap-1.5 md:gap-1.75">
          <span aria-hidden className={cn("size-1.25 shrink-0 rounded-full md:size-1.5", categoryStyle(shelf.color).dot)} />
          <span className="truncate font-mono text-[9.5px] tracking-[.12em] text-text-muted uppercase md:text-[10px]">{shelf.name}</span>
        </p>
        <h3 className="mt-0.75 line-clamp-2 text-[14.5px] leading-[1.25] font-medium text-pretty md:mt-1 md:text-[15.5px]">
          <Link href={href} className="pointer-events-auto rounded-xs">
            {item.title}
          </Link>
        </h3>
        {subtitle && <p className="mt-0.75 hidden truncate font-mono text-[11.5px] text-text-muted md:block">{subtitle}</p>}

        <div className="mt-auto flex items-center gap-2.5 pt-2">
          <div className="min-w-0 flex-1">
            <div className="mb-1.25 flex items-baseline justify-between gap-2 md:mb-1.5">
              <span className="truncate font-mono text-[11.5px] text-text md:text-[12.5px]">{label}</span>
              {percent !== null && <span className="font-mono text-[10px] text-text-muted md:text-[10.5px]">{percent}%</span>}
            </div>
            {/* No total, no bar: an empty track would read as 0%. */}
            {percent !== null && (
              <div className="h-0.75 overflow-hidden rounded-[2px] bg-white/9">
                <div className="h-full bg-accent shadow-progress" style={{ width: `${percent}%` }} />
              </div>
            )}
          </div>
          {unit && (
            <button
              type="button"
              onClick={onIncrement}
              aria-label={`Add 1 to ${item.title}`}
              className="pointer-events-auto flex h-11 min-w-11 shrink-0 items-center justify-center rounded-[9px] border border-accent/30 bg-accent/12 px-3.25 font-mono text-13 font-medium text-accent transition-colors hover:bg-accent hover:text-accent-ink md:h-auto md:min-w-0 md:rounded-[7px] md:px-2.5 md:py-1.5 md:text-12"
            >
              +1
            </button>
          )}
        </div>
      </div>

      {stamped && <TicketStamp onDone={onStamped} />}
    </article>
  );
}
