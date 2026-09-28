import { cn } from "@/lib/utils";

const pulse = "animate-pulse motion-reduce:animate-none";

/** The stats page's shape while it loads: title, shelf chips, the tiles, a wide chart and two half ones. */
export default function StatsLoading() {
  return (
    <div aria-busy aria-label="Loading" className="flex flex-col">
      <div className={cn("h-10.5 w-full max-w-80 rounded-card bg-surface md:h-13.5", pulse)} />
      <div className={cn("mt-3 h-4 w-72 max-w-full rounded-xs bg-surface", pulse)} />

      <div className="mt-5.5 flex gap-2 overflow-hidden md:mt-7">
        {[0, 1, 2, 3].map((chip) => (
          <div key={chip} className={cn("h-11 w-24 shrink-0 rounded-full bg-surface md:h-8.5", pulse)} />
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.25 md:mt-5 md:grid-cols-4 md:gap-3">
        {[0, 1, 2, 3].map((tile) => (
          <div key={tile} className={cn("h-24 rounded-card border border-border bg-surface md:h-26", pulse)} />
        ))}
      </div>

      <div className="mt-3 grid gap-3 md:mt-4 md:gap-4 lg:grid-cols-2">
        <div className={cn("h-80 rounded-tile border border-border bg-surface lg:col-span-2", pulse)} />
        <div className={cn("h-80 rounded-tile border border-border bg-surface", pulse)} />
        <div className={cn("hidden h-80 rounded-tile border border-border bg-surface lg:block", pulse)} />
      </div>
    </div>
  );
}
