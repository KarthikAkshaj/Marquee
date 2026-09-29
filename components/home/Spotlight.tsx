"use client";

import { Play, Plus } from "lucide-react";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { TicketStamp } from "@/components/fun/TicketStamp";
import { useItemActions } from "@/components/items/useItemActions";
import { Button } from "@/components/ui/Button";
import { categoryStyle } from "@/lib/categories";
import { continueSubtitle, nextStep, stepsLeft } from "@/lib/home";
import { progressLabel, progressPercent, type Item } from "@/lib/items";
import { rise } from "@/lib/motion";
import { titleHref, type PaletteCategory } from "@/lib/palette";
import { generatedCover } from "@/lib/poster-art";
import { labelKind, readingLabel, startLabel, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";
import { SpotlightArt } from "./SpotlightArt";

type SpotlightProps = {
  item: Item;
  shelf: PaletteCategory;
  /** "Evening, Akshaj." sits at the top of the spotlight, over the art. */
  greeting: ReactNode;
  /** The title was just finished here and its stamp has played: time for the next one. */
  onFinished: () => void;
};

/**
 * The top of Home (U10): a title you're in the middle of or haven't started,
 * the way a streaming app leads with one. Its art fills the width, the
 * greeting sits on top, and the next episode, or the start, is one press away.
 */
export function Spotlight({ item: initial, shelf, greeting, onFinished }: SpotlightProps) {
  const actions = useItemActions([initial]);
  const item = actions.items[0] ?? initial;
  const words = labelKind(shelf.kind, item.format);
  const planned = item.status === "planned";
  const step = item.status === "in_progress" ? nextStep(item, words) : null;
  // Nothing done yet on a planned title: its length is in the line above, not a bar at zero.
  const percent = planned ? null : progressPercent(item);
  const left = stepsLeft(item);
  const tag = readingLabel(item.format);
  const tint = item.accent_color ?? generatedCover(item.id, shelf.color).tint;
  const wash = `radial-gradient(120% 90% at 72% 18%, color-mix(in oklab, ${tint} 34%, var(--color-bg)), var(--color-bg) 72%)`;
  const meta = [continueSubtitle(item, shelf.kind), item.genres.slice(0, 2).join(", ")].filter(Boolean).join(" · ");
  const href = titleHref(shelf, item.id);
  const line = (index: number) => rise(index + 1);

  return (
    <section
      aria-labelledby="spotlight-title"
      className="relative isolate -mx-5 -mt-6.5 flex min-h-140 flex-col px-5 pt-6.5 pb-8 md:-mx-10 md:-mt-8.5 md:min-h-128 md:px-10 md:pt-8.5 md:pb-11 xl:min-h-144"
    >
      <SpotlightArt key={item.id} item={item} wash={wash} />
      {/* Made on the server and placed among this section's children; a keyed wrapper keeps
          React's list-key check from mistaking it for an unkeyed list item. */}
      <Fragment key="greeting">{greeting}</Fragment>

      <div className="mt-auto max-w-2xl pt-14">
        <p style={line(0).style} className={cn("flex items-center gap-2", line(0).className)}>
          <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", categoryStyle(shelf.color).dot, categoryStyle(shelf.color).glow)} />
          <span className="label-mono tracking-[.16em] text-text">
            {shelf.name}
            {tag && ` · ${tag}`} · {statusLabel(words, item.status)}
          </span>
        </p>
        <h2
          id="spotlight-title"
          style={line(1).style}
          className={cn(
            "font-display opsz-144 mt-3 line-clamp-3 text-[42px] leading-[.98] tracking-[-.02em] text-balance [text-shadow:0_2px_28px_rgb(0_0_0/0.45)] md:text-[64px]",
            line(1).className,
          )}
        >
          {item.title}
        </h2>
        {meta && (
          <p style={line(2).style} className={cn("mt-3 truncate font-mono text-12 text-text-muted md:text-13", line(2).className)}>
            {meta}
          </p>
        )}

        {percent !== null && (
          <div style={line(3).style} className={cn("mt-5 max-w-sm", line(3).className)}>
            <div className="flex items-baseline justify-between gap-3 font-mono text-12 md:text-13">
              <span className="text-text">{progressLabel(item)}</span>
              {left && <span className="text-text-muted">{left}</span>}
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/12">
              <div className="h-full bg-accent shadow-progress transition-[width] duration-500 ease-cinematic" style={{ width: `${percent}%` }} />
            </div>
          </div>
        )}

        <div style={line(4).style} className={cn("mt-6 flex flex-wrap gap-2.5", line(4).className)}>
          {step && (
            <Button onClick={() => actions.increment(item)} className="h-11.5 gap-2 px-5 shadow-cta-sm">
              <Plus aria-hidden className="size-4" strokeWidth={2.4} />
              {step}{" "}
              <span className="sr-only">done, for {item.title}</span>
            </Button>
          )}
          {planned && (
            <Button onClick={() => actions.setStatus(item, "in_progress")} className="h-11.5 gap-2 px-5 shadow-cta-sm">
              <Play aria-hidden className="size-3.5 fill-current" strokeWidth={2.4} />
              {startLabel(words)} <span className="sr-only">{item.title}</span>
            </Button>
          )}
          <Button asChild variant={step || planned ? "secondary" : "primary"} className="h-11.5 px-5">
            <Link href={href}>
              Details <span className="sr-only">about {item.title}</span>
            </Link>
          </Button>
        </div>
      </div>

      {actions.stamps.has(item.id) && (
        <TicketStamp
          onDone={() => {
            actions.endStamp(item.id);
            onFinished();
          }}
        />
      )}
    </section>
  );
}
