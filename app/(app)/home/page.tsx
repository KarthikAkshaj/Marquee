import type { Metadata } from "next";
import { MarqueeSign } from "@/components/home/MarqueeSign";
import { getCategories, getViewer } from "@/lib/queries";

export const metadata: Metadata = { title: "Home" };

export default async function HomePage() {
  const [viewer, categories] = await Promise.all([getViewer(), getCategories()]);
  const totalItems = categories.reduce((sum, category) => sum + category.itemCount, 0);

  if (totalItems === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center py-10 md:px-10">
        <MarqueeSign />
        <div className="mt-11 flex max-w-130 flex-col items-center gap-3.5 text-center">
          <h1 className="font-display text-[40px] leading-[1.05] md:text-[50px]">
            Your marquee is <em className="text-accent">dark.</em>
          </h1>
          <p className="text-[15px] leading-[1.6] text-pretty text-text-muted">
            Add the thing you&apos;re three episodes into, or hand over that Word doc
            you&apos;ve been keeping since 2019.
          </p>
        </div>
      </div>
    );
  }

  // Continue, stats and recently finished arrive with Phase 3 (SPEC §8.4).
  const name = viewer.profile?.display_name ?? viewer.profile?.username ?? "you";
  return (
    <h1 className="font-display text-[40px] leading-[1.02] wrap-break-word md:text-[62px] md:leading-none md:tracking-[-.01em]">
      Welcome back, <em className="text-accent">{name}.</em>
    </h1>
  );
}
