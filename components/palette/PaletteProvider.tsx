"use client";

import { Dialog } from "radix-ui";
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useState, type ReactNode } from "react";
import { AddItemDialog } from "@/components/category/AddItemDialog";
import type { PaletteCategory } from "@/lib/palette";
import type { ItemStatus } from "@/lib/status";
import { PaletteSearch } from "./PaletteSearch";
import { usePaletteTitles } from "./usePaletteTitles";

const PaletteContext = createContext<{ open: () => void } | null>(null);

/** Opens the palette from a trigger anywhere in the app shell. */
export function usePalette() {
  const context = useContext(PaletteContext);
  if (!context) throw new Error("usePalette must be used inside PaletteProvider");
  return context;
}

type ManualAdd = { category: PaletteCategory; title: string; status: ItemStatus };

/**
 * The ⌘K palette for the whole signed-in app (SPEC §8.8): Ctrl/⌘+K anywhere
 * toggles it, the sidebar and phone header open it, and "Add manually" hands
 * over to the manual add dialog for the chosen shelf.
 */
export function PaletteProvider({ categories, children }: { categories: PaletteCategory[]; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState<ManualAdd | null>(null);
  const { titles, refresh } = usePaletteTitles();

  const show = useCallback(() => {
    setOpen(true);
    void refresh();
  }, [refresh]);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
    event.preventDefault();
    if (open) setOpen(false);
    else show();
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext.Provider value={{ open: show }}>
      {children}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/66 backdrop-blur-[4px]" />
          <Dialog.Content
            aria-describedby={undefined}
            className="fixed top-4 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-165 -translate-x-1/2 flex-col overflow-hidden rounded-sheet border border-white/10 bg-menu/82 shadow-dialog backdrop-blur-[26px] backdrop-saturate-130 md:top-29.5 md:max-h-[calc(100dvh-150px)]"
          >
            <Dialog.Title className="sr-only">Search Marquee</Dialog.Title>
            <PaletteSearch
              categories={categories}
              titles={titles}
              onClose={() => setOpen(false)}
              onManual={(category, title, status) => setManual({ category, title, status })}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {manual && (
        <AddItemDialog
          open
          onOpenChange={(next) => !next && setManual(null)}
          category={manual.category}
          defaultStatus={manual.status}
          initialTitle={manual.title}
        />
      )}
    </PaletteContext.Provider>
  );
}
