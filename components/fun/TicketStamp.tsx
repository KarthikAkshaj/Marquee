"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent } from "react";
import { cn } from "@/lib/utils";

type TicketStampProps = {
  /** Called once the stamp has faded, so the parent can forget it. */
  onDone: () => void;
  size?: "sm" | "md";
};

/**
 * "ADMIT ONE" slammed onto a title the moment it's finished (SPEC §9.6):
 * under 700ms, then gone. Reduced motion skips it entirely.
 */
export function TicketStamp({ onDone, size = "md" }: TicketStampProps) {
  const reduced = useReducedMotion();
  const finish = useEffectEvent(onDone);

  useEffect(() => {
    if (reduced) finish();
  }, [reduced]);

  if (reduced) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-bg/35"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.68, times: [0, 0.12, 0.72, 1], ease: "easeOut" }}
      onAnimationComplete={onDone}
    >
      <motion.div
        initial={{ scale: 1.9, rotate: -18 }}
        animate={{ scale: [1.9, 0.92, 1], rotate: [-18, -6, -8] }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          "flex flex-col items-center rounded-[6px] border-2 border-completed bg-bg/80 text-completed shadow-[0_0_28px_color-mix(in_oklab,var(--color-completed)_45%,transparent)] outline-1 outline-offset-[-6px] outline-completed/50 outline-dashed",
          size === "md" ? "gap-0.5 px-3.5 py-2" : "gap-0 px-2.5 py-1.5",
        )}
      >
        <span className={cn("font-mono font-bold tracking-[.22em]", size === "md" ? "text-[13px]" : "text-[10.5px]")}>ADMIT ONE</span>
        <span className={cn("font-mono tracking-[.3em] text-completed/80", size === "md" ? "text-[8.5px]" : "text-[7px]")}>FINISHED</span>
      </motion.div>
    </motion.div>
  );
}
