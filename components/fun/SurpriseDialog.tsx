"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { Dialog } from "radix-ui";
import { categorySlugFromPath, type PaletteCategory, type PaletteTitle } from "@/lib/palette";
import { SurpriseContent } from "./SurpriseContent";

type SurpriseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: PaletteCategory[];
  /** Fresh titles once loaded; null while they're on their way. */
  titles: PaletteTitle[] | null;
  onAddTitle: () => void;
};

/** The Surprise me panel (SPEC §10). On a shelf it starts on that shelf; anywhere else, anything goes. */
export function SurpriseDialog({ open, onOpenChange, categories, titles, onAddTitle }: SurpriseDialogProps) {
  const slug = categorySlugFromPath(usePathname());
  const here = categories.find((category) => category.slug === slug)?.id ?? null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-scrim/72 backdrop-blur-[4px]" />
        <Dialog.Content
          // Focus the panel, not the close button, so opening with S doesn't light up the X.
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            (event.currentTarget as HTMLElement).focus();
          }}
          className="fixed top-1/2 left-1/2 z-50 outline-none max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-150 -translate-1/2 overflow-y-auto rounded-sheet border border-white/10 bg-menu/90 shadow-dialog backdrop-blur-[26px]">
          <div className="flex items-start justify-between gap-4 border-b border-white/7 px-4 pt-4 pb-3.5 md:px-6 md:pt-5">
            <div>
              <Dialog.Title className="font-mono text-[10.5px] tracking-[.14em] text-accent">SURPRISE ME</Dialog.Title>
              <Dialog.Description className="mt-1.5 text-13 text-text-muted">Can&apos;t pick? Let the reel do it.</Dialog.Description>
            </div>
            <Dialog.Close aria-label="Close" className="-mt-1.5 -mr-2 grid size-11 place-items-center rounded-full text-text-muted hover:text-text">
              <X aria-hidden className="size-4.5" strokeWidth={1.8} />
            </Dialog.Close>
          </div>
          {titles ? (
            <SurpriseContent
              categories={categories}
              titles={titles}
              initialCategoryId={here}
              onClose={() => onOpenChange(false)}
              onAddTitle={onAddTitle}
            />
          ) : (
            <div aria-busy className="flex h-80 items-center justify-center text-13 text-text-muted">
              Loading the reel…
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
