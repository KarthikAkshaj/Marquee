"use client";

import { ChevronDown } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useDragControls } from "motion/react";
import { Dialog } from "radix-ui";
import { useRef, type ReactNode } from "react";
import { useReturnFocus } from "@/lib/use-return-focus";

type BottomSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Read out when the sheet opens; shown as the sheet's heading unless `hideTitle`. */
  title: string;
  hideTitle?: boolean;
  description?: string;
  children: ReactNode;
};

const spring = { type: "spring", stiffness: 380, damping: 36 } as const;

/**
 * A phone sheet from the bottom (SPEC §8.3, §9.6): the same spring and drag
 * handle as the item sheet, pulled down or tapped outside to close.
 */
export function BottomSheet({ open, onOpenChange, title, hideTitle = false, description, children }: BottomSheetProps) {
  const returnFocus = useReturnFocus();
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);

  return (
    <MotionConfig reducedMotion="user">
      <Dialog.Root open={open} onOpenChange={onOpenChange}>
        <AnimatePresence>
          {open && (
            <Dialog.Portal forceMount>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="fixed inset-0 z-50 bg-scrim/62 backdrop-blur-[3px]"
                />
              </Dialog.Overlay>
              <Dialog.Content
                onCloseAutoFocus={returnFocus.restore}
                asChild
                forceMount
                onOpenAutoFocus={(event) => {
                  returnFocus.remember();
                  event.preventDefault();
                  panel.current?.focus();
                }}
              >
                <motion.div
                  ref={panel}
                  tabIndex={-1}
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={spring}
                  drag="y"
                  dragListener={false}
                  dragControls={drag}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.9 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 120 || info.velocity.y > 600) onOpenChange(false);
                  }}
                  className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-[22px] border-t border-white/10 bg-sheet pb-[env(safe-area-inset-bottom)] shadow-sheet-up outline-none"
                >
                  <div onPointerDown={(event) => drag.start(event)} className="relative flex h-11.5 shrink-0 touch-none items-center justify-center">
                    <span aria-hidden className="h-1.25 w-12 cursor-grab rounded-full bg-white/28" />
                    <Dialog.Close
                      aria-label="Close"
                      onPointerDown={(event) => event.stopPropagation()}
                      className="absolute top-0.5 right-3.5 flex size-11 items-center justify-center rounded-xl border border-white/10 bg-bg/55 text-text backdrop-blur-sm hover:border-white/22"
                    >
                      <ChevronDown aria-hidden className="size-4" strokeWidth={2.1} />
                    </Dialog.Close>
                  </div>
                  <Dialog.Title className={hideTitle ? "sr-only" : "label-mono px-5 pb-2 text-text-muted"}>{title}</Dialog.Title>
                  <Dialog.Description className="sr-only">{description ?? title}</Dialog.Description>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-4">{children}</div>
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </MotionConfig>
  );
}
