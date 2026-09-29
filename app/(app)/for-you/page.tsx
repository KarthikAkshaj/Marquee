import type { Metadata } from "next";
import { Suspense } from "react";
import { BacklogPicks } from "@/components/picks/BacklogPicks";
import { ForYouEmpty } from "@/components/picks/ForYouEmpty";
import { NewPicksSection } from "@/components/picks/NewPicksSection";
import { NewPicksSkeleton } from "@/components/picks/NewPicksSkeleton";
import { PickShelves } from "@/components/picks/PickShelves";
import { getCategories, getTasteItems } from "@/lib/queries";
import { backlogPicks, knowsTaste, seedsOf, tasteOf, type PickShelf } from "@/lib/recommend";

export const metadata: Metadata = { title: "For you" };

/**
 * For you (SPEC §20): what to start next from your own list, then titles from
 * outside it that fans of your favourites love. The first is instant; the
 * second streams in while the providers answer. `?shelf=` scopes both.
 */
export default async function ForYouPage() {
  const [categories, library] = await Promise.all([getCategories(), getTasteItems()]);
  if (library.length === 0) return <ForYouEmpty />;

  const shelves: PickShelf[] = categories.map(({ id, name, slug, kind, color }) => ({ id, name, slug, kind, color }));
  const taste = tasteOf(library);
  const backlog = backlogPicks(library, taste);
  const seeds = seedsOf(library, shelves);
  // The chips offer shelves with something to show: a Planned title, or a favourite to ask about.
  const seeded = new Set([...seeds.values()].flat().map((seed) => seed.item.category_id));
  const offered = shelves.filter((shelf) => seeded.has(shelf.id) || backlog.some((pick) => pick.item.category_id === shelf.id));

  return (
    <div className="flex flex-col">
      <header className="min-w-0">
        <h1 className="font-display opsz-120 text-[42px] leading-none md:text-[54px]">
          Picked <em className="text-accent">for you.</em>
        </h1>
        <p className="mt-3 text-14 text-pretty text-text-muted md:text-[15px]">
          What to start next, and what fans of your favourites can&apos;t stop talking about.
        </p>
      </header>
      <PickShelves shelves={offered} />
      <BacklogPicks
        // Only what a poster needs goes to the browser.
        picks={backlog.map(({ item: { id, title, category_id, cover_url, accent_color, rating }, reason }) => ({
          item: { id, title, category_id, cover_url, accent_color, rating },
          reason,
        }))}
        shelves={offered}
        personal={knowsTaste(taste)}
      />
      <Suspense fallback={<NewPicksSkeleton />}>
        <NewPicksSection shelves={offered} seeds={seeds} library={library} taste={taste} />
      </Suspense>
    </div>
  );
}
