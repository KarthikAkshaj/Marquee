"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { setItemStatus } from "@/lib/actions/items";
import { categoryStyle } from "@/lib/categories";
import { titleHref, type PaletteCategory, type PaletteTitle } from "@/lib/palette";
import { pickSurprise, reelFrames, surpriseCandidates } from "@/lib/surprise";
import { cn } from "@/lib/utils";
import { SurpriseReel } from "./SurpriseReel";

type SurpriseContentProps = {
  categories: PaletteCategory[];
  titles: PaletteTitle[];
  initialCategoryId: string | null;
  onClose: () => void;
  onAddTitle: () => void;
};

type Spin = { pick: PaletteTitle; frames: PaletteTitle[]; pickIndex: number; key: number } | null;

function spin(titles: PaletteTitle[], categoryId: string | null, previous: Spin): Spin {
  const candidates = surpriseCandidates(titles, categoryId);
  const pick = pickSurprise(candidates, previous?.pick.id ?? null);
  return pick ? { pick, ...reelFrames(candidates, pick), key: (previous?.key ?? 0) + 1 } : null;
}

/** Surprise me (SPEC §10): pick a shelf or anything, spin, then start it or spin again. */
export function SurpriseContent({ categories, titles, initialCategoryId, onClose, onAddTitle }: SurpriseContentProps) {
  const router = useRouter();
  const shelves = new Map(categories.map((category) => [category.id, category]));
  const waiting = categories.filter((category) => surpriseCandidates(titles, category.id).length > 0);
  const [categoryId, setCategoryId] = useState(waiting.some((shelf) => shelf.id === initialCategoryId) ? initialCategoryId : null);
  const [current, setCurrent] = useState<Spin>(() => spin(titles, categoryId, null));
  const [landed, setLanded] = useState(false);
  const [starting, setStarting] = useState(false);

  function again(nextCategory = categoryId) {
    setCategoryId(nextCategory);
    setLanded(false);
    setCurrent((previous) => spin(titles, nextCategory, previous));
  }

  async function start(pick: PaletteTitle) {
    const shelf = shelves.get(pick.category_id);
    setStarting(true);
    const result = await setItemStatus(pick.id, "in_progress");
    setStarting(false);
    if (!result.ok) return toast.error(result.message);
    onClose();
    toast.success(`Started ${pick.title}. Enjoy the show.`, {
      action: shelf ? { label: "Open", onClick: () => router.push(titleHref(shelf, pick.id)) } : undefined,
    });
  }

  const pick = current?.pick ?? null;
  const pickShelf = pick ? shelves.get(pick.category_id) : undefined;

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-5 md:px-6 md:pt-5 md:pb-6">
      <div role="group" aria-label="Pick from" className="flex flex-wrap gap-2">
        {[{ id: null, name: "Anything", color: null }, ...waiting].map((shelf) => {
          const on = shelf.id === categoryId;
          return (
            <button
              key={shelf.id ?? "anything"}
              type="button"
              aria-pressed={on}
              onClick={() => again(shelf.id)}
              className={cn(
                "flex h-11 items-center gap-2 rounded-full border px-3.5 text-[12.5px] transition-colors md:h-8.5",
                on ? "border-accent/45 bg-accent/10 font-semibold text-text" : "border-white/8 bg-elevated text-text-muted hover:text-text",
              )}
            >
              {shelf.color && <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(shelf.color).dot)} />}
              {shelf.name}
            </button>
          );
        })}
      </div>

      {current && pick ? (
        <>
          <SurpriseReel
            frames={current.frames}
            pickIndex={current.pickIndex}
            shelves={shelves}
            spinKey={current.key}
            landed={landed}
            onLanded={() => setLanded(true)}
          />
          <div aria-live="polite" className={cn("flex min-h-36 flex-col items-center gap-2 text-center transition-opacity duration-300", !landed && "opacity-0")}>
            {landed && (
              <>
                <p className="flex items-center gap-2 font-mono text-[10.5px] tracking-[.14em] text-text-muted uppercase">
                  {pickShelf && <span aria-hidden className={cn("size-1.5 rounded-full", categoryStyle(pickShelf.color).dot)} />}
                  {[pickShelf?.name, pick.year].filter(Boolean).join(" · ")}
                </p>
                <p className="font-display text-[30px] leading-[1.08] text-balance md:text-[38px]">
                  Tonight: <em className="text-accent">{pick.title}</em>
                </p>
                <div className="mt-2 flex flex-wrap justify-center gap-2.5">
                  <Button onClick={() => void start(pick)} disabled={starting} aria-busy={starting} className="h-11 px-5 shadow-cta-sm">
                    Start it
                  </Button>
                  <Button variant="secondary" onClick={() => again()} disabled={starting} className="h-11 px-4.5">
                    Spin again
                  </Button>
                </div>
                {pickShelf && (
                  <Link href={titleHref(pickShelf, pick.id)} onClick={onClose} className="mt-1 min-h-11 content-center text-12 text-text-muted hover:text-text">
                    See the details first
                  </Link>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="font-display text-[30px] leading-[1.1]">
            Nothing in the <em className="text-accent">queue.</em>
          </p>
          <p className="max-w-80 text-14 text-text-muted">Put a few things in Plan to Watch and I&apos;ll pick one when you can&apos;t.</p>
          <Button onClick={onAddTitle} className="mt-1 h-11 px-5">
            Add a title
          </Button>
        </div>
      )}
    </div>
  );
}
