import { memberSinceLabel, passBarcode } from "@/lib/profile";

/**
 * The tear-off end of the member pass (U31): ADMIT ONE, when you joined and a
 * barcode drawn from your username. Down the right side from md, across the
 * bottom on phones.
 */
export function PassStub({ memberSince, username }: { memberSince: string; username: string }) {
  return (
    <div className="relative flex h-22 items-center justify-between gap-4 border-t border-dashed border-white/16 px-5 md:h-auto md:flex-col md:items-start md:justify-center md:gap-3.5 md:border-t-0 md:border-l md:px-5.5">
      <p aria-hidden className="hidden font-mono text-[11px] font-semibold tracking-[.24em] text-accent md:block">
        ADMIT ONE
      </p>
      <dl>
        <dt className="label-mono text-[9px] tracking-[.16em] text-text-muted">Member since</dt>
        <dd className="mt-1 font-mono text-[17px] leading-none tracking-[.04em] text-text">{memberSinceLabel(memberSince)}</dd>
      </dl>
      <div aria-hidden className="flex flex-col items-end gap-1.5 md:items-start">
        <span className="flex h-8 items-stretch gap-[2px] opacity-80 md:h-9">
          {passBarcode(username).map((width, index) => (
            <span key={index} className="bg-text/75" style={{ width }} />
          ))}
        </span>
        <span className="font-mono text-[9px] tracking-[.2em] text-text-muted md:hidden">ADMIT ONE</span>
      </div>
    </div>
  );
}
