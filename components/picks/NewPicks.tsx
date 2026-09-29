"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { announceAdded } from "@/components/add/announceAdded";
import { SectionHeader } from "@/components/home/SectionHeader";
import { addFromSearch, deleteItem } from "@/lib/actions/items";
import { dismissPick, restorePick } from "@/lib/actions/picks";
import { newItemId, TMDB_NOTICE } from "@/lib/add";
import { rise } from "@/lib/motion";
import type { PickShelf } from "@/lib/recommend";
import { isPlainClick } from "@/lib/utils";
import { NewPickCard, type NewPickView, type PlanState } from "./NewPickCard";
import { showShelf, useShelfParam } from "./useShelfParam";

/** Per shelf when looking at everything: one row on a laptop, three on a phone. */
const SHOWN_PER_SHELF = 6;
const IDLE: PlanState = { status: "idle" };

type NewPicksProps = {
  picks: readonly NewPickView[];
  shelves: readonly PickShelf[];
  /** Why a shelf has nothing new (no favourites yet, a provider down), by shelf id. */
  notices: Readonly<Record<string, string>>;
};

/**
 * "New to you" (SPEC §20): titles from outside your shelves, grouped by shelf
 * when looking at everything. The list is kept as it first arrived, so a
 * title you plan stays put (now "On Anime") instead of vanishing when the
 * page refreshes around it; ✕ takes one away, with Undo.
 */
export function NewPicks({ picks, shelves, notices }: NewPicksProps) {
  const shelf = useShelfParam(shelves);
  const [shown] = useState(picks);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const [plans, setPlans] = useState<ReadonlyMap<string, PlanState>>(() => new Map());

  const hide = (key: string, gone: boolean) =>
    setHidden((current) => {
      const next = new Set(current);
      if (gone) next.add(key);
      else next.delete(key);
      return next;
    });
  const setPlan = (key: string, state: PlanState) => setPlans((current) => new Map(current).set(key, state));

  async function plan(pick: NewPickView, home: PickShelf) {
    const { result } = pick;
    setPlan(pick.key, { status: "adding" });
    const id = newItemId();
    const saved = await addFromSearch({ id, categoryId: home.id, status: "planned", result });
    if (!saved.ok) {
      setPlan(pick.key, IDLE);
      toast.error(saved.message);
      return;
    }
    setPlan(pick.key, { status: "planned", id });
    const item = { id, title: result.title, cover_url: result.coverUrl ?? null, accent_color: result.accentColor ?? null };
    announceAdded(item, home.name, () => {
      void deleteItem(id).then((removed) => {
        if (!removed.ok) return void toast.error(removed.message);
        setPlan(pick.key, IDLE);
        toast.success(`Removed ${result.title}.`);
      });
    });
  }

  async function dismiss(pick: NewPickView) {
    const key = { source: pick.result.source, externalId: pick.result.externalId };
    hide(pick.key, true);
    const saved = await dismissPick(key);
    if (!saved.ok) {
      hide(pick.key, false);
      toast.error(saved.message);
      return;
    }
    toast.success(`${pick.result.title} won't come up again.`, {
      action: {
        label: "Undo",
        onClick: () => {
          void restorePick(key).then((restored) => (restored.ok ? hide(pick.key, false) : toast.error(restored.message)));
        },
      },
    });
  }

  const visible = shown.filter((pick) => !hidden.has(pick.key));
  const groups = (shelf ? [shelf] : shelves)
    .map((entry) => ({ shelf: entry, picks: visible.filter((pick) => pick.categoryId === entry.id) }))
    .filter((group) => group.picks.length > 0 || notices[group.shelf.id]);
  const cardsOf = (group: (typeof groups)[number]) => (shelf ? group.picks : group.picks.slice(0, SHOWN_PER_SHELF));
  // TMDB's credit goes wherever its data is on screen.
  const fromTmdb = groups.some((group) => cardsOf(group).some((pick) => pick.result.source === "tmdb"));

  return (
    <section aria-labelledby="new-heading" className="mt-9 md:mt-12">
      <SectionHeader
        id="new-heading"
        title="New to you"
        aside={visible.length > 0 && <span className="text-12 text-text-muted md:text-[12.5px]">Loved by fans of your favourites</span>}
      />
      {groups.length === 0 && (
        <p className="text-13 text-text-muted">
          {shown.length > 0
            ? "That's everything we had for now. Rate a few more and there'll be more."
            : "Rate a few titles 8 or more, or star your favourites, and new picks show up here."}
        </p>
      )}
      {/* Keyed by shelf, so switching deals the cards in again rather than reshuffling them. */}
      <div key={shelf?.id ?? "everything"} className="flex flex-col gap-7 md:gap-9">
        {groups.map((group, groupIndex) => {
          const cards = cardsOf(group);
          return (
            <div key={group.shelf.id} className="flex flex-col gap-3">
              {!shelf && (
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="text-14 font-medium text-text">{group.shelf.name}</h3>
                  {group.picks.length > cards.length && (
                    <Link
                      href={`/for-you?shelf=${encodeURIComponent(group.shelf.slug)}`}
                      scroll={false}
                      onClick={(event) => {
                        if (!isPlainClick(event)) return;
                        event.preventDefault();
                        showShelf(event.currentTarget.getAttribute("href")!);
                      }}
                      aria-label={`All ${group.picks.length} ${group.shelf.name} picks`}
                      className="flex min-h-11 items-center gap-1 text-12 text-text-muted transition-colors hover:text-text md:min-h-0"
                    >
                      All {group.picks.length}
                      <ChevronRight aria-hidden className="size-3.5" strokeWidth={1.8} />
                    </Link>
                  )}
                </div>
              )}
              {notices[group.shelf.id] && group.picks.length === 0 && (
                <p className="text-13 text-text-muted">{notices[group.shelf.id]}</p>
              )}
              {cards.length > 0 && (
                <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 lg:grid-cols-6">
                  {cards.map((pick, index) => (
                    <li key={pick.key} {...rise(index)}>
                      <NewPickCard
                        pick={pick}
                        shelf={group.shelf}
                        state={plans.get(pick.key) ?? IDLE}
                        onPlan={() => void plan(pick, group.shelf)}
                        onDismiss={() => void dismiss(pick)}
                        // The first row can be in the first screenful on a laptop.
                        eager={groupIndex === 0 && index < SHOWN_PER_SHELF}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
      {fromTmdb && <p className="mt-8 text-[11px] text-text-faint">{TMDB_NOTICE}</p>}
    </section>
  );
}
