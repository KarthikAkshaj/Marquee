import type { Wrapped } from "@/lib/wrapped";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <dt className="font-mono text-[8.5px] tracking-[.24em] text-accent/70 md:text-[9.5px]">{label}</dt>
      <dd className="font-mono text-[19px] tabular-nums text-text md:text-[22px]">{value}</dd>
    </div>
  );
}

/** The stub you keep: the ADMIT ONE treatment, in the year's own colour. */
export function WrappedTicket({ wrapped }: { wrapped: Wrapped }) {
  return (
    <div className="flex flex-col items-center rounded-[8px] border-2 border-accent bg-bg/80 px-7 py-5 text-accent shadow-[0_0_34px_color-mix(in_oklab,var(--color-accent)_38%,transparent)] outline-1 outline-accent/50 outline-dashed outline-offset-[-7px] md:px-11 md:py-6.5">
      <span className="font-mono text-[15px] font-bold tracking-[.22em] md:text-[17px]">ADMIT ONE</span>
      <span className="font-mono text-[9px] tracking-[.3em] text-accent/80 md:text-[10px]">MARQUEE {wrapped.year}</span>
      <span aria-hidden className="mt-4.5 h-px w-full bg-accent/25" />
      <dl className="mt-4.5 flex gap-7 md:gap-10">
        <Stat label="ADDED" value={wrapped.added.toLocaleString()} />
        <Stat label="FINISHED" value={wrapped.finished.toLocaleString()} />
        <Stat label="HOURS" value={wrapped.hours.toLocaleString()} />
      </dl>
    </div>
  );
}
