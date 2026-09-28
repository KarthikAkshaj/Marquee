"use client";

import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";
import { createContext, useContext, useState, type FocusEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Quick to arrive, no wobble: a selection frame, not a ball on a string. */
const SPRING = { type: "spring", stiffness: 520, damping: 44, mass: 0.9 } as const;

type GlideState = { id: string; hovered: string | null; setHovered: (key: string | null) => void };

const GlideContext = createContext<GlideState | null>(null);

/**
 * A list whose highlights glide between items like a game menu's selection
 * frame (U20). The current item's highlight slides to the new one when you
 * navigate; a softer frame follows the pointer and keyboard focus, and fades
 * out when you leave the list. Reduced motion moves them without the glide.
 */
export function GlideGroup({ id, className, children }: { id: string; className?: string; children: ReactNode }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const leave = (event: FocusEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setHovered(null);
  };

  return (
    <MotionConfig reducedMotion="user">
      <LayoutGroup id={id}>
        <GlideContext.Provider value={{ id, hovered, setHovered }}>
          <div className={className} onPointerLeave={() => setHovered(null)} onBlur={leave}>
            {children}
          </div>
        </GlideContext.Provider>
      </LayoutGroup>
    </MotionConfig>
  );
}

/**
 * One item's part in a GlideGroup: handlers for the element, and the frames
 * to render inside it (it needs `relative isolate` and a border radius). The
 * current item's pill takes `pillClassName`, and anything in `pillChildren`
 * glides with it. With no group around it, it does nothing.
 */
export function useGlide(key: string, current: boolean, pillClassName?: string, pillChildren?: ReactNode) {
  const glide = useContext(GlideContext);
  if (!glide) return { bind: {}, frames: null };

  const hovered = glide.hovered === key;
  return {
    bind: { onPointerEnter: () => glide.setHovered(key), onFocus: () => glide.setHovered(key) },
    frames: (
      <>
        {current && pillClassName && (
          <motion.span
            layoutId={`glide-current-${glide.id}`}
            transition={SPRING}
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 -z-1 rounded-[inherit]", pillClassName)}
          >
            {pillChildren}
          </motion.span>
        )}
        <AnimatePresence>
          {hovered && (
            <motion.span
              layoutId={`glide-hover-${glide.id}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ ...SPRING, opacity: { duration: 0.15 } }}
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-1 rounded-[inherit] bg-white/5 shadow-[inset_0_0_0_1px_rgb(255_255_255/0.06)]"
            />
          )}
        </AnimatePresence>
      </>
    ),
  };
}
