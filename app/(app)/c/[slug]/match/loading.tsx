import { cn } from "@/lib/utils";

const pulse = "animate-pulse motion-reduce:animate-none";

/** Find covers while it loads: heading, then a few match rows. */
export default function MatchLoading() {
  return (
    <div aria-busy aria-label="Loading" className="flex flex-col gap-5.5">
      <div>
        <div className={cn("h-3 w-20 rounded-xs bg-surface", pulse)} />
        <div className={cn("mt-3 h-9 w-full max-w-110 rounded-card bg-surface md:h-11.5", pulse)} />
        <div className={cn("mt-3 h-4 w-full max-w-130 rounded-xs bg-surface", pulse)} />
      </div>
      <div className="flex flex-col gap-2">
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className={cn("h-19 rounded-card border border-border bg-surface", pulse)} />
        ))}
      </div>
    </div>
  );
}
