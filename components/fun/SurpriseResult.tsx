"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { categoryStyle } from "@/lib/categories";
import { titleHref, type PaletteCategory } from "@/lib/palette";
import { lengthLine, type SurpriseTitle } from "@/lib/surprise";
import { cn } from "@/lib/utils";

type SurpriseResultProps = {
  pick: SurpriseTitle;
  shelf: PaletteCategory | undefined;
  starting: boolean;
  onStart: () => void;
  onAgain: () => void;
  onClose: () => void;
};

/** Where the reel stopped (SPEC §10): the pick, why it might suit you, how long it runs, and what next. */
export function SurpriseResult({ pick, shelf, starting, onStart, onAgain, onClose }: SurpriseResultProps) {
  const about = [pick.reason, shelf ? lengthLine(pick, shelf.kind) : null].filter(Boolean).join(" · ");

  return (
    <>
      <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.14em] text-text-muted uppercase">
        {shelf && <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(shelf.color).dot)} />}
        {[shelf?.name, pick.year].filter(Boolean).join(" · ")}
      </p>
      <p className="font-display text-[30px] leading-[1.08] text-balance md:text-[38px]">
        Tonight: <em className="text-accent">{pick.title}</em>
      </p>
      {about && <p className="text-13 text-text-muted">{about}</p>}
      <div className="mt-2 flex flex-wrap justify-center gap-2.5">
        <Button onClick={onStart} disabled={starting} aria-busy={starting} className="h-11 px-5 shadow-cta-sm">
          Start it
        </Button>
        <Button variant="secondary" onClick={onAgain} disabled={starting} className="h-11 px-4.5">
          Spin again
        </Button>
      </div>
      {shelf && (
        <Link href={titleHref(shelf, pick.id)} onClick={onClose} className="mt-1 min-h-11 content-center text-12 text-text-muted hover:text-text">
          See the details first
        </Link>
      )}
    </>
  );
}
