export default function ProfileLoading() {
  return (
    <div aria-busy aria-label="Loading" className="flex animate-pulse flex-col gap-7">
      <div className="flex items-center gap-4.5 md:gap-6">
        <div className="size-24 rounded-full bg-surface md:size-30" />
        <div className="flex flex-1 flex-col gap-3">
          <div className="hidden h-3.5 w-72 rounded-full bg-surface md:block" />
          <div className="h-11 w-full rounded-card bg-surface md:h-10 md:w-32" />
        </div>
      </div>
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-2">
          <div className="h-2.5 w-24 rounded-full bg-surface" />
          <div className="h-11 rounded-card bg-surface" />
        </div>
      ))}
      <div className="h-19 rounded-[11px] bg-surface" />
    </div>
  );
}
