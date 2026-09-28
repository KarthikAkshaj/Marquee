import { cn } from "@/lib/utils";

/** Home's shape while it loads: greeting, three Continue cards, the stats strip, a row of posters. */
export default function HomeLoading() {
  return (
    <div aria-busy aria-label="Loading" className="projector flex flex-col">
      <div className="h-3 w-36 rounded-xs bg-surface" />
      <div className="mt-3 h-10 w-full max-w-100 rounded-card bg-surface md:h-15" />
      <div className="mt-3 h-4 w-64 rounded-xs bg-surface" />

      <div className="mt-8 grid gap-2.5 md:mt-12 md:grid-cols-2 md:gap-4.5 xl:grid-cols-3">
        {[0, 1, 2].map((card) => (
          <div
            key={card}
            className={cn("h-25 rounded-card border border-border bg-surface md:h-37.5", card === 2 && "hidden xl:block")}
          />
        ))}
      </div>

      <div className="mt-4 h-20.5 rounded-card border border-border bg-surface md:mt-6.5 md:h-22" />

      <div className="mt-10 flex gap-3 overflow-hidden md:gap-4">
        {[0, 1, 2, 3, 4, 5].map((poster) => (
          <div key={poster} className="h-36 w-24 shrink-0 rounded-[9px] bg-surface md:h-44.25 md:w-29.5" />
        ))}
      </div>
    </div>
  );
}
