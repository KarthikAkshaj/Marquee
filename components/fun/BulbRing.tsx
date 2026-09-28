import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

type BulbRingProps = {
  /** Corner radius of the ring, in px or %, a few px wider than the control's own. */
  radius: string;
  /** Bulbs round the edge. Every fourth one is lit, and the lit ones chase. */
  count?: number;
  /** On and chasing regardless of hover: something is under way (sending a sign-in code). */
  lit?: boolean;
  /**
   * On at rest, a sign on standby: every bulb glows low and alternate bulbs
   * twinkle slowly (U24). The chase takes over whenever anything inside the
   * `group/auth` element around it is busy (aria-busy), so a pending button
   * lights it without being wired to it.
   */
  standby?: boolean;
  className?: string;
};

// The ring's path is measured as 100 units whatever its size, so bulbs space evenly on any control.
const PATH = 100;

const frame = "pointer-events-none absolute -top-1.5 -left-1.5 h-[calc(100%+12px)] w-[calc(100%+12px)] overflow-visible";

/**
 * A ring of marquee bulbs round a control (U15). Out of sight until the
 * control is hovered, focused or pressed; then the bulbs come up and a light
 * chases round them. Needs `group relative` on the control. The chase stops
 * on lite devices, and when nothing is touching the control it is paused.
 */
export function BulbRing({ radius, count = 24, lit = false, standby = false, className }: BulbRingProps) {
  const gap = PATH / count;
  const edge = { x: 0, y: 0, width: "100%", height: "100%", rx: radius, pathLength: PATH, fill: "none", strokeLinecap: "round" } as const;

  const ring = (
    <svg
      aria-hidden
      className={cn(
        frame,
        "transition-opacity duration-200 ease-cinematic",
        !standby && "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100",
        lit && "animate-page-in opacity-100",
        className,
      )}
      style={{ "--bulb-cycle": -gap * 4 } as CSSProperties}
    >
      <rect {...edge} strokeWidth={3} strokeDasharray={`0 ${gap}`} className={standby ? "stroke-accent/22" : "stroke-accent/30"} />
      <rect
        {...edge}
        strokeWidth={3.5}
        strokeDasharray={`0 ${gap * 4}`}
        className={cn(
          "animate-bulb-chase stroke-accent-bright drop-shadow-[0_0_3px_var(--color-accent)] [animation-play-state:paused] group-hover:[animation-play-state:running] group-focus-visible:[animation-play-state:running] group-active:[animation-play-state:running] lite:animate-none",
          lit && "[animation-play-state:running]",
          standby &&
            "opacity-0 transition-opacity duration-300 group-has-[[aria-busy=true]]/auth:opacity-100 group-has-[[aria-busy=true]]/auth:[animation-play-state:running]",
        )}
      />
    </svg>
  );

  if (!standby) return ring;

  // Two layers of alternate bulbs, each fading by its own opacity, half a beat
  // apart: a composited fade, so the slow twinkle never repaints the ring.
  const twinkle = (offset: number, delay: string) => (
    <svg aria-hidden className={cn(frame, "animate-twinkle opacity-40 lite:animate-none", delay)}>
      <rect
        {...edge}
        strokeWidth={3.25}
        strokeDasharray={`0 ${gap * 2}`}
        strokeDashoffset={offset}
        className="stroke-accent-bright drop-shadow-[0_0_2px_var(--color-accent)]"
      />
    </svg>
  );

  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-0 transition-opacity duration-300 group-has-[[aria-busy=true]]/auth:opacity-0">
        {twinkle(0, "")}
        {twinkle(-gap, "[animation-delay:-1.8s]")}
      </span>
      {ring}
    </>
  );
}
