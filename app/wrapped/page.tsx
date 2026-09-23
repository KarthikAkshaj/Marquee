import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/shell/BrandMark";
import { Button } from "@/components/ui/Button";
import { WrappedReel } from "@/components/wrapped/WrappedReel";
import { getWrappedItems } from "@/lib/queries";
import { ENOUGH_TITLES, summarise } from "@/lib/wrapped";

export const metadata: Metadata = {
  title: "Your year",
  robots: { index: false, follow: false },
};

export default async function WrappedPage() {
  const year = new Date().getFullYear();
  const wrapped = summarise(await getWrappedItems(year), year);

  if (!wrapped.enough) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
        <BrandMark variant="card" />
        <h1 className="font-display opsz-120 mt-6 text-[32px] leading-[1.08] md:text-[42px]">
          Your year is still <em className="text-accent">developing.</em>
        </h1>
        <p className="mt-3.5 max-w-100 text-[14.5px] leading-[1.55] text-text-muted md:text-[15.5px]">
          {wrapped.added === 0
            ? "Nothing has landed on your shelves this year yet."
            : `${wrapped.added} ${wrapped.added === 1 ? "title" : "titles"} so far. Come back past ${ENOUGH_TITLES} and there'll be something worth looking at.`}
        </p>
        <Button asChild className="mt-7">
          <Link href="/home">Back to your shelves</Link>
        </Button>
      </main>
    );
  }

  return <WrappedReel wrapped={wrapped} />;
}
