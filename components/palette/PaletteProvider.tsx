"use client";

import { Dialog } from "radix-ui";
import { createContext, useCallback, useContext, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { AddItemDialog } from "@/components/category/AddItemDialog";
import { SurpriseDialog } from "@/components/fun/SurpriseDialog";
import type { PaletteCategory } from "@/lib/palette";
import type { ItemStatus } from "@/lib/status";
import { useReturnFocus } from "@/lib/use-return-focus";
import { PaletteSearch } from "./PaletteSearch";
import { usePaletteTitles } from "./usePaletteTitles";

type AppDialogs = {
  /** The ⌘K palette. */
  open: () => void;
  /** Surprise me (SPEC §10). */
  openSurprise: () => void;
  /** The phone's + button: the shelf's own add panel when one is on screen, the palette anywhere else. */
  add: () => void;
  setAddHandler: (handler: (() => void) | null) => void;
};

const PaletteContext = createContext<AppDialogs | null>(null);

/** Opens the palette or Surprise me from a trigger anywhere in the app shell. */
export function usePalette() {
  const context = useContext(PaletteContext);
  if (!context) throw new Error("usePalette must be used inside PaletteProvider");
  return context;
}

/** Lets the page on screen take over the + button: a shelf opens its own add panel. */
export function useAddHandler(handler: () => void) {
  const { setAddHandler } = usePalette();
  const latest = useRef(handler);
  useEffect(() => {
    latest.current = handler;
  });
  useEffect(() => {
    setAddHandler(() => latest.current());
    return () => setAddHandler(null);
  }, [setAddHandler]);
}

type ManualAdd = { category: PaletteCategory; title: string; status: ItemStatus };

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName));
}

/**
 * The app-wide dialogs (SPEC §8.7b, §8.8, §10): Ctrl/⌘+K toggles the palette,
 * S spins Surprise me, and "Add manually" hands over to the manual add dialog.
 * Both lists of titles come fresh from /api/titles each time they open.
 */
export function PaletteProvider({ categories, children }: { categories: PaletteCategory[]; children: ReactNode }) {
  const returnFocus = useReturnFocus();
  const [open, setOpen] = useState(false);
  const [surprise, setSurprise] = useState<"closed" | "loading" | "ready">("closed");
  const [manual, setManual] = useState<ManualAdd | null>(null);
  const { titles, refresh } = usePaletteTitles();
  const addHandler = useRef<(() => void) | null>(null);

  const show = useCallback(() => {
    setOpen(true);
    void refresh();
  }, [refresh]);

  const add = useCallback(() => (addHandler.current ? addHandler.current() : show()), [show]);
  const setAddHandler = useCallback((handler: (() => void) | null) => {
    addHandler.current = handler;
  }, []);

  const showSurprise = useCallback(async () => {
    setOpen(false);
    setSurprise("loading");
    await refresh();
    setSurprise((state) => (state === "loading" ? "ready" : state));
  }, [refresh]);

  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const key = event.key.toLowerCase();
    if (key === "k" && (event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey) {
      event.preventDefault();
      if (open) setOpen(false);
      else show();
      return;
    }
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey;
    const dialogOpen = document.querySelector('[role="dialog"], [role="alertdialog"]');
    if (key === "s" && plain && !isTyping(event.target) && !dialogOpen) {
      event.preventDefault();
      void showSurprise();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <PaletteContext.Provider value={{ open: show, openSurprise: () => void showSurprise(), add, setAddHandler }}>
      {children}

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/66 backdrop-blur-[4px]" />
          <Dialog.Content
            onOpenAutoFocus={returnFocus.remember}
            onCloseAutoFocus={returnFocus.restore}
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

      <SurpriseDialog
        open={surprise !== "closed"}
        onOpenChange={(next) => !next && setSurprise("closed")}
        categories={categories}
        titles={surprise === "ready" ? titles : null}
        onAddTitle={() => {
          setSurprise("closed");
          show();
        }}
      />

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
