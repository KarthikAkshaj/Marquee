"use client";

import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent } from "react";
import { ItemCover } from "@/components/items/ItemCover";
import type { PaletteCategory, PaletteTitle } from "@/lib/palette";
import { cn } from "@/lib/utils";

type SurpriseReelProps = {
  frames: PaletteTitle[];
  /** Where the pick sits in the strip; covers after it keep the strip full. */
  pickIndex: number;
  shelves: ReadonlyMap<string, PaletteCategory>;
  /** Changes on every spin, restarting the reel. */
  spinKey: number;
  landed: boolean;
  onLanded: () => void;
};

const BULBS = 15;

function Bulbs({ spinning }: { spinning: boolean }) {
  return (
    <div aria-hidden className="flex justify-between px-3">
      {Array.from({ length: BULBS }, (_, index) => (
        <span
          key={index}
          className={cn("size-1.25 rounded-full bg-accent shadow-bulb-low", spinning ? "animate-bulb motion-reduce:animate-none" : "opacity-90")}
          style={spinning ? { animationDelay: `${(index % 3) * 300}ms` } : undefined}
        />
      ))}
    </div>
  );
}

/**
 * The slot-machine reel (SPEC §10): covers race past the gate, slow down and
 * stop on the pick. Reduced motion jumps straight to it.
 */
export function SurpriseReel({ frames, pickIndex, shelves, spinKey, landed, onLanded }: SurpriseReelProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();
  const reduced = useReducedMotion();
  const land = useEffectEvent(onLanded);

  useEffect(() => {
    const track = scope.current;
    const [first, second] = Array.from(track?.children ?? []) as HTMLElement[];
    if (!track || !first) return;
    const step = second ? second.offsetLeft - first.offsetLeft : 0;
    const controls = animate(
      track,
      { x: [0, -step * pickIndex] },
      reduced ? { duration: 0 } : { duration: 2.6, ease: [0.12, 0.72, 0.12, 1] },
    );
    void controls.then(() => land());
    return () => controls.stop();
  }, [spinKey, pickIndex, reduced, animate, scope]);

  return (
    <div className="flex flex-col gap-2.5">
      <Bulbs spinning={!landed} />
      <div className="relative h-34 overflow-hidden mask-x-from-80% md:h-40">
        <div ref={scope} className="absolute top-1/2 left-1/2 -ml-10 flex -translate-y-1/2 gap-3 md:-ml-12 md:gap-3.5">
          {frames.map((frame, index) => {
            const shelf = shelves.get(frame.category_id);
            const picked = landed && index === pickIndex;
            return (
              <div
                key={`${index}-${frame.id}`}
                className={cn(
                  "relative h-30 w-20 shrink-0 overflow-hidden rounded-card border border-white/8 transition-[scale,opacity,box-shadow] duration-300 ease-cinematic md:h-36 md:w-24",
                  landed && !picked && "opacity-35",
                  picked && "scale-108 border-accent/70 shadow-[0_0_34px_color-mix(in_oklab,var(--color-accent)_45%,transparent)]",
                )}
              >
                <ItemCover item={frame} categoryColor={shelf?.color ?? "amber"} sizes="96px" />
              </div>
            );
          })}
        </div>
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-32 w-22 -translate-1/2 rounded-[12px] ring-1 ring-accent/45 md:h-38.5 md:w-26.5" />
      </div>
      <Bulbs spinning={!landed} />
    </div>
  );
}
