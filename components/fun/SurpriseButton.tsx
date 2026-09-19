"use client";

import { usePalette } from "@/components/palette/PaletteProvider";
import { Button } from "@/components/ui/Button";

/** "Surprise me [S]" on Home (handoff §01/§08): full width on phones, beside the greeting on desktop. */
export function SurpriseButton() {
  const { openSurprise } = usePalette();
  return (
    <Button
      onClick={openSurprise}
      aria-keyshortcuts="s"
      className="h-12 w-full gap-2.25 rounded-[11px] text-14 font-semibold shadow-cta-md md:h-auto md:w-auto md:rounded-[9px] md:px-4 md:py-2.5 md:text-13"
    >
      Surprise me
      <kbd aria-hidden className="rounded-[4px] border border-accent-ink/25 bg-accent-ink/16 px-1.25 py-px font-mono text-[10.5px] font-normal">
        S
      </kbd>
    </Button>
  );
}
