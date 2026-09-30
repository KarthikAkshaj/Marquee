"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { searchKindOf } from "@/lib/add";
import type { PaletteCategory } from "@/lib/palette";
import {
  ANY,
  newEntry,
  ownEntry,
  pickSurprise,
  reelFrames,
  surpriseCandidates,
  type NewSurprisePayload,
  type ReelEntry,
  type SurpriseFilter,
  type SurprisePool,
  type SurpriseSource,
} from "@/lib/surprise";
import { cn } from "@/lib/utils";
import { SurpriseChoices } from "./SurpriseChoices";
import { SurpriseNewResult } from "./SurpriseNewResult";
import { SurpriseNothing } from "./SurpriseNothing";
import { SurpriseReel } from "./SurpriseReel";
import { SurpriseResult } from "./SurpriseResult";
import { SurpriseLoading, SurpriseTrouble } from "./SurpriseWaiting";
import { useNewSurprises } from "./useNewSurprises";
import { useSurpriseActions } from "./useSurpriseActions";

type SurpriseContentProps = {
  categories: PaletteCategory[];
  pool: SurprisePool;
  initialCategoryId: string | null;
  onClose: () => void;
  onAddTitle: () => void;
};

type Spin = { pick: ReelEntry; frames: ReelEntry[]; pickIndex: number; key: number } | null;

/** "Something new" as last asked for: its answer, or where the asking got to. */
type Fresh = { status: "idle" | "loading" | "ready" | "failed" | "busy" } & NewSurprisePayload;

function spinFrom(candidates: ReelEntry[], previous: Spin): Spin {
  const pick = pickSurprise(candidates, previous?.pick.id ?? null);
  return pick ? { pick, ...reelFrames(candidates, pick), key: (previous?.key ?? 0) + 1 } : null;
}

/**
 * Surprise me (SPEC §10): answer as much or as little as you like (your list
 * or something new, shelf, time, mood), and the reel spins through what's
 * left, leaning toward what suits you. Then start it, add it, or spin again.
 */
export function SurpriseContent({ categories, pool, initialCategoryId, onClose, onAddTitle }: SurpriseContentProps) {
  const shelves = new Map(categories.map((category) => [category.id, category]));
  const kinds = new Map(categories.map((category) => [category.id, category.kind]));
  const waiting = categories.filter((category) => pool.titles.some((title) => title.category_id === category.id));
  // New titles can go on any shelf a provider fills.
  const findable = categories.filter((category) => searchKindOf(category.kind) !== null);
  const ownFor = (filter: SurpriseFilter) => surpriseCandidates(pool.titles, filter, kinds).map(ownEntry);
  const newSurprises = useNewSurprises();
  const actions = useSurpriseActions(shelves, onClose);

  const [source, setSource] = useState<SurpriseSource>("list");
  const [filter, setFilter] = useState<SurpriseFilter>(() => ({
    ...ANY,
    shelf: waiting.some((shelf) => shelf.id === initialCategoryId) ? initialCategoryId : null,
  }));
  const [fresh, setFresh] = useState<Fresh>({ status: "idle", titles: [], notices: [] });
  const [current, setCurrent] = useState<Spin>(() => spinFrom(ownFor(filter), null));
  const [landed, setLanded] = useState(false);
  // For something new, what's left can't be known before asking, so no choice is marked.
  const leaves = (patch: Partial<SurpriseFilter>) => source === "new" || ownFor({ ...filter, ...patch }).length > 0;

  async function again(patch: Partial<SurpriseFilter> = {}, nextSource: SurpriseSource = source) {
    const next = { ...filter, ...patch };
    // A shelf the other source doesn't offer goes back to any.
    if (next.shelf && !(nextSource === "new" ? findable : waiting).some((shelf) => shelf.id === next.shelf)) next.shelf = null;
    setSource(nextSource);
    setFilter(next);
    setLanded(false);
    if (nextSource === "list") return setCurrent((previous) => spinFrom(ownFor(next), previous));

    const known = nextSource === source && Object.keys(patch).length === 0 && fresh.status === "ready" ? fresh : newSurprises.peek(next);
    if (known) {
      setFresh({ status: "ready", ...known });
      return setCurrent((previous) => spinFrom(known.titles.map(newEntry), previous));
    }
    setCurrent(null);
    setFresh({ status: "loading", titles: [], notices: [] });
    const load = await newSurprises.load(next);
    if (load.stale) return;
    const payload = load.payload;
    if (!payload) return setFresh({ status: load.busy ? "busy" : "failed", titles: [], notices: [] });
    setFresh({ status: "ready", ...payload });
    setCurrent((previous) => spinFrom(payload.titles.map(newEntry), previous));
  }

  if (source === "list" && pool.titles.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
        <p className="font-display text-[30px] leading-[1.1]">
          Nothing in the <em className="text-accent">queue.</em>
        </p>
        <p className="max-w-80 text-14 text-text-muted">Queue a few titles up and I&apos;ll pick one when you can&apos;t decide, or let me find you something new.</p>
        <div className="mt-1 flex flex-wrap justify-center gap-2.5">
          <Button onClick={() => void again({}, "new")} className="h-11 px-5">
            Find something new
          </Button>
          <Button variant="secondary" onClick={onAddTitle} className="h-11 px-5">
            Add a title
          </Button>
        </div>
      </div>
    );
  }

  const pick = current?.pick ?? null;
  const waitingOnNew = source === "new" && fresh.status !== "ready" && fresh.status !== "idle";

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-5 md:px-6 md:pt-5 md:pb-6">
      <SurpriseChoices
        source={source}
        onSource={(next) => void again({}, next)}
        shelves={source === "new" ? findable : waiting}
        filter={filter}
        leaves={leaves}
        onChange={(patch) => void again(patch)}
      />

      {waitingOnNew ? (
        fresh.status === "loading" ? (
          <SurpriseLoading />
        ) : (
          <SurpriseTrouble busy={fresh.status === "busy"} onRetry={() => void again({ ...filter })} />
        )
      ) : current && pick ? (
        <>
          <SurpriseReel frames={current.frames} pickIndex={current.pickIndex} shelves={shelves} spinKey={current.key} landed={landed} onLanded={() => setLanded(true)} />
          <div aria-live="polite" className={cn("flex min-h-40 flex-col items-center gap-2 text-center transition-opacity duration-300", !landed && "opacity-0")}>
            {landed && pick.own && (
              <SurpriseResult
                pick={pick.own}
                shelf={shelves.get(pick.category_id)}
                starting={actions.busy !== null}
                onStart={() => void actions.start(pick.own)}
                onAgain={() => void again()}
                onClose={onClose}
              />
            )}
            {landed && pick.fresh && (
              <SurpriseNewResult
                pick={pick.fresh}
                shelf={shelves.get(pick.category_id)}
                adding={actions.busy}
                onAdd={(status) => void actions.add(pick.fresh, status)}
                onAgain={() => void again()}
              />
            )}
          </div>
        </>
      ) : (
        <SurpriseNothing
          filter={filter}
          source={source}
          shelfName={filter.shelf ? (shelves.get(filter.shelf)?.name ?? null) : null}
          leaves={leaves}
          notices={source === "new" ? fresh.notices : []}
          onChange={(patch, nextSource) => void again(patch, nextSource)}
        />
      )}
    </div>
  );
}
