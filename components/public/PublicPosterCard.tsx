import { Star } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, MouseEvent } from "react";
import { ItemCover } from "@/components/items/ItemCover";
import { progressPercent, progressShort } from "@/lib/items";
import { generatedCover } from "@/lib/poster-art";
import type { PublicTitle } from "@/lib/public-profile";
import { STATUS_STYLE, labelKind, readingLabel, statusLabel, type CategoryKind } from "@/lib/status";
import { cn, isPlainClick } from "@/lib/utils";

type PublicPosterCardProps = {
  title: PublicTitle;
  href: string;
  kind: CategoryKind;
  categoryColor: string;
  /** Opens the card in place; ctrl/⌘-click still follows the link. */
  onOpen: () => void;
  eager?: boolean;
};

const lift =
  "group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-hover:border-(--card-edge) group-hover:shadow-(--card-lit) group-has-[:focus-visible]:-translate-y-1.5 group-has-[:focus-visible]:border-(--card-edge) group-has-[:focus-visible]:shadow-(--card-lit) pointer-coarse:group-active:scale-97";

/**
 * A shared shelf's poster (SPEC §19): the same lit, leaning 2:3 card as your
 * own shelves, minus anything that changes the title. Status, progress, the
 * owner's rating and favourite star; the title opens a read-only card.
 */
export function PublicPosterCard({ title, href, kind, categoryColor, onOpen, eager = false }: PublicPosterCardProps) {
  const open = (event: MouseEvent) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    onOpen();
  };
  const status = STATUS_STYLE[title.status];
  const watching = title.status === "in_progress";
  const words = labelKind(kind, title.format);
  const tag = readingLabel(title.format);
  const episode = watching ? progressShort(title, words) : null;
  const percent = watching ? progressPercent(title) : null;
  const tint = title.accent_color ?? generatedCover(title.id, categoryColor).tint;
  const bright = `color-mix(in oklab, ${tint}, white 30%)`;
  const light = {
    "--card-glow": `color-mix(in oklab, ${tint} 34%, transparent)`,
    "--card-edge": `color-mix(in oklab, ${bright} 60%, transparent)`,
    "--card-lit": [
      `0 26px 70px color-mix(in oklab, ${tint} 55%, transparent)`,
      `0 0 30px color-mix(in oklab, ${tint} 32%, transparent)`,
      `0 0 0 4px color-mix(in oklab, ${bright} 18%, transparent)`,
    ].join(", "),
  } as CSSProperties;

  return (
    <div className="group @container flex flex-col gap-2.5" style={light}>
      <div>
        <p className="text-13 leading-[1.3] font-medium text-pretty transition-colors group-hover:text-white">
          <Link href={href} scroll={false} onClick={open}>
            {title.title}
          </Link>
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px]">
          {title.year && <span className={cn("text-text-muted", (episode || tag) && "@max-[160px]:hidden")}>{title.year}</span>}
          {tag && <span className="text-text-muted">{tag}</span>}
          <span className={status.text}>{statusLabel(words, title.status)}</span>
          {episode && <span className="text-text">{episode}</span>}
          {title.rating !== null && (
            <span className="inline-flex items-center gap-0.75 text-accent">
              <Star aria-hidden className="size-2.75 fill-accent" strokeWidth={1.5} />
              {title.rating}
              <span className="sr-only"> out of 10</span>
            </span>
          )}
        </p>
      </div>

      <div
        data-poster={title.id}
        className={cn(
          "reveal-art relative order-first aspect-2/3 overflow-hidden rounded-card border border-white/7",
          "tilt shadow-[0_12px_32px_var(--card-glow)] transition-[translate,scale,transform,box-shadow,border-color] duration-200 ease-cinematic",
          lift,
        )}
      >
        <Link href={href} scroll={false} onClick={open} tabIndex={-1} aria-hidden className="absolute inset-0">
          <ItemCover
            item={title}
            categoryColor={categoryColor}
            sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw"
            eager={eager}
          />
        </Link>
        <span
          aria-hidden
          className="glare pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 ease-cinematic group-hover:opacity-100"
        />
        <span aria-hidden className={cn("pointer-events-none absolute top-2.25 right-2.25 size-1.75 rounded-full", status.fill, status.glow)} />
        {title.is_favorite && (
          <Star
            aria-label="Favourite"
            className="pointer-events-none absolute top-2 left-2 size-3.5 fill-accent text-accent drop-shadow"
            strokeWidth={1.5}
          />
        )}
        {percent !== null && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-0.75 bg-white/8">
            <div className="h-full bg-accent shadow-progress" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
