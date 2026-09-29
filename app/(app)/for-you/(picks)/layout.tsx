import type { Metadata } from "next";
import { Suspense } from "react";
import { BacklogPicks } from "@/components/picks/BacklogPicks";
import { ForYouEmpty } from "@/components/picks/ForYouEmpty";
import { NewPicksSection } from "@/components/picks/NewPicksSection";
import { NewPicksSkeleton } from "@/components/picks/NewPicksSkeleton";
import { PickShelves } from "@/components/picks/PickShelves";
import { TagFill } from "@/components/picks/TagFill";
import { loadPickContext } from "@/lib/picks";
import { knowsTaste, tagGaps } from "@/lib/recommend";

export const metadata: Metadata = { title: "For you" };

/**
 * For you (SPEC §20): what to start next from your own list, then titles from
 * outside it that fans of your favourites love. The first is instant; the
 * second streams in while the providers answer. `?shelf=` and `?mood=` scope
 * both, and are read in the browser.
 *
 * Drawn by a layout over an empty page, like a shelf: Next keys a page by its
 * whole address, so after a chip changed it, "Plan it" (which refreshes the
 * route) found a "different" page and rebuilt this one, jumping it to the top
 * and losing the card's "On Anime". A layout stays put. It can't see the
 * address, so it always starts with the usual picks; a mood in the link is
 * fetched in the browser.
 */
export default async function ForYouLayout({ children }: LayoutProps<"/for-you">) {
  const context = await loadPickContext();
  if (context.library.length === 0) return <ForYouEmpty />;

  return (
    <div className="flex flex-col">
      <header className="min-w-0">
        <h1 className="font-display opsz-120 text-[42px] leading-none md:text-[54px]">
          Picked <em className="text-accent">for you.</em>
        </h1>
        <p className="mt-3 text-14 text-pretty text-text-muted md:text-[15px]">
          What to start next, and what fans of your favourites can&apos;t stop talking about.
        </p>
        <TagFill gaps={tagGaps(context.library)} />
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
        <NewPicksSection context={context} />
      </Suspense>
      {children}
    </div>
  );
}
