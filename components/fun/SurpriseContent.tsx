"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { setItemStatus } from "@/lib/actions/items";
import { titleHref, type PaletteCategory } from "@/lib/palette";
import { ANY, pickSurprise, reelFrames, surpriseCandidates, type SurpriseFilter, type SurprisePool, type SurpriseTitle } from "@/lib/surprise";
import { cn } from "@/lib/utils";
import { SurpriseChoices } from "./SurpriseChoices";
import { SurpriseReel } from "./SurpriseReel";
import { SurpriseResult } from "./SurpriseResult";

type SurpriseContentProps = {
  categories: PaletteCategory[];
  pool: SurprisePool;
  initialCategoryId: string | null;
  onClose: () => void;
  onAddTitle: () => void;
};

type Spin = { pick: SurpriseTitle; frames: SurpriseTitle[]; pickIndex: number; key: number } | null;

/**
 * Surprise me (SPEC §10): answer as much or as little as you like (shelf,
 * time, mood), and the reel spins through what's left, leaning toward what
 * suits you. Then start it or spin again.
 */
export function SurpriseContent({ categories, pool, initialCategoryId, onClose, onAddTitle }: SurpriseContentProps) {
  const router = useRouter();
  const shelves = new Map(categories.map((category) => [category.id, category]));
  const kinds = new Map(categories.map((category) => [category.id, category.kind]));
  const candidatesFor = (filter: SurpriseFilter) => surpriseCandidates(pool.titles, filter, kinds);
  const waiting = categories.filter((category) => pool.titles.some((title) => title.category_id === category.id));

  const [filter, setFilter] = useState<SurpriseFilter>(() => ({
    ...ANY,
    shelf: waiting.some((shelf) => shelf.id === initialCategoryId) ? initialCategoryId : null,
  }));
  const spin = (next: SurpriseFilter, previous: Spin): Spin => {
    const candidates = candidatesFor(next);
    const pick = pickSurprise(candidates, previous?.pick.id ?? null);
    return pick ? { pick, ...reelFrames(candidates, pick), key: (previous?.key ?? 0) + 1 } : null;
  };
  const [current, setCurrent] = useState<Spin>(() => spin(filter, null));
  const [landed, setLanded] = useState(false);
  const [starting, setStarting] = useState(false);

  function again(patch: Partial<SurpriseFilter> = {}) {
    const next = { ...filter, ...patch };
    setFilter(next);
    setLanded(false);
    setCurrent((previous) => spin(next, previous));
  }

  async function start(pick: SurpriseTitle) {
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

  if (pool.titles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <p className="font-display text-[30px] leading-[1.1]">
          Nothing in the <em className="text-accent">queue.</em>
        </p>
        <p className="max-w-80 text-14 text-text-muted">Queue a few titles up and I&apos;ll pick one when you can&apos;t decide.</p>
        <Button onClick={onAddTitle} className="mt-1 h-11 px-5">
          Add a title
        </Button>
      </div>
    );
  }

  const pick = current?.pick ?? null;

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-5 md:px-6 md:pt-5 md:pb-6">
      <SurpriseChoices
        shelves={waiting}
        filter={filter}
        leaves={(patch) => candidatesFor({ ...filter, ...patch }).length > 0}
        onChange={again}
      />

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
          <div aria-live="polite" className={cn("flex min-h-40 flex-col items-center gap-2 text-center transition-opacity duration-300", !landed && "opacity-0")}>
            {landed && (
              <SurpriseResult
                pick={pick}
                shelf={shelves.get(pick.category_id)}
                starting={starting}
                onStart={() => void start(pick)}
                onAgain={() => again()}
                onClose={onClose}
              />
            )}
          </div>
        </>
      ) : (
        // The chips grey out anything that would leave nothing, so this is only a safety net.
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <p className="font-display text-[26px] leading-[1.1]">Nothing fits all that.</p>
          <Button variant="secondary" onClick={() => again(ANY)} className="h-11 px-4.5">
            Clear the choices
          </Button>
        </div>
      )}
    </div>
  );
}
