export default function DataLoading() {
  return (
    <div aria-busy aria-label="Loading" className="flex animate-pulse flex-col gap-4 motion-reduce:animate-none">
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map((card) => (
          <div key={card} className="flex flex-col gap-3 rounded-[11px] border border-border p-5">
            <div className="h-2.5 w-20 rounded-full bg-surface" />
            <div className="h-7 w-48 max-w-full rounded-full bg-surface" />
            <div className="h-4 w-full rounded-full bg-surface" />
            <div className="mt-2 h-10 w-32 rounded-card bg-surface" />
          </div>
        ))}
      </div>
      <div className="h-17 rounded-[11px] border border-border bg-surface" />
    </div>
  );
}
