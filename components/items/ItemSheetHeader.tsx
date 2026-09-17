"use client";

import { Star } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { toast } from "sonner";
import { InlineEdit } from "@/components/ui/InlineEdit";
import { categoryStyle } from "@/lib/categories";
import { progressUnit, type Item, type ItemDetails } from "@/lib/items";
import { generatedCover } from "@/lib/poster-art";
import type { CategoryKind } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ItemCover } from "./ItemCover";

type ItemSheetHeaderProps = {
  item: Item;
  category: { name: string; kind: CategoryKind; color: string };
  onDetails: (details: ItemDetails) => void;
  onToggleFavorite: () => void;
};

/** "One *Piece*": the last word in amber italic, as the handoff sets titles. */
function Headline({ title }: { title: string }) {
  const split = title.lastIndexOf(" ");
  if (split < 0) return <em className="text-accent">{title}</em>;
  return (
    <>
      {title.slice(0, split + 1)}
      <em className="text-accent">{title.slice(split + 1)}</em>
    </>
  );
}

/**
 * Blurred backdrop in the title's own colour, the poster overlapping it, and
 * the title and release year editable in place (SPEC §8.6, handoff §03).
 */
export function ItemSheetHeader({ item, category, onDetails, onToggleFavorite }: ItemSheetHeaderProps) {
  const cover = generatedCover(item.id, category.color);
  const glow = item.accent_color ? `color-mix(in oklab, ${item.accent_color} 32%, transparent)` : cover.glow;
  const wash = item.accent_color
    ? `linear-gradient(150deg, color-mix(in oklab, ${item.accent_color} 45%, var(--color-bg)), color-mix(in oklab, ${item.accent_color} 15%, var(--color-sheet)) 60%, var(--color-sheet))`
    : cover.background;
  const unit = progressUnit(category.kind);
  const meta = [category.name, item.progress_total && unit ? `${item.progress_total} ${unit === "Episodes" ? "eps" : "total"}` : null]
    .filter(Boolean)
    .join(" · ");

  function commitTitle(text: string) {
    if (!text) return toast.error("Give it a title.");
    onDetails({ title: text });
  }

  function commitYear(text: string) {
    const year = text === "" ? null : Number(text);
    if (year !== null && (!Number.isInteger(year) || year < 1870 || year > 2100)) {
      return toast.error("Use the year it came out, like 2023.");
    }
    onDetails({ year });
  }

  return (
    <div className="relative" style={{ "--poster-glow": glow } as CSSProperties}>
      <div aria-hidden className="absolute inset-x-0 top-0 h-57.5 overflow-hidden md:h-49">
        {item.backdrop_url ? (
          <Image src={item.backdrop_url} alt="" fill sizes="560px" className="scale-115 object-cover opacity-70 blur-[34px]" />
        ) : (
          <div className="absolute -inset-10 scale-115 blur-[34px]" style={{ background: wash }} />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-sheet to-sheet/20" />
      </div>

      <div className="relative flex items-end gap-4 px-5 pt-3.5 md:gap-5 md:px-7 md:pt-28">
        <div className="relative h-39 w-26 shrink-0 overflow-hidden rounded-card shadow-poster md:h-53.25 md:w-35.5">
          <ItemCover item={item} categoryColor={category.color} sizes="142px" />
        </div>

        <div className="min-w-0 flex-1 pb-0.5 md:pb-1">
          <p className="flex items-center gap-2">
            <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", categoryStyle(category.color).dot)} />
            <span className="label-mono truncate tracking-[.12em] text-text-muted">{meta}</span>
          </p>
          <InlineEdit
            label="Title"
            value={item.title}
            maxLength={200}
            onCommit={commitTitle}
            className="-mx-1 mt-1.5 block max-w-full px-1 font-display text-28 leading-[1.06] wrap-break-word md:mt-2 md:text-[38px] md:leading-[1.05]"
            inputClassName="mt-1.5 w-full font-display text-[24px] md:mt-2 md:text-[32px]"
          >
            <Headline title={item.title} />
          </InlineEdit>
          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <InlineEdit
              label="Released"
              value={item.year === null ? "" : String(item.year)}
              inputMode="numeric"
              maxLength={4}
              placeholder="Year"
              onCommit={commitYear}
              className="-mx-1 flex min-h-11 items-center px-1 font-mono text-12 text-text-muted md:min-h-0 md:text-13"
              inputClassName="w-[6ch] font-mono text-13"
            >
              {item.year ?? "Add year"}
            </InlineEdit>
            <span aria-hidden className="size-0.75 rounded-full bg-text-faint" />
            <button
              type="button"
              aria-pressed={item.is_favorite}
              onClick={onToggleFavorite}
              className={cn(
                "-mx-1 flex min-h-11 items-center gap-1.5 rounded-[6px] px-1 text-13 transition-colors md:min-h-0 md:text-14",
                item.is_favorite ? "text-accent" : "text-text-muted hover:text-text",
              )}
            >
              <Star aria-hidden className={cn("size-3.5", item.is_favorite && "fill-accent")} strokeWidth={1.8} />
              Favourite
            </button>
          </div>
          {item.genres.length > 0 && (
            <p className="truncate text-12 text-text-muted md:mt-1.5 md:text-13">
              <span className="sr-only">Genres: </span>
              {item.genres.slice(0, 3).join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
