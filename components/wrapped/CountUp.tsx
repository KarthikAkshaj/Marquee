"use client";

import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const ROLL_MS = 900;
/** The tail of the app's easing curve, so the count settles like everything else. */
const ease = (t: number) => 1 - (1 - t) ** 3;

/** A count that rolls up once, when its frame reaches the middle of the screen. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const reduced = useReducedMotion();
  const [rolled, setRolled] = useState(0);
  // Nothing to roll for a zero, and reduced motion asks for the number outright.
  const shown = reduced || value === 0 ? value : rolled;

  useEffect(() => {
    if (!inView || reduced || value === 0) return;

    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / ROLL_MS, 1);
      setRolled(Math.round(value * ease(progress)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, reduced, value]);

  return (
    <span ref={ref} className={cn("font-mono tabular-nums", className)}>
      {shown.toLocaleString()}
    </span>
  );
}
