/** Placeholder rows while the first results for a query are on their way. */
export function ResultSkeleton() {
  return (
    <div aria-hidden className="projector flex flex-col">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3.25 px-3 py-2.25">
          <div className="h-12.5 w-8.5 shrink-0 rounded-[5px] bg-white/6" />
          <div className="flex flex-1 flex-col gap-2">
            <div className="h-3 w-2/5 rounded-xs bg-white/6" />
            <div className="h-2.5 w-1/4 rounded-xs bg-white/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
