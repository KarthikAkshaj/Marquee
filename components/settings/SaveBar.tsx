"use client";

import { Check, Loader2 } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useSavedFlash } from "./savedFlash";

type SaveBarProps = {
  visible: boolean;
  canSave: boolean;
  saving: boolean;
  onDiscard: () => void;
  onSave: () => void;
};

/**
 * Floats at the foot of the screen while there are unsaved changes (SPEC
 * §8.10, handoff §07). A save lands on it (U33): the dot turns into a tick
 * and it says so for a moment before sliding away.
 */
export function SaveBar({ visible, canSave, saving, onDiscard, onSave }: SaveBarProps) {
  // Straight after a save the form can still look changed until the page refreshes with the saved
  // values, so the moment wins while it lasts.
  const saved = useSavedFlash();

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {(visible || saved) && (
          <motion.div
            role="region"
            aria-label={saved ? "Saved" : "Unsaved changes"}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "fixed inset-x-4 bottom-4.5 z-40 flex min-h-16 items-center gap-3 rounded-[13px] border bg-menu/92 py-2.5 pr-2.5 pl-3.5 shadow-menu backdrop-blur-[18px] transition-colors duration-300 md:right-11 md:bottom-6.5 md:left-[calc(15.5rem+2.75rem)] md:min-h-15.5 md:gap-4 md:rounded-[12px] md:py-3 md:pr-3.5 md:pl-4.5",
              saved ? "border-completed/35" : "border-accent/28",
            )}
          >
            {saved ? (
              <>
                <span aria-hidden className="grid size-5 shrink-0 animate-pop-spring place-items-center rounded-full bg-completed/16 text-completed">
                  <Check className="size-3" strokeWidth={2.6} />
                </span>
                <span role="status" className="flex-1 text-[12.5px] md:text-13">
                  Saved. Looking like you.
                </span>
              </>
            ) : (
              <>
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
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}
