import type { Metadata } from "next";
import { Suspense } from "react";
import { BacklogPicks } from "@/components/picks/BacklogPicks";
import { ForYouEmpty } from "@/components/picks/ForYouEmpty";
import { NewPicksSection } from "@/components/picks/NewPicksSection";
import { NewPicksSkeleton } from "@/components/picks/NewPicksSkeleton";
import { PickShelves } from "@/components/picks/PickShelves";
import { loadPickContext } from "@/lib/picks";
import { knowsTaste } from "@/lib/recommend";

export const metadata: Metadata = { title: "For you" };

/**
 * For you (SPEC §20): what to start next from your own list, then titles from
 * outside it that fans of your favourites love. The first is instant; the
 * second streams in while the providers answer. `?shelf=` and `?mood=` scope
 * both, and switch in the browser after the page has loaded.
 */
export default async function ForYouPage({ searchParams }: { searchParams: Promise<{ mood?: string | string[] }> }) {
  const [context, params] = await Promise.all([loadPickContext(), searchParams]);
  if (context.library.length === 0) return <ForYouEmpty />;
  const mood = typeof params.mood === "string" ? params.mood : null;

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
      <PickShelves shelves={context.offered} />
      <BacklogPicks
        // Only what a poster needs goes to the browser, and genres for the mood chips.
        picks={context.backlog.map(({ item: { id, title, category_id, cover_url, accent_color, rating, genres }, reason }) => ({
          item: { id, title, category_id, cover_url, accent_color, rating },
          genres,
          reason,
        }))}
        shelves={context.offered}
        personal={knowsTaste(context.taste)}
      />
      <Suspense fallback={<NewPicksSkeleton />}>
        <NewPicksSection context={context} mood={mood} />
      </Suspense>
    </div>
  );
}
