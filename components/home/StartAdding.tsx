"use client";

import { Plus } from "lucide-react";
import { usePalette } from "@/components/palette/PaletteProvider";
import { Button } from "@/components/ui/Button";

/** The empty Home's first action (SPEC §8.4): straight into search-and-add. */
export function StartAdding() {
  const { open } = usePalette();
  return (
    <Button onClick={open} className="h-11 gap-1.5 px-4.5 shadow-cta-sm">
      <Plus aria-hidden className="size-4" strokeWidth={2.4} />
      Add your first title
    </Button>
  );
}
