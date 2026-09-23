"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FrameProps = {
  /** Leader numbering. A reel is a sequence, so the count means something. */
  index: number;
  label: string;
  children: ReactNode;
  className?: string;
};

/** One frame of the reel: a screen's worth, holding a single statement. */
export function Frame({ index, label, children, className }: FrameProps) {
  const reduced = useReducedMotion();

  return (
    <section className="relative z-1 flex min-h-dvh snap-start snap-always flex-col items-center justify-center px-6 py-20">
      <motion.div
        className={cn("flex w-full max-w-160 flex-col items-center text-center", className)}
        initial={reduced ? false : { opacity: 0, y: 22 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.45 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="label-mono mb-7 tracking-[.22em] text-text-faint">
          {String(index).padStart(2, "0")} · {label}
        </p>
        {children}
      </motion.div>
    </section>
  );
}
