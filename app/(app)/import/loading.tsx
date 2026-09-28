/** The import page's shape while it loads: heading, the two step cards, the footer line. */
export default function ImportLoading() {
  return (
    <div aria-busy aria-label="Loading" className="projector flex flex-col gap-5.5">
      <div>
        <div className="h-3 w-16 rounded-xs bg-surface" />
        <div className="mt-3 h-9 w-full max-w-90 rounded-card bg-surface md:h-11.5" />
        <div className="mt-3 h-4 w-full max-w-110 rounded-xs bg-surface" />
      </div>
      <div className="h-44 rounded-[12px] border border-border bg-surface md:h-40" />
      <div className="h-96 rounded-[12px] border border-border bg-surface md:h-80" />
    </div>
  );
}
