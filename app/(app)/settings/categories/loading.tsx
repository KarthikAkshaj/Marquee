export default function CategoriesLoading() {
  return (
    <div aria-busy aria-label="Loading" className="animate-pulse">
      <div className="h-4 w-80 max-w-full rounded-full bg-surface" />
      <div className="mt-4 overflow-hidden rounded-[11px] border border-border">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="flex items-center gap-3.25 border-b border-white/5 px-4 py-3.5">
            <div className="size-7 rounded-nav bg-surface" />
            <div className="h-3.5 flex-1 rounded-full bg-surface" />
            <div className="h-8 w-24 rounded-nav bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
