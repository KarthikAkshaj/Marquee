"use client";

import { Search } from "lucide-react";
import { shortcutKeys, useIsMac } from "@/lib/use-platform";
import { cn } from "@/lib/utils";
import { usePalette } from "./PaletteProvider";

/**
 * Opens the palette. In the sidebar it looks like a field with its keycap
 * (handoff §01); in the phone header it's a search icon.
 */
export function PaletteTrigger({ variant, dim = false }: { variant: "sidebar" | "icon"; dim?: boolean }) {
  const { open } = usePalette();
  const { mod } = shortcutKeys(useIsMac());

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={open}
        aria-label="Search or add"
        className="flex size-11 items-center justify-center rounded-card border border-border bg-surface text-text-muted transition-colors hover:text-text"
      >
        <Search aria-hidden className="size-4" strokeWidth={1.8} />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={open}
      aria-keyshortcuts="Control+K Meta+K"
      className="mb-1.5 flex items-center gap-2 rounded-nav border border-border bg-surface px-2.5 py-2.5 text-left transition-colors hover:border-border-strong"
    >
      <Search aria-hidden className="size-3.25 text-text-muted" strokeWidth={2.2} />
      <span className="flex-1 text-12 text-text-muted">Search or add</span>
      <kbd
        className={cn(
          "rounded-[5px] border border-border bg-elevated px-1.5 py-0.5 font-mono text-[11px]",
          dim ? "text-text-muted" : "text-text",
        )}
      >
        {mod} K
      </kbd>
    </button>
  );
}
