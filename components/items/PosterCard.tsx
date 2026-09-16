import { Star } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { progressPercent, type Item } from "@/lib/items";
import { generatedCover } from "@/lib/poster-art";
import { STATUS_STYLE, statusLabel, type CategoryKind } from "@/lib/status";
import { cn } from "@/lib/utils";
import { ItemCover } from "./ItemCover";

type PosterCardProps = {
  item: Item;
  href: string;
  kind: CategoryKind;
  categoryColor: string;
};

/**
 * A 2:3 poster (SPEC §9.5, handoff §02): status dot, favourite star, amber
 * progress for titles in progress, and a lift with coloured light on hover.
 */
export function PosterCard({ item, href, kind, categoryColor }: PosterCardProps) {
  const status = STATUS_STYLE[item.status];
  const percent = item.status === "in_progress" ? progressPercent(item) : null;
  const glow = item.accent_color
    ? `color-mix(in oklab, ${item.accent_color} 26%, transparent)`
    : generatedCover(item.id, categoryColor).glow;

  return (
    <Link
      href={href}
      scroll={false}
      className="group flex flex-col gap-2.5 rounded-card outline-offset-4"
      style={{ "--card-glow": glow } as CSSProperties}
    >
      <div
        className={cn(
          "relative aspect-[2/3] overflow-hidden rounded-card border border-white/7",
          "shadow-[0_10px_26px_var(--card-glow)] transition-[translate,scale,box-shadow,border-color] duration-200 ease-cinematic",
          "group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-hover:border-accent/45",
          "group-hover:shadow-[0_26px_60px_var(--card-glow),var(--shadow-card-ring)]",
        )}
      >
        <ItemCover item={item} categoryColor={categoryColor} sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw" />

        <span aria-hidden className={cn("absolute top-2.25 right-2.25 size-1.75 rounded-full", status.fill, status.glow)} />
        {item.is_favorite && (
          <Star
            aria-label="Favourite"
            className="absolute top-2 left-2 size-3.5 fill-accent text-accent drop-shadow"
            strokeWidth={1.5}
          />
        )}
        {percent !== null && (
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.75 bg-white/8">
            <div className="h-full bg-accent shadow-progress" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>

      <div>
        <p className="text-13 leading-[1.3] font-medium text-pretty transition-colors group-hover:text-white">
          {item.title}
        </p>
        <p className="mt-1 flex items-center gap-2 font-mono text-[11px]">
          {item.year && <span className="text-text-muted">{item.year}</span>}
          <span className={status.text}>{statusLabel(kind, item.status)}</span>
        </p>
      </div>
    </Link>
  );
}
