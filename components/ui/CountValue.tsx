import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/** Past this, a counter would drop the thousands comma, so the number just shows. */
export const COUNTABLE_BELOW = 1000;

type CountValueProps = {
  value: number;
  /** Start ticking straight away. Off, it shows the number until `counting` turns on. */
  counting?: boolean;
  /** Stagger against its neighbours. */
  delayMs?: number;
};

/**
 * A whole number that ticks up from zero (U23), in CSS alone: the number is a
 * counter on a registered property, so it's right from the first paint and
 * never swaps out for a zero once scripts load. Screen readers get the number
 * as text. Big numbers keep their comma and don't count.
 */
export function CountValue({ value, counting = true, delayMs = 0 }: CountValueProps) {
  if (value >= COUNTABLE_BELOW || value < 0) return <>{value.toLocaleString("en-US")}</>;
  return (
    <>
      <span
        aria-hidden
        className={cn("counter-num", counting && "count-up")}
        style={{ "--count": value, animationDelay: `${delayMs}ms` } as CSSProperties}
      />
      <span className="sr-only">{value}</span>
    </>
  );
}
