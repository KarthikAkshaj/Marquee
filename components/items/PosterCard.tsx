import { Star } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, MouseEvent } from "react";
import { TicketStamp } from "@/components/fun/TicketStamp";
import { progressPercent, progressShort, type Item } from "@/lib/items";
import { generatedCover } from "@/lib/poster-art";
import { STATUS_STYLE, statusLabel, type CategoryKind } from "@/lib/status";
import { cn, isPlainClick } from "@/lib/utils";
import { ItemCover } from "./ItemCover";
import { QuickActions, type ItemQuickActions } from "./QuickActions";

type PosterCardProps = {
  item: Item;
  href: string;
  kind: CategoryKind;
  categoryColor: string;
  actions: ItemQuickActions;
  /** Just finished: show the ADMIT ONE stamp, then call onStamped. */
  stamped?: boolean;
  onStamped?: () => void;
};

/**
 * Hovered, keyboard-focused, or holding an open menu: the card is "lit", in
 * its own cover colour (the focus outline on the title stays amber).
 */
const lit = {
  frame:
    "group-hover:-translate-y-1.5 group-hover:scale-[1.03] group-hover:border-(--card-edge) group-hover:shadow-(--card-lit) group-has-[:focus-visible]:-translate-y-1.5 group-has-[:focus-visible]:border-(--card-edge) group-has-[:focus-visible]:shadow-(--card-lit) group-has-[[data-state=open]]:-translate-y-1.5 group-has-[[data-state=open]]:border-(--card-edge) group-has-[[data-state=open]]:shadow-(--card-lit)",
  bar: "group-hover:opacity-100 group-has-[:focus-visible]:opacity-100 group-has-[[data-state=open]]:opacity-100",
  /** Only the buttons take the pointer; the gradient around them still opens the title. */
  buttons:
    "pointer-events-none group-hover:pointer-events-auto group-has-[:focus-visible]:pointer-events-auto group-has-[[data-state=open]]:pointer-events-auto",
};

/**
 * A 2:3 poster (SPEC §9.5, handoff §02): status dot, favourite star, amber
 * progress for titles in progress, and on hover a lift, a sheen and the quick
 * actions. The title is the card's link; the cover repeats it for the mouse.
 * `hover:` only applies on devices that can hover, so phones never tap an
 * invisible button.
 */
export function PosterCard({ item, href, kind, categoryColor, actions, stamped = false, onStamped }: PosterCardProps) {
  const status = STATUS_STYLE[item.status];
  const watching = item.status === "in_progress";
  const percent = watching ? progressPercent(item) : null;
  const episode = watching ? progressShort(item, kind) : null;
  const cover = generatedCover(item.id, categoryColor);
  const tint = item.accent_color ?? cover.tint;
  // Lifted a little toward white so a dark cover still gets an edge you can see.
  const bright = `color-mix(in oklab, ${tint}, white 30%)`;
  const light = {
    "--card-glow": `color-mix(in oklab, ${tint} 34%, transparent)`,
    "--card-edge": `color-mix(in oklab, ${bright} 60%, transparent)`,
    // Lit: a wide pool of light below, a halo hugging the poster, and a thin ring.
    "--card-lit": [
      `0 26px 70px color-mix(in oklab, ${tint} 55%, transparent)`,
      `0 0 30px color-mix(in oklab, ${tint} 32%, transparent)`,
      `0 0 0 4px color-mix(in oklab, ${bright} 18%, transparent)`,
    ].join(", "),
  } as CSSProperties;
  // A plain click opens the sheet in place; ctrl/⌘-click still opens the link in a new tab.
  const open = (event: MouseEvent) => {
    if (!isPlainClick(event)) return;
    event.preventDefault();
    actions.onOpen(item);
  };

  return (
    <div className="group @container flex flex-col gap-2.5" style={light}>
      <div>
        <p className="text-13 leading-[1.3] font-medium text-pretty transition-colors group-hover:text-white">
          <Link href={href} scroll={false} onClick={open}>
            {item.title}
          </Link>
        </p>
        {/* 2023 · Watching · 13/24. Narrow cards drop the year to fit the episode. */}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 font-mono text-[11px]">
          {item.year && <span className={cn("text-text-muted", episode && "@max-[160px]:hidden")}>{item.year}</span>}
          <span className={cn(status.text, "transition-colors duration-200 ease-cinematic")}>{statusLabel(kind, item.status)}</span>
          {episode && <span className="text-text">{episode}</span>}
        </p>
      </div>

      <div
        className={cn(
          "relative order-first aspect-2/3 overflow-hidden rounded-card border border-white/7",
          "shadow-[0_12px_32px_var(--card-glow)] transition-[translate,scale,box-shadow,border-color] duration-200 ease-cinematic",
          lit.frame,
        )}
      >
        <Link href={href} scroll={false} onClick={open} tabIndex={-1} aria-hidden className="absolute inset-0">
          <ItemCover
            item={item}
            categoryColor={categoryColor}
            sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw"
          />
        </Link>

        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-linear-115 from-transparent from-35% via-white/10 to-transparent to-65% group-hover:translate-x-full group-hover:transition-transform group-hover:duration-350 group-hover:ease-cinematic"
        />
        <span aria-hidden className={cn("pointer-events-none absolute top-2.25 right-2.25 size-1.75 rounded-full transition-[background-color,box-shadow] duration-200 ease-cinematic", status.fill, status.glow)} />
        {item.is_favorite && (
          <Star
            aria-label="Favourite"
            className="pointer-events-none absolute top-2 left-2 size-3.5 fill-accent text-accent drop-shadow"
            strokeWidth={1.5}
          />
        )}

        <div
          className={cn(
            "@container pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-bg/96 from-45% to-bg/0 pt-10 pb-2.5 opacity-0 transition-opacity duration-200 ease-cinematic",
            lit.bar,
          )}
        >
          <QuickActions item={item} kind={kind} actions={actions} className={lit.buttons} />
        </div>

        {stamped && onStamped && <TicketStamp onDone={onStamped} />}

        {percent !== null && (
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-0.75 bg-white/8">
            <div className="h-full bg-accent shadow-progress transition-[width] duration-300 ease-cinematic" style={{ width: `${percent}%` }} />
          </div>
        )}
      </div>
    </div>
  );
}
