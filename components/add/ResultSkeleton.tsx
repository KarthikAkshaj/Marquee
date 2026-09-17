/** Placeholder rows while the first results for a query are on their way. */
export function ResultSkeleton() {
  return (
    <div aria-hidden className="flex flex-col">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3.25 px-3 py-2.25">
          <div className="h-12.5 w-8.5 shrink-0 animate-pulse rounded-[5px] bg-white/6 motion-reduce:animate-none" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-2/5 animate-pulse rounded-xs bg-white/6 motion-reduce:animate-none" />
            <div className="h-2.5 w-1/4 animate-pulse rounded-xs bg-white/4 motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
