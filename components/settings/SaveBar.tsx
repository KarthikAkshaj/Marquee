"use client";

import { Loader2 } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Button } from "@/components/ui/Button";

type SaveBarProps = {
  visible: boolean;
  canSave: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

/** Floats at the foot of the screen while there are unsaved changes (SPEC §8.10, handoff §07). */
export function SaveBar({ visible, canSave, saving, onDiscard, onSave }: SaveBarProps) {
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {visible && (
          <motion.div
            role="region"
            aria-label="Unsaved changes"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-x-4 bottom-4.5 z-40 flex items-center gap-3 rounded-[13px] border border-accent/28 bg-menu/92 py-2.5 pr-2.5 pl-3.5 shadow-menu backdrop-blur-[18px] md:right-11 md:bottom-6.5 md:left-[calc(15.5rem+2.75rem)] md:gap-4 md:rounded-[12px] md:py-3 md:pr-3.5 md:pl-4.5"
          >
            <span aria-hidden className="size-1.75 shrink-0 rounded-full bg-accent shadow-mark-xs" />
            <span className="flex-1 text-[12.5px] md:text-13">
              <span className="md:hidden">Unsaved</span>
              <span className="hidden md:inline">Unsaved changes</span>
            </span>
            <Button variant="ghost" onClick={onDiscard} disabled={saving} className="h-11 px-3 text-[12.5px] md:h-9.5 md:px-3.75 md:text-13">
              Discard
            </Button>
            <Button onClick={onSave} disabled={!canSave || saving} aria-busy={saving} className="h-11 px-4.5 text-13 md:h-9.5">
              {saving && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
              {saving ? "Saving…" : "Save"}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
