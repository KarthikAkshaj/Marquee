import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const BULBS = 24;

type BulbMeterProps = {
  done: number;
  total: number;
  /** What's under way, for screen readers: "Restoring your backup". */
  label: string;
  className?: string;
};

/**
 * Progress in marquee lights (U36): a row of bulbs lighting up left to right
 * as a long job lands, the newest one flaring as it comes on, while the ones
 * still dark ripple faintly to say it's working. Opacity and scale only.
 */
export function BulbMeter({ done, total, label, className }: BulbMeterProps) {
  const lit = total > 0 ? Math.min(BULBS, Math.round((done / total) * BULBS)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={Math.min(done, total)}
      className={cn("flex h-3 items-center justify-between", className)}
    >
      {Array.from({ length: BULBS }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className={cn(
            "size-1.5 rounded-full transition-[background-color,box-shadow] duration-300",
            index < lit ? "bg-accent shadow-bulb-low" : "animate-bulb-wait bg-accent/25 lite:animate-none",
            index === lit - 1 && "animate-bulb-flare",
          )}
          style={index < lit ? undefined : ({ animationDelay: `${(index - lit) * 70}ms` } as CSSProperties)}
        />
      ))}
    </div>
  );
}
