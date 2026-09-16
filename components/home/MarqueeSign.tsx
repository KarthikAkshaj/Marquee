import { cn } from "@/lib/utils";

const BULBS = 13;

// Which bulbs still glow on a dark marquee (handoff §06).
const TOP_LIT = new Set([3, 9]);
const TOP_WARM = new Set([0, 6, 12]);
const BOTTOM_LIT = new Set([5]);
const BOTTOM_WARM = new Set([1, 11]);

function topBulb(index: number) {
  if (TOP_LIT.has(index)) return "bg-accent shadow-bulb";
  if (TOP_WARM.has(index)) return "bg-accent/32 shadow-bulb-warm";
  return "bg-white/10";
}

function bottomBulb(index: number) {
  if (BOTTOM_LIT.has(index)) return "bg-accent/70 shadow-bulb-low";
  if (BOTTOM_WARM.has(index)) return "bg-accent/24";
  return "bg-white/8";
}

function BulbRow({ bulb }: { bulb: (index: number) => string }) {
  return (
    <div className="flex items-center justify-between">
      {Array.from({ length: BULBS }, (_, index) => (
        <span key={index} className={cn("size-1.25 rounded-full", bulb(index))} />
      ))}
    </div>
  );
}

/** The empty-home illustration: a marquee sign with most of its bulbs out. Shapes only. */
export function MarqueeSign() {
  return (
    <div aria-hidden className="relative h-57.5 w-full max-w-105 flex-none">
      <div className="glow-amber-floor absolute -bottom-1.5 left-1/2 h-37.5 w-full -translate-x-1/2 blur-[30px]" />

      <div className="sign-face absolute top-3.5 left-1/2 flex h-42 w-[75.7%] -translate-x-1/2 flex-col justify-between overflow-hidden rounded-xl border border-white/10 px-4 py-3.5">
        <BulbRow bulb={topBulb} />
        <div className="flex flex-col items-center gap-2.25 pb-1">
          <div className="h-2.25 w-[74%] rounded-[3px] bg-white/[.055]" />
          <div className="h-2.25 w-1/2 rounded-[3px] bg-white/[.035]" />
        </div>
        <BulbRow bulb={bottomBulb} />
      </div>

      <div className="sign-stand absolute top-45.5 left-1/2 h-6.5 w-30 -translate-x-1/2 rounded-b-[8px]" />
      <div className="sign-footlight absolute top-51.5 left-1/2 h-px w-57.5 -translate-x-1/2" />
    </div>
  );
}
