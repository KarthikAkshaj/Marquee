"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useFxTier } from "@/lib/use-fx-tier";

/** The furthest the mockup turns toward the pointer, on top of its resting angle. */
const TURN_Y = 5;
const TURN_X = 3.5;

/**
 * Turns the landing page's Home mockup a little toward the pointer (U17), as
 * if it were a screen you could lean around. It only sets two angles, at most
 * once a frame; the mockup's own transition makes the move lazy and smooth.
 * Wide screens with a mouse, full tier, where the mockup is showing at all.
 */
export function MockupTilt({ className, children }: { className: string; children: ReactNode }) {
  const stage = useRef<HTMLDivElement>(null);
  const tier = useFxTier();

  useEffect(() => {
    const node = stage.current;
    if (!node || tier !== "full" || !window.matchMedia?.("(min-width: 1280px) and (hover: hover) and (pointer: fine)").matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;
    const turn = () => {
      frame = 0;
      node.style.setProperty("--look-y", `${(x * TURN_Y).toFixed(2)}deg`);
      node.style.setProperty("--look-x", `${(-y * TURN_X).toFixed(2)}deg`);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      x = event.clientX / window.innerWidth - 0.5;
      y = event.clientY / window.innerHeight - 0.5;
      frame ||= requestAnimationFrame(turn);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      cancelAnimationFrame(frame);
    };
  }, [tier]);

  return (
    <div ref={stage} aria-hidden className={className}>
      {children}
    </div>
  );
}
