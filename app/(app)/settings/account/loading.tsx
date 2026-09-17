export default function AccountLoading() {
  return (
    <div aria-busy aria-label="Loading" className="flex animate-pulse flex-col gap-7">
      <div className="flex flex-col gap-3 rounded-[11px] border border-border p-5">
        <div className="h-2.5 w-14 rounded-full bg-surface" />
        <div className="h-5 w-64 max-w-full rounded-full bg-surface" />
        <div className="mt-2 flex gap-2.5">
          <div className="h-10 w-32 rounded-card bg-surface" />
          <div className="h-10 w-24 rounded-card bg-surface" />
        </div>
      </div>
      <div className="h-24 rounded-[11px] border border-dropped-muted/15 bg-surface" />
    </div>
  );
}
