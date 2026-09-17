export default function CategoryLoading() {
  return (
    <div aria-busy aria-label="Loading" className="animate-pulse">
      <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="h-11 w-48 rounded-card bg-surface md:h-13.5 md:w-60" />
        <div className="flex gap-2.5">
          <div className="h-11 flex-1 rounded-nav bg-surface md:h-8.5 md:w-52.5" />
          <div className="h-11 w-24 rounded-nav bg-surface md:h-8.5" />
          <div className="h-11 w-28 rounded-nav bg-surface md:h-8.5" />
        </div>
      </div>
      <div className="mt-6.5 flex gap-6 border-b border-border pb-3.25">
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="h-4 w-20 rounded-full bg-surface" />
        ))}
      </div>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-4.5 pt-6 sm:grid-cols-3 md:grid-cols-4 md:gap-5 xl:grid-cols-6">
        {Array.from({ length: 12 }, (_, index) => (
          <li key={index} className="flex flex-col gap-2.5">
            <div className="aspect-2/3 rounded-card border border-border bg-surface" />
            <div className="h-3.5 w-3/4 rounded-full bg-surface" />
            <div className="h-3 w-1/2 rounded-full bg-surface" />
          </li>
        ))}
      </ul>
    </div>
  );
}
