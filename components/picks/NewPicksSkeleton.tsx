/** "New to you" while the providers answer: the heading, then a row of cards in the projector's light. */
export function NewPicksSkeleton() {
  return (
    <section aria-busy aria-label="Finding new picks" className="projector mt-9 flex flex-col gap-3 md:mt-12">
      <div className="mb-0.5 h-3.5 w-28 rounded-xs bg-surface" />
      <p className="text-13 text-text-muted">Asking fans of your favourites…</p>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 md:grid-cols-4 md:gap-x-4 lg:grid-cols-6">
        {[0, 1, 2, 3, 4, 5].map((card) => (
          <li key={card} className="flex flex-col gap-2.5">
            <div className="aspect-2/3 rounded-[10px] border border-border bg-surface" />
            <div className="h-3.5 w-4/5 rounded-xs bg-surface" />
            <div className="h-3 w-3/5 rounded-xs bg-surface" />
            <div className="h-11 rounded-card bg-surface md:h-8.5" />
          </li>
        ))}
      </ul>
    </section>
  );
}
