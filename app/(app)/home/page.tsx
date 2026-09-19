import type { Metadata } from "next";
import Link from "next/link";
import { ContinueRow } from "@/components/home/ContinueRow";
import { HomeGreeting } from "@/components/home/HomeGreeting";
import { MarqueeSign } from "@/components/home/MarqueeSign";
import { RecentlyFinished } from "@/components/home/RecentlyFinished";
import { StartAdding } from "@/components/home/StartAdding";
import { StatsStrip } from "@/components/home/StatsStrip";
import { AmbientBackground } from "@/components/shell/AmbientBackground";
import { Button } from "@/components/ui/Button";
import { midFlightLine, statTiles } from "@/lib/home";
import { getCategories, getHome, getViewer } from "@/lib/queries";

export const metadata: Metadata = { title: "Home" };

/** Home (SPEC §8.4): greeting, what's in progress, the numbers, and what you finished. */
export default async function HomePage() {
  const [viewer, categories] = await Promise.all([getViewer(), getCategories()]);
  const totalItems = categories.reduce((sum, category) => sum + category.itemCount, 0);

  if (totalItems === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-10 md:px-10">
        <AmbientBackground variant="empty" />
        <MarqueeSign />
        <div className="mt-11 flex max-w-130 flex-col items-center gap-3.5 text-center">
          <h1 className="font-display text-[40px] leading-[1.05] md:text-[50px]">
            Your marquee is <em className="text-accent">dark.</em>
          </h1>
          <p className="text-[15px] leading-[1.6] text-pretty text-text-muted">
            Add the thing you&apos;re three episodes into, or hand over that Word doc
            you&apos;ve been keeping since 2019.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            <StartAdding />
            <Button asChild variant="secondary" className="h-11 px-4.5">
              <Link href="/import">Import from a doc</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const home = await getHome();
  const shelves = categories.map(({ id, name, slug, color, icon, kind }) => ({ id, name, slug, color, icon, kind }));
  const inProgress = [...home.counts.values()].reduce((sum, count) => sum + count.inProgress, 0);
  const tiles = statTiles(
    categories.map((category) => ({
      id: category.id,
      name: category.name,
      color: category.color,
      kind: category.kind,
      total: category.itemCount,
      inProgress: home.counts.get(category.id)?.inProgress ?? 0,
      planned: home.counts.get(category.id)?.planned ?? 0,
    })),
    home.finishedThisYear,
  );
  const name = viewer.profile?.display_name ?? viewer.profile?.username ?? "you";

  return (
    <>
      <AmbientBackground variant="app" />
      <HomeGreeting name={name} line={midFlightLine(inProgress)} />
      <div className="mt-5.5 md:mt-8.5">
        <ContinueRow items={home.continuing} shelves={shelves} />
      </div>
      <StatsStrip tiles={tiles} className="mt-4 md:mt-6.5" />
      <RecentlyFinished items={home.finished} shelves={shelves} className="mt-4.5 md:mt-7" />
    </>
  );
}
