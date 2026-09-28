"use client";

import { Heart, Star, X } from "lucide-react";
import Image from "next/image";
import { Dialog } from "radix-ui";
import { useState, type ReactNode } from "react";
import { ItemCover } from "@/components/items/ItemCover";
import { stillSizes } from "@/lib/image/still";
import { progressLabel, progressUnit } from "@/lib/items";
import type { PublicTitle } from "@/lib/public-profile";
import { STATUS_STYLE, labelKind, readingLabel, statusLabel, type CategoryKind } from "@/lib/status";
import { cn } from "@/lib/utils";

type PublicTitleDialogProps = {
  title: PublicTitle;
  /** Called once the card has faded out. */
  onClose: () => void;
  kind: CategoryKind;
  categoryColor: string;
  /** "Akshaj's Anime": whose shelf this is, for the foot of the card. */
  shelfLine: string;
};

// Long enough for the panel's exit (panel-leave, 140ms) to finish on screen.
const LEAVE_MS = 150;

/** A shared title, read-only (SPEC §19): what it is, where it stands, and the owner's verdict. */
export function PublicTitleDialog({ title, onClose, kind, categoryColor, shelfLine }: PublicTitleDialogProps) {
  const [open, setOpen] = useState(true);
  const status = STATUS_STYLE[title.status];
  const words = labelKind(kind, title.format);
  const unit = progressUnit(words);
  const tag = readingLabel(title.format);
  const showProgress = unit !== null && (title.progress_current > 0 || title.progress_total !== null);

  function close() {
    setOpen(false);
    setTimeout(onClose, LEAVE_MS);
  }

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && close()}>
      <Dialog.Portal>
        <Dialog.Overlay className="scrim-motion fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[3px]" />
        <Dialog.Content className="panel-motion fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-140 -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-tile border border-white/10 bg-sheet shadow-modal">
          <div className="relative h-32 overflow-hidden md:h-40">
            {title.backdrop_url ? (
              <Image
                src={title.backdrop_url}
                alt=""
                fill
                // Opened from a shared link, this is the first thing painted.
                loading="eager"
                sizes={stillSizes(title.backdrop_url, 160, "(min-width: 768px) 560px, 100vw")}
                className="object-cover opacity-70"
              />
            ) : (
              <div aria-hidden className="absolute inset-0 opacity-60" style={{ backgroundColor: title.accent_color ?? undefined }} />
            )}
            <div aria-hidden className="absolute inset-0 bg-linear-to-t from-sheet via-sheet/50 to-transparent" />
            <Dialog.Close
              aria-label="Close"
              className="absolute top-3 right-3 grid size-11 place-items-center rounded-full bg-bg/55 text-text-muted backdrop-blur-sm transition-colors hover:text-text md:size-9"
            >
              <X aria-hidden className="size-4.5" strokeWidth={1.8} />
            </Dialog.Close>
          </div>

          <div className="relative -mt-16 flex gap-4.5 px-5.5 md:-mt-20 md:gap-5.5 md:px-6.5">
            <div className="relative aspect-2/3 w-24 shrink-0 overflow-hidden rounded-card border border-white/10 shadow-dialog-sm md:w-30">
              <ItemCover item={title} categoryColor={categoryColor} sizes="120px" eager />
            </div>
            <div className="flex min-w-0 flex-col justify-end pb-1">
              <Dialog.Title className="font-display text-[26px] leading-[1.08] text-balance wrap-break-word md:text-[30px]">
                {title.title}
              </Dialog.Title>
              <p className="mt-1.5 flex flex-wrap gap-x-2 font-mono text-12 text-text-muted">
                {title.year && <span>{title.year}</span>}
                {tag && <span>{tag}</span>}
              </p>
            </div>
          </div>

          <dl className="mx-5.5 mt-5.5 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-white/8 bg-white/8 md:mx-6.5 [&>:last-child:nth-child(odd)]:col-span-2">
            <Fact label="Status">
              <span className={cn("size-1.75 rounded-full", status.fill, status.glow)} />
              <span className={status.text}>{statusLabel(words, title.status)}</span>
            </Fact>
            <Fact label="Rating">
              {title.rating !== null ? (
                <>
                  <Star aria-hidden className="size-3.5 fill-accent text-accent" strokeWidth={1.5} />
                  <span className="font-mono">{title.rating}</span>
                  <span className="font-mono text-text-muted">/ 10</span>
                </>
              ) : (
                <span className="text-text-muted">Not rated</span>
              )}
            </Fact>
            {showProgress && unit && (
              <Fact label={unit === "Total" ? "Progress" : unit}>
                <span className="font-mono">{progressLabel(title)}</span>
              </Fact>
            )}
            {title.is_favorite && (
              <Fact label="Favourite">
                <Heart aria-hidden className="size-3.5 fill-accent text-accent" strokeWidth={1.5} />
                <span>One of the best</span>
              </Fact>
            )}
          </dl>

          {title.genres.length > 0 && (
            <ul aria-label="Genres" className="mx-5.5 mt-4 flex flex-wrap gap-1.5 md:mx-6.5">
              {title.genres.slice(0, 6).map((genre) => (
                <li key={genre} className="rounded-full border border-white/10 px-2.75 py-1 text-[11.5px] text-text-muted">
                  {genre}
                </li>
              ))}
            </ul>
          )}

          <Dialog.Description className="mx-5.5 mt-5 mb-5.5 text-12 text-text-muted md:mx-6.5 md:mb-6.5">
            On {shelfLine}.
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="bg-surface px-3.5 py-3">
      <dt className="label-mono text-[10px] tracking-[.12em] text-text-muted">{label}</dt>
      <dd className="mt-1.5 flex items-center gap-1.75 text-13">{children}</dd>
    </div>
  );
}
