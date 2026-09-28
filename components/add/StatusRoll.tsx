"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import { ITEM_STATUSES, type ItemStatus } from "@/lib/status";
import { useFxTier } from "@/lib/use-fx-tier";

/** Which way the board turns: forward rolls up, back rolls down, including across the wrap. */
export function rollDirection(from: ItemStatus, to: ItemStatus): 1 | -1 {
  const count = ITEM_STATUSES.length;
  const a = ITEM_STATUSES.indexOf(from);
  const b = ITEM_STATUSES.indexOf(to);
  if (b === (a + 1) % count) return 1;
  if (b === (a - 1 + count) % count) return -1;
  return b > a ? 1 : -1;
}

const flip = {
  enter: (direction: 1 | -1) => ({ y: direction > 0 ? "105%" : "-105%", opacity: 0.3 }),
  center: { y: "0%", opacity: 1 },
  exit: (direction: 1 | -1) => ({ y: direction > 0 ? "-105%" : "105%", opacity: 0.3 }),
};

/**
 * A status's words turning over like a departure board (U29): the old words
 * roll out, the new roll in, and the window eases to the new width. Visual
 * only: the stepper says the status to screen readers itself.
 */
export function StatusRoll({ status, label }: { status: ItemStatus; label: string }) {
  const lite = useFxTier() === "lite";
  const [previous, setPrevious] = useState(status);
  const [direction, setDirection] = useState<1 | -1>(1);
  if (previous !== status) {
    setPrevious(status);
    setDirection(rollDirection(previous, status));
  }

  const sizer = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useLayoutEffect(() => {
    if (sizer.current) setWidth(sizer.current.offsetWidth);
  }, [label]);

  if (lite) return <span aria-hidden>{label}</span>;

  return (
    <MotionConfig reducedMotion="user">
      <motion.span
        aria-hidden
        className="relative inline-block h-4 overflow-hidden align-middle"
        initial={false}
        // "auto" until measured, then pixels, so the next change has a width to ease from.
        animate={{ width: width ?? "auto" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Sets the height, and measures the words the window grows to. */}
        <span ref={sizer} className="invisible inline-block whitespace-nowrap">
          {label}
        </span>
        <AnimatePresence initial={false} custom={direction}>
          <motion.span
            key={status}
            custom={direction}
            variants={flip}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ type: "spring", stiffness: 520, damping: 34 }}
            className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap"
          >
            {label}
          </motion.span>
        </AnimatePresence>
      </motion.span>
    </MotionConfig>
  );
}
