/** For you's shape while it loads: title, shelf chips, then a grid of posters. */
export default function ForYouLoading() {
  return (
    <div aria-busy aria-label="Loading" className="projector flex flex-col">
      <div className="h-10.5 w-full max-w-72 rounded-card bg-surface md:h-13.5" />
      <div className="mt-3 h-4 w-80 max-w-full rounded-xs bg-surface" />

      <div className="mt-5.5 flex gap-2 overflow-hidden md:mt-7">
        {[0, 1, 2, 3].map((chip) => (
          <div key={chip} className="h-11 w-24 shrink-0 rounded-full bg-surface md:h-8.5" />
        ))}
      </div>

      <div className="mt-7 mb-3 h-3.5 w-36 rounded-xs bg-surface md:mt-9" />
      <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-5 md:gap-x-4 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((poster) => (
          <div key={poster} className="aspect-2/3 rounded-[9px] border border-border bg-surface" />
        ))}
      </div>
    </div>
  );
}
