"use client";

import { ChevronDown, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useDragControls } from "motion/react";
import { Dialog } from "radix-ui";
import { useRef } from "react";
import type { Item } from "@/lib/items";
import type { CategoryKind } from "@/lib/status";
import { useMediaQuery } from "@/lib/use-media-query";
import { ItemSheetActions } from "./ItemSheetActions";
import { ItemSheetFields } from "./ItemSheetFields";
import { ItemSheetHeader } from "./ItemSheetHeader";
import type { ItemActions, ShelfCategory } from "./useItemActions";

type ItemSheetProps = {
  /** The open title; null closes the sheet. */
  item: Item | null;
  category: ShelfCategory & { kind: CategoryKind };
  categories: ShelfCategory[];
  actions: ItemActions;
  onClose: () => void;
  /** Asks first; the sheet closes once it's confirmed. */
  onDelete: (item: Item) => void;
};

const spring = { type: "spring", stiffness: 380, damping: 36 } as const;

/**
 * The item detail sheet (SPEC §8.6, handoff §03): from the right on desktop,
 * from the bottom on phones, where the handle drags it closed.
 */
export function ItemSheet({ item, category, categories, actions, onClose, onDelete }: ItemSheetProps) {
  const desktop = useMediaQuery("(min-width: 768px)");
  const drag = useDragControls();
  const panel = useRef<HTMLDivElement>(null);
  const offscreen = desktop ? { x: "100%", y: 0 } : { x: 0, y: "100%" };

  const moveAndDelete = (open: Item) => ({
    currentId: category.id,
    categories,
    onMove: (to: ShelfCategory) => {
      onClose();
      actions.move(open, to);
    },
    onDelete: () => onDelete(open),
  });

  return (
    // MotionConfig sits outside: Radix hands each direct child of Portal a ref, and it isn't an element.
    <MotionConfig reducedMotion="user">
      <Dialog.Root open={item !== null} onOpenChange={(open) => !open && onClose()}>
        <AnimatePresence>
          {item && (
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
                asChild
                forceMount
                onOpenAutoFocus={(event) => {
                  event.preventDefault();
                  panel.current?.focus();
                }}
                // Esc inside an in-place edit cancels that edit, not the sheet.
                onEscapeKeyDown={(event) => {
                  if (event.target instanceof Element && event.target.closest("[data-inline-edit]")) event.preventDefault();
                }}
              >
                <motion.div
                  ref={panel}
                  tabIndex={-1}
                  initial={offscreen}
                  animate={{ x: 0, y: 0 }}
                  exit={offscreen}
                  transition={spring}
                  drag={desktop ? false : "y"}
                  dragListener={false}
                  dragControls={drag}
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={{ top: 0, bottom: 0.9 }}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
                  }}
                  className="fixed inset-x-0 top-19.5 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-[22px] border-t border-white/10 bg-sheet shadow-sheet-up outline-none md:top-0 md:left-auto md:w-140 md:max-w-full md:rounded-l-sheet md:rounded-tr-none md:border-t-0 md:border-l md:shadow-sheet"
                >
                  <Dialog.Title className="sr-only">{item.title}</Dialog.Title>
                  <Dialog.Description className="sr-only">
                    Status, progress, rating, dates and notes. Changes save as you go.
                  </Dialog.Description>

                  <div
                    onPointerDown={(event) => drag.start(event)}
                    className="relative flex h-11.5 shrink-0 touch-none items-center justify-center md:hidden"
                  >
                    <span aria-hidden className="h-1.25 w-12 cursor-grab rounded-full bg-white/28" />
                    <Dialog.Close
                      aria-label="Close"
                      onPointerDown={(event) => event.stopPropagation()}
                      className="absolute top-0.5 right-3.5 flex size-11 items-center justify-center rounded-xl border border-white/10 bg-bg/55 text-text backdrop-blur-sm hover:border-white/22"
                    >
                      <ChevronDown aria-hidden className="size-4" strokeWidth={2.1} />
                    </Dialog.Close>
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="absolute top-3.5 right-4 z-10 hidden size-7 items-center justify-center rounded-[7px] border border-white/10 bg-bg/50 text-text backdrop-blur-sm hover:border-white/22 md:flex"
                  >
                    <X aria-hidden className="size-3.5" strokeWidth={2} />
                  </Dialog.Close>

                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    <ItemSheetHeader
                      item={item}
                      category={category}
                      onDetails={(details) => actions.updateDetails(item, details)}
                      onToggleFavorite={() => actions.toggleFavorite(item)}
                    />
                    <ItemSheetFields item={item} kind={category.kind} actions={actions} />
                    <ItemSheetActions variant="footer" {...moveAndDelete(item)} />
                  </div>
                  <ItemSheetActions variant="bar" {...moveAndDelete(item)} />
                </motion.div>
              </Dialog.Content>
            </Dialog.Portal>
          )}
        </AnimatePresence>
      </Dialog.Root>
    </MotionConfig>
  );
}
