import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type BulbRingProps = {
  /** Corner radius of the ring, in px or %, a few px wider than the control's own. */
  radius: string;
  /** Bulbs round the edge. Every fourth one is lit, and the lit ones chase. */
  count?: number;
  className?: string;
};

// The ring's path is measured as 100 units whatever its size, so bulbs space evenly on any control.
const PATH = 100;

/**
 * A ring of marquee bulbs round a control (U15). Out of sight until the
 * control is hovered, focused or pressed; then the bulbs come up and a light
 * chases round them. Needs `group relative` on the control. The chase stops
 * on lite devices, and when nothing is touching the control it is paused.
 */
export function BulbRing({ radius, count = 24, className }: BulbRingProps) {
  const gap = PATH / count;
  const edge = { x: 0, y: 0, width: "100%", height: "100%", rx: radius, pathLength: PATH, fill: "none", strokeLinecap: "round" } as const;

  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute -top-1.5 -left-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] overflow-visible opacity-0 transition-opacity duration-200 ease-cinematic",
        "group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100",
        className,
      )}
      style={{ "--bulb-cycle": -gap * 4 } as CSSProperties}
    >
      <rect {...edge} strokeWidth={3} strokeDasharray={`0 ${gap}`} className="stroke-accent/30" />
      <rect
        {...edge}
        strokeWidth={3.5}
        strokeDasharray={`0 ${gap * 4}`}
        className="animate-bulb-chase stroke-accent-bright drop-shadow-[0_0_3px_var(--color-accent)] [animation-play-state:paused] group-hover:[animation-play-state:running] group-focus-visible:[animation-play-state:running] group-active:[animation-play-state:running] lite:animate-none"
      />
    </svg>
  );
}
